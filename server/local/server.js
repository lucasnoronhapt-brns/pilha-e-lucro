/* Servidor local de desenvolvimento do Pilha & Lucro.
   Espelha a API que as Edge Functions do Supabase vão ter no M2:
     POST /api/run/start   → emite {run_id, seed} (o cliente NUNCA escolhe a seed)
     POST /api/run/submit  → {run_id, nome, log}: re-simula com o engine e
                             calcula a pontuação no servidor; divergência ou
                             ação ilegal = run rejeitada
     GET  /api/leaderboard → top 10 validado
   Também serve os estáticos (client/, engine/, assets/) — um processo só.
   Correr: node server/local/server.js  →  http://localhost:8000/client/ */

import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID, randomInt } from 'node:crypto';
import { replay } from '../../engine/replay.js';
import { normalizarNome, nomeValido } from '../../shared/nome.js';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DB_PATH = path.join(RAIZ, 'server', 'local', 'db.json');
const PORTA = process.env.PORT || 8000;

/* Defesas (regras de segurança do CLAUDE.md) */
const VALIDADE_SEED_MS = 6*60*60*1000;  // seeds expiram (6h)
const MAX_STARTS_HORA = 30;             // rate limit de runs por IP
const MAX_ACOES = 20000;                // limite de plausibilidade do log
/* validação do nome de exibição: shared/nome.js (3-20 caracteres + filtro de palavrões) */
const MAX_BODY = 2*1024*1024;
const TOP_GUARDADOS = 100;

/* ---------- persistência (dev: ficheiro JSON) ---------- */
let db = { runs:{}, scores:[] };
try{ db = JSON.parse(await readFile(DB_PATH, 'utf8')); }catch(e){ /* primeira execução */ }
const gravar = () => writeFile(DB_PATH, JSON.stringify(db, null, 1)).catch(e=>console.error('db:', e.message));

/* ---------- helpers ---------- */
const startsPorIp = new Map();
function rateLimitOk(ip){
  const agora = Date.now();
  const lista = (startsPorIp.get(ip)||[]).filter(t => agora-t < 60*60*1000);
  if(lista.length >= MAX_STARTS_HORA) return false;
  lista.push(agora); startsPorIp.set(ip, lista);
  return true;
}
function json(res, code, obj){
  const body = JSON.stringify(obj);
  res.writeHead(code, {'Content-Type':'application/json; charset=utf-8'});
  res.end(body);
}
function lerBody(req){
  return new Promise((resolve, reject)=>{
    let tam=0; const partes=[];
    req.on('data', c=>{ tam+=c.length; if(tam>MAX_BODY){ reject(new Error('body demasiado grande')); req.destroy(); } else partes.push(c); });
    req.on('end', ()=>{ try{ resolve(JSON.parse(Buffer.concat(partes).toString('utf8')||'{}')); }catch(e){ reject(new Error('JSON inválido')); } });
    req.on('error', reject);
  });
}

/* ---------- API ---------- */
async function apiStart(req, res, ip){
  if(!rateLimitOk(ip)) return json(res, 429, {erro:'demasiadas runs — tenta daqui a pouco'});
  const run = { id: randomUUID(), seed: randomInt(0, 2**32), criada: Date.now(), usada: false };
  db.runs[run.id] = run;
  await gravar();
  json(res, 200, {run_id: run.id, seed: run.seed});
}

async function apiSubmit(req, res){
  let body;
  try{ body = await lerBody(req); }catch(e){ return json(res, 400, {erro:e.message}); }
  const { run_id, log } = body;
  const nome = normalizarNome(body.nome);

  const run = db.runs[run_id];
  if(!run) return json(res, 404, {erro:'run desconhecida'});
  if(run.usada) return json(res, 409, {erro:'run já submetida'});          // run_id de uso único
  if(Date.now()-run.criada > VALIDADE_SEED_MS) return json(res, 410, {erro:'seed expirada'});
  if(!nomeValido(nome)) return json(res, 400, {erro:'nome inválido (3-20 caracteres, sem palavrões)'});
  if(!Array.isArray(log) || log.length===0 || log.length>MAX_ACOES) return json(res, 400, {erro:'action_log inválido'});

  /* A pontuação NUNCA vem do cliente: re-simulação com o mesmo engine. */
  const rep = replay(run.seed, log);
  if(!rep.ok) return json(res, 422, {erro:'run rejeitada: '+rep.erro});
  if(rep.fase!=='fim') return json(res, 422, {erro:'run rejeitada: a run não chegou ao fim'});

  run.usada = true;
  const entrada = {
    nome, pts: rep.ptsTotais, ronda: rep.ronda,
    burgers: rep.totalBurgers, melhor: rep.melhorBurger,
    quando: new Date().toISOString(),
  };
  db.scores.push(entrada);
  db.scores.sort((a,b)=> b.pts-a.pts || b.ronda-a.ronda || a.quando.localeCompare(b.quando));
  db.scores = db.scores.slice(0, TOP_GUARDADOS);
  await gravar();
  const posicao = db.scores.indexOf(entrada)+1; // 0 = fora do top guardado
  json(res, 200, {ok:true, pts: entrada.pts, ronda: entrada.ronda, posicao: posicao||null});
}

function apiLeaderboard(req, res){
  json(res, 200, {top: db.scores.slice(0,10), total: db.scores.length});
}

/* ---------- estáticos ---------- */
const MIME = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
  '.gif':'image/gif', '.webp':'image/webp', '.ico':'image/x-icon',
};
const PASTAS_PUBLICAS = ['client', 'engine', 'assets', 'shared', 'ranking'];
async function estatico(req, res, urlPath){
  let p = decodeURIComponent(urlPath);
  if(p === '/') { res.writeHead(302, {Location:'/client/'}); return res.end(); }
  if(p.endsWith('/')) p += 'index.html';
  const alvo = path.normalize(path.join(RAIZ, p));
  const rel = path.relative(RAIZ, alvo);
  if(rel.startsWith('..') || !PASTAS_PUBLICAS.includes(rel.split(path.sep)[0])){
    res.writeHead(403); return res.end('403');
  }
  try{
    const conteudo = await readFile(alvo);
    res.writeHead(200, {'Content-Type': MIME[path.extname(alvo).toLowerCase()]||'application/octet-stream'});
    res.end(conteudo);
  }catch(e){
    res.writeHead(404); res.end('404');
  }
}

/* ---------- router ---------- */
http.createServer(async (req, res)=>{
  const ip = req.socket.remoteAddress;
  const u = new URL(req.url, 'http://x');
  try{
    if(req.method==='POST' && u.pathname==='/api/run/start')  return await apiStart(req, res, ip);
    if(req.method==='POST' && u.pathname==='/api/run/submit') return await apiSubmit(req, res);
    if(req.method==='GET'  && u.pathname==='/api/leaderboard')return apiLeaderboard(req, res);
    if(req.method==='GET') return await estatico(req, res, u.pathname);
    res.writeHead(405); res.end('405');
  }catch(e){
    console.error(e);
    json(res, 500, {erro:'erro interno'});
  }
}).listen(PORTA, ()=>{
  console.log(`Pilha & Lucro — servidor local em http://localhost:${PORTA}/client/`);
});
