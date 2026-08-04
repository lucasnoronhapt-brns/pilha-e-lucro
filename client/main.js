/* Client do Condimenta Burguer — só apresentação (DOM, animações, áudio).
   Toda a lógica de jogo vive em ../engine/ (uma única fonte de verdade).
   Math.random() aqui é permitido APENAS em efeitos visuais/áudio —
   nunca em nada que altere o estado da run. */

import * as Engine from '../engine/game.js';
import { ING, RECEITAS, STAFF, EQUIPAMENTOS, ADJ, BOSSES } from '../engine/data.js';
import { normalizarNome, nomeValido } from '../shared/nome.js';
import { ENDPOINTS } from './config.js';
import * as Auth from './auth.js';

/* ============ SPRITES (extraídos do v0.2 para assets/sprites/) ============ */
const SPRITE_KEYS = [
  'alface','alface_estragada','alface_fresca','alface_murcha','bacon',
  'carne','carne_crua','carne_queimada','carne_v1',
  'card_equip','card_lendaria','card_receita','card_staff',
  'cebola','frango','ketchup','maionese','molho_especial','ovo',
  'pao_base','pao_base_brioche','pao_base_pretzel',
  'pao_topo','pao_topo_brioche','pao_topo_pretzel',
  'picles','queijo','queijo_derretendo','queijo_derretido','queijo_frio','tomate',
];
const SPR = Object.fromEntries(SPRITE_KEYS.map(k=>[k, `../assets/sprites/${k}.png`]));
SPR.fundo = '../assets/sprites/fundo_v2.png'; // M1.5: cozinha sem menu — o alvo vive no quadro chalkboard

/* Arte dedicada para cartas (loja + mini-cartas): quando existir
   assets/sprites/card_art_<icon>.png, acrescenta o icon a este Set e a carta
   usa-a; senão cai para o sprite normal do ingrediente. */
const CARD_ART = new Set([
  'alface','bacon','carne','cebola','frango','ketchup','maionese',
  'molho_especial','ovo','pao_base','picles','queijo_derretendo',
  'queijo_frio','tomate',
]);
const arteCarta = icon => CARD_ART.has(icon) ? `../assets/sprites/card_art_${icon}.png` : SPR[icon];

/* Arte PRÓPRIA por carta (receita 'r', staff 's', equipamento 'e'), para as
   cartas deixarem de reaproveitar o sprite de um ingrediente — o Freezer Novo
   não devia mostrar uma fatia de queijo.
   Para ativar uma: põe assets/sprites/card_art_<tipo>_<id>.png e acrescenta o
   id ao Set do seu tipo. Sem isso, cai no sprite do ingrediente como antes. */
const ARTE_PROPRIA = {
  r: new Set(['cheese','classico','salada','bacon2','molho3','pequeno']),
  s: new Set(['chefbacon','horta','estufa','balcao','maos','msecreto','turno']),
  e: new Set(['freezer','estante','fornecedor']),
};
const arteDaCarta = (tipo, o) => ARTE_PROPRIA[tipo] && ARTE_PROPRIA[tipo].has(o.id)
  ? `../assets/sprites/card_art_${tipo}_${o.id}.png`
  : arteCarta(o.icon);

/* ============ RUN ============ */
/* A seed vem do servidor (POST /api/run/start) — o cliente nunca a escolhe.
   Sem servidor (ex.: abrir só os estáticos), a run funciona offline com seed
   local, mas não pode ser submetida ao ranking. */
const QS = new URLSearchParams(location.search); // truques de dev: ?semintro, ?demo

/* Voltámos do login com Google? Apanha o token do fragmento (#) e limpa-o do
   endereço — tem de acontecer antes de qualquer pedido ao servidor. */
Auth.capturarRedirect();

let RUN = null;
if(!QS.has('demo')) try{
  const r = await fetch(ENDPOINTS.start, {method:'POST'});
  if(r.ok) RUN = await r.json();
}catch(e){}
const SEED = QS.has('demo') ? 42 : (RUN ? RUN.seed : crypto.getRandomValues(new Uint32Array(1))[0]);
console.log('Condimenta Burguer — seed da run:', SEED, RUN ? `(servidor, run ${RUN.run_id})` : '(offline — sem ranking)');
const G = Engine.novaRun(SEED);
window.__run = G; // debug: vê o estado e o action_log na consola (__run.log)

/* ============ AUDIO ============ */
let AC=null;
function beep(f,d=.07,type='square',v=.12){
  try{
    AC = AC || new (window.AudioContext||window.webkitAudioContext)();
    const o=AC.createOscillator(), g=AC.createGain();
    o.type=type;o.frequency.value=f;g.gain.value=v;
    g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+d);
    o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+d);
  }catch(e){}
}

/* ============ RENDER ============ */
const $ = id => document.getElementById(id);
$('stage').style.backgroundImage = `url(${SPR.fundo})`;

function renderHUD(){
  $('hronda').textContent = G.ronda;
  $('halvo').textContent = Engine.alvo(G.ronda);
  $('hpts').textContent = G.pts;
  $('hmoney').textContent = G.money+'€';
  $('hserves').textContent = G.serves;
  $('htrocas').textContent = G.trocas;
  if(!swapMode){
    $('btrocar').textContent = `TROCAR (${G.trocas})`;
    $('btrocar').disabled = G.trocas<=0;
    $('blixo').disabled = G.trocas<=0 || G.stack.length===0;
  }
  $('alvofill').style.width = Math.min(100, G.pts/Engine.alvo(G.ronda)*100)+'%';
  const bc = $('bosscard');
  if(G.boss){
    const [cab, regra] = G.boss.n.split(':');
    const esp = cab.indexOf(' ');
    bc.innerHTML = `<span class="bico">${cab.slice(0,esp)}</span><span><span class="btit">${cab.slice(esp+1)}</span><br><span class="breg">${regra.trim()}</span></span>`;
    bc.classList.add('show'); // .show anima a entrada; re-adicionar não repete a animação
  } else bc.classList.remove('show');
}
function abrirInfo(emoji, o){
  $('minfonome').textContent = `${emoji} ${o.n}`;
  $('minfodesc').textContent = o.d;
  $('bvender').style.display = 'none';
  $('minfo').classList.add('show');
}
function renderCrew(){
  const c = $('crew'); c.innerHTML='';
  const grupo = (emoji, lista, frame, max, tipo) => {
    const g = document.createElement('div'); g.className='cgrupo';
    const cnt = document.createElement('span'); cnt.className='cnt';
    cnt.textContent = `${emoji} ${lista.length}/${max}`;
    g.appendChild(cnt);
    lista.forEach(o=>{
      const m = document.createElement('div'); m.className='mcard';
      m.style.backgroundImage = `url(${frame})`;
      m.innerHTML = `<img src="${arteDaCarta(tipo, o)}">`;
      m.onclick = ()=>abrirInfo(emoji, o);
      g.appendChild(m);
    });
    for(let i=lista.length;i<max;i++){
      const m = document.createElement('div'); m.className='mcard vazia';
      m.dataset.e = emoji;
      g.appendChild(m);
    }
    c.appendChild(g);
  };
  grupo('👤', G.staff, SPR.card_staff, Engine.staffMax(G), 's');
  grupo('📖', G.receitas, SPR.card_receita, Engine.receitaMax(G), 'r');
  grupo('🔧', G.equip, SPR.card_equip, EQUIPAMENTOS.length, 'e'); // M4: equipamentos, permanentes, não se vendem
}
function renderStab(){
  const w = $('stabwrap'); w.innerHTML='';
  const max = Engine.stabMax(G), used = Engine.pesoAtual(G);
  for(let i=0;i<max;i++){
    const s = document.createElement('div'); s.className='seg';
    if(i<used) s.classList.add(i>=max-2?'hot':(i>=max-4?'warn':'on'));
    w.appendChild(s);
  }
}

/* sprites por estado de frescura (só a alface tem arte dedicada por agora;
   os restantes usam filtro CSS até chegarem os sprites do acervo) */
const SPR_ESTADO = { alface: {murcho:'alface_murcha', estragado:'alface_estragada'} };
function sprCarta(k, estado){
  const esp = SPR_ESTADO[k] && SPR_ESTADO[k][estado];
  return SPR[esp || ING[k].spr || k];
}
function sprOf(c, idx){
  const k = Engine.chave(c);
  if(k==='queijo'){
    const abaixo = idx>0 ? Engine.chave(G.stack[idx-1]) : null;
    if((abaixo && ING[abaixo].cat==='proteina') || Engine.temStaff(G,'estufa')) return SPR['queijo_derretendo'];
    return SPR['queijo_frio'];
  }
  return sprCarta(k, Engine.frescura(k, Engine.idadeDe(c)).estado);
}
function renderStack(){
  const st = $('stack'); st.innerHTML='';
  let y = 0;
  const base = document.createElement('img');
  base.src = SPR.pao_base; base.className='layer'; base.style.bottom='0px'; base.style.zIndex=1;
  st.appendChild(base);
  y = 26;
  G.stack.forEach((c,i)=>{
    const k = Engine.chave(c);
    const im = document.createElement('img');
    im.src = sprOf(c,i); im.className='layer';
    im.style.bottom = y+'px'; im.style.zIndex = i+2;
    st.appendChild(im);
    const hpx = {carne:20,frango:18,bacon:16,ovo:16,queijo:10,alface:16,tomate:14,cebola:11,picles:11,ketchup:9,maionese:9,molho_especial:10}[k]||14;
    y += hpx;
  });
  st.style.height = (y+90)+'px';
  renderStab();
  renderPreview();
}
function renderHand(){
  const h = $('hand'); h.innerHTML='';
  let hiDone = false;
  G.hand.forEach((carta,i)=>{
    const k = Engine.chave(carta), idade = Engine.idadeDe(carta);
    const fr = Engine.frescura(k, idade);
    const vida = ING[k].vida;
    const c = document.createElement('div'); c.className='card';
    if(fr.estado==='auge') c.classList.add('auge');
    if(fr.estado==='estragado') c.classList.add('estragado');
    if(swapMode && swapSel.has(i)) c.classList.add('sel');
    if(TUT.active && TUT.expect){
      if(k===TUT.expect && !hiDone){ c.classList.add('tut-hi'); hiDone=true; }
      else c.classList.add('tut-dis');
    } else if(TUT.active && TUT.step>=3 && TUT.step<5){
      c.classList.add('tut-dis');
    }
    /* badge de frescura: rondas restantes · ⭐ auge · 💀 estragado; conservas sem badge */
    const badge = !vida ? '' :
      fr.estado==='estragado' ? '<span class="fresc m">💀</span>' :
      fr.estado==='auge' ? '<span class="fresc">⭐</span>' :
      `<span class="fresc${fr.estado==='murcho'?' m':''}">${vida-idade}🕒</span>`;
    const temSpriteEstado = SPR_ESTADO[k] && SPR_ESTADO[k][fr.estado];
    const imgCls = (!temSpriteEstado && fr.estado==='murcho') ? ' class="fdim"' :
                   (!temSpriteEstado && fr.estado==='estragado') ? ' class="fdead"' : '';
    const pts = fr.estado==='estragado' ? '💀 estragado' : `+${Math.round(ING[k].chips*fr.fator)} fichas`;
    c.innerHTML = `${badge}<span class="st">⚖${ING[k].peso}</span><img${imgCls} src="${sprCarta(k, fr.estado)}"><div class="nm">${ING[k].n}</div><div class="pts">${pts}</div>`;
    c.onclick = ()=>place(i);
    h.appendChild(c);
  });
}
let prevChips=0, prevMult=1;
function pump(el){ el.classList.remove('pump'); void el.offsetWidth; el.classList.add('pump'); }
function renderPreview(){
  const s = Engine.calc(G);
  $('pchips').textContent = s.chips;
  $('pmult').textContent = s.mult;
  $('ptot').textContent = s.total;
  if(s.chips>prevChips) pump($('pchips'));
  if(s.mult>prevMult) pump($('pmult'));
  prevChips=s.chips; prevMult=s.mult;
  renderAdjList(s.notas);
}
/* lista das adjacências/receitas ativas, ao lado da pilha até servir */
function renderAdjList(notas){
  const el = $('adjlist');
  el.innerHTML = notas.map(n=>
    `<div class="atag"><span>${n[0]}</span><span class="ab${n[1].includes('mult')?' m':''}">${n[1]}</span></div>`
  ).join('');
}
/* tag flutuante imediata junto à camada acabada de colocar */
function floatAdjTags(novas){
  const sr = $('stack').getBoundingClientRect(), gr = $('stage').getBoundingClientRect();
  novas.forEach((n,i)=>{
    const f = document.createElement('div');
    f.className='float'; f.textContent = `${n[0]} ${n[1]}`;
    f.style.color = n[1].includes('mult') ? '#ff8f83' : '#8fc7ff';
    f.style.left = Math.round(sr.left - gr.left + sr.width/2) + 'px';
    f.style.transform = 'translateX(-50%)';
    f.style.top = Math.max(4, Math.round(sr.top - gr.top - 30 - i*24)) + 'px';
    $('stage').appendChild(f);
    setTimeout(()=>f.remove(), 1000);
  });
}
/* compara as notas antes/depois de colocar e devolve as que apareceram */
function notasNovas(antes, depois){
  const conta = {};
  antes.forEach(n=>{ const k=n[0]+n[1]; conta[k]=(conta[k]||0)+1; });
  return depois.filter(n=>{
    const k=n[0]+n[1];
    if(conta[k]>0){ conta[k]--; return false; }
    return true;
  });
}

/* ============ AÇÕES (chamam o engine e apresentam o resultado) ============ */
let busy=false;
let swapMode=false;
const swapSel = new Set();

function place(i){
  if(busy) return;
  if(swapMode){ toggleSel(i); return; }
  if(TUT.active && TUT.expect && Engine.chave(G.hand[i])!==TUT.expect) return;
  const notasAntes = Engine.calc(G).notas;
  const r = Engine.colocar(G, i);
  if(!r.ok){
    if(r.reason==='cap') toast('⏱️ O cliente não aceita mais camadas!');
    if(r.reason==='estragado') toast('💀 Estragado! Descarta-o com uma troca.');
    return;
  }
  if(r.evento==='tomba') return tomba(r.fim);
  beep(300+G.stack.length*45, .06);
  if(TUT.active) hideBubble();
  renderHand(); renderStack();
  floatAdjTags(notasNovas(notasAntes, Engine.calc(G).notas));
  tutAdvanceAfterPlace(r.k);
}
function toggleSel(i){
  if(swapSel.has(i)) swapSel.delete(i); else swapSel.add(i);
  beep(swapSel.has(i)?420:320,.04);
  renderHand(); updateTrocarBtn();
}
function updateTrocarBtn(){
  const b = $('btrocar');
  if(swapMode){
    b.classList.add('mode');
    b.textContent = swapSel.size>0 ? `✓ TROCAR ${swapSel.size}` : 'ESCOLHE ✕';
    $('blixo').textContent = 'VOLTAR';
    $('blixo').disabled = false;
  } else {
    b.classList.remove('mode');
    b.textContent = `TROCAR (${G.trocas})`;
    $('blixo').textContent = 'LIXO';
  }
}
function tomba(fim){
  busy=true;
  beep(160,.3,'sawtooth',.18); setTimeout(()=>beep(90,.4,'sawtooth',.18),120);
  document.body.classList.add('shake');
  toast('💥 TOMBOU! Pilha perdida (−1 serviço)');
  setTimeout(()=>{
    document.body.classList.remove('shake');
    renderStack(); renderHUD(); busy=false;
    resolverFim(fim);
  }, 700);
}
function trocar(){
  if(busy||TUT.active) return;
  if(!swapMode){
    if(G.trocas<=0) return;
    swapMode = true; swapSel.clear();
    toast('Toca nos ingredientes que queres trocar');
    renderHand(); updateTrocarBtn();
    return;
  }
  if(swapSel.size===0){ sairSwap(); return; }
  const r = Engine.trocar(G, [...swapSel]);
  sairSwap();
  if(!r.ok) return;
  renderHand(); renderHUD();
  beep(500,.05); beep(650,.05);
}
function sairSwap(){
  swapMode=false; swapSel.clear();
  renderHand(); updateTrocarBtn(); renderHUD();
}
function lixo(){
  if(busy||TUT.active) return;
  if(swapMode){ sairSwap(); return; }
  const r = Engine.lixo(G);
  if(!r.ok) return;
  renderStack(); renderHUD(); beep(220,.15,'triangle');
  toast('🗑️ Pilha para o lixo (−1 troca)');
}
function servir(){
  if(busy||G.serves<=0) return;
  if(swapMode){ sairSwap(); return; }
  if(TUT.active && TUT.step!==4) return;
  if(G.stack.length===0){ toast('O burger está vazio!'); return; }
  if(TUT.active) hideBubble();
  const r = Engine.servir(G);
  if(!r.ok) return;
  busy=true;
  const s = r.score;
  const st = $('stack');
  const topo = document.createElement('img');
  topo.src = SPR.pao_topo; topo.className='layer';
  topo.style.bottom = st.style.height.replace('px','')-84+'px'; topo.style.zIndex=99;
  st.appendChild(topo);
  beep(520,.08);
  let t=350;
  s.notas.forEach(n=>{
    setTimeout(()=>{ floatTxt(n[0]+' '+n[1], n[1].includes('mult')?'#D8352A':'#6fb8e8'); beep(700+Math.random()*300,.06); }, t);
    t+=330;
  });
  setTimeout(()=>{
    floatTxt('+'+s.total+' pts','#F2B32A',22);
    beep(880,.1);beep(1100,.12);
    renderStack(); renderHUD();
    busy=false;
    if(TUT.active && TUT.step===4){ tutStep(5); return; }
    resolverFim(r.fim);
  }, t+420);
}
function floatTxt(txt,color,size=15){
  const f = document.createElement('div');
  f.className='float'; f.textContent=txt;
  f.style.color=color; f.style.fontSize=size+'px';
  f.style.left = (32+Math.random()*36)+'%';
  f.style.top = (26+Math.random()*22)+'%';
  $('stage').appendChild(f);
  setTimeout(()=>f.remove(),1000);
}
let toastEl=null;
function toast(t){
  if(toastEl) toastEl.remove();
  toastEl = document.createElement('div');
  toastEl.className='float'; toastEl.textContent=t;
  toastEl.style.cssText+='left:50%;top:42%;transform:translateX(-50%);color:#fff;font-size:13px;animation-duration:1.6s';
  $('stage').appendChild(toastEl);
}

/* ============ RONDAS ============ */
function resolverFim(fim){
  if(fim==='loja') return mostrarLoja();
  if(fim==='fim') return gameOver();
  renderHUD();
}
function refreshAfford(){
  document.querySelectorAll('#offers .scard').forEach(c=>{
    if(!c.classList.contains('sold')){
      c.classList.toggle('poor', parseInt(c.dataset.preco) > G.money);
    }
  });
}
/* mini-cartas do que já tens, vendáveis por metade do preço (liberta o slot) */
function renderMeus(){
  const box = $('meus'); box.innerHTML='';
  if(G.staff.length===0 && G.receitas.length===0){ box.style.display='none'; return; }
  box.style.display='flex';
  const lbl = document.createElement('span');
  lbl.className='vlbl'; lbl.textContent='Vender:';
  box.appendChild(lbl);
  const grupo = (emoji, lista, tipo, frame)=>{
    lista.forEach((o,i)=>{
      const valor = Math.floor(o.preco/2);
      const m = document.createElement('div'); m.className='mcard';
      m.style.backgroundImage = `url(${frame})`;
      m.innerHTML = `<span class="vprice">${valor}€</span><img src="${arteDaCarta(tipo, o)}">`;
      m.onclick = ()=>abrirVenda(emoji, tipo, i, o, valor);
      box.appendChild(m);
    });
  };
  grupo('👤', G.staff, 's', SPR.card_staff);
  grupo('📖', G.receitas, 'r', SPR.card_receita);
}
function abrirVenda(emoji, tipo, i, o, valor){
  $('minfonome').textContent = `${emoji} ${o.n}`;
  $('minfodesc').textContent = o.d;
  const b = $('bvender');
  b.style.display = 'block';
  b.textContent = `💰 VENDER POR ${valor}€`;
  b.onclick = ()=>{
    $('minfo').classList.remove('show');
    const r = Engine.vender(G, tipo, i);
    if(!r.ok) return;
    beep(500,.06); beep(380,.08);
    $('shopmsg').textContent = `💰 ${o.n} vendido por ${r.valor}€.`;
    renderMeus(); renderCrew(); renderHUD(); refreshAfford();
  };
  $('minfo').classList.add('show');
}
function mostrarLoja(){
  const L = G.loja;
  $('resumo').innerHTML = `Alvo <b>${Engine.alvo(G.ronda)}</b> batido com <b>${G.pts} pts</b>.<br>Ganhas <b>${L.bonus}€</b> (4 base + ${L.servesRest} serviços + ${L.trocasRest} trocas não usados).<br>Caixa: <b>${G.money}€</b>`;
  $('shopmsg').textContent = '';
  renderMeus();
  const off = $('offers'); off.innerHTML='';
  const FRAME = {s:SPR.card_staff, r:SPR.card_receita, e:SPR.card_equip};
  L.ofertas.forEach(({o,t}, i)=>{
    const preco = Engine.precoOferta(G, o.preco);
    const div = document.createElement('div');
    div.className = t==='e' ? 'scard equip' : 'scard';
    div.dataset.preco = preco;
    div.style.backgroundImage = `url(${FRAME[t]})`;
    div.innerHTML = `
      <span class="sprice">${preco}€</span>
      <img class="sart" src="${arteDaCarta(t, o)}">
      <div class="stxt"><div class="sname">${o.n}</div><div class="sdesc">${o.d}</div></div>`;
    div.onclick = ()=>{
      const r = Engine.comprar(G, i);
      if(!r.ok){
        if(r.reason==='slots') $('shopmsg').textContent = '⚠️ Slots cheios — vende uma carta em cima primeiro.';
        return;
      }
      div.classList.add('sold');
      div.querySelector('.sprice').textContent='✓';
      beep(700,.06);beep(950,.08);
      renderCrew(); renderHUD(); renderMeus();
      $('shopmsg').textContent = t==='e' ? `→ ${o.n} instalado!` : `→ ${o.n} contratado!`;
      refreshAfford();
    };
    off.appendChild(div);
  });
  refreshAfford();
  $('shop').classList.add('show');
  /* a fonte monospace varia entre sistemas (Android é mais larga):
     se o texto não couber na placa da carta, encolhe até caber */
  requestAnimationFrame(()=>{
    off.querySelectorAll('.stxt').forEach(t=>{
      const nome = t.querySelector('.sname'), desc = t.querySelector('.sdesc');
      let s = 12;
      while(t.scrollHeight > t.clientHeight && s > 9){
        s--;
        desc.style.fontSize = s+'px';
        if(s<=10) nome.style.fontSize = '12px';
      }
    });
  });
}
function proximaRonda(){
  const r = Engine.proximaRonda(G);
  if(!r.ok) return;
  $('shop').classList.remove('show');
  swapMode=false; swapSel.clear();
  renderHand(); renderStack(); renderHUD(); renderCrew();
  if(G.boss) toast(G.boss.n);
}
/* Run a submeter. Vive fora do G porque tem de sobreviver ao redirect do
   login com Google, que descarrega a página (ver Auth.guardarRunPendente). */
let SUBMISSAO = null;

const statsHTML = s =>
  `Aguentaste <b>${s.ronda}</b> ronda(s).<br>Serviste <b>${s.burgers}</b> burgers.<br>Melhor burger: <b>${s.melhor} pts</b>.<br>Pontuação total: <b>${s.pts} pts</b>.`;

function gameOver(){
  const stats = {ronda:G.ronda, burgers:G.totalBurgers, melhor:G.melhorBurger, pts:G.ptsTotais};
  SUBMISSAO = RUN ? {run_id:RUN.run_id, log:G.log, stats} : null;
  $('deadstats').innerHTML = statsHTML(stats);
  $('gameover').classList.add('show');
  prepararSubmissao();
}

/* ============ RANKING ============ */
const esc = s => String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function linhasRanking(top, destaque){
  if(!top.length) return '<div class="rrow"><span class="rnm">Ainda ninguém — sê o primeiro!</span></div>';
  return top.map((e,i)=>`<div class="rrow${i+1===destaque?' eu':''}"><span class="pos">${i+1}.</span><span class="rnm">${esc(e.nome)}</span><span class="rpts">${e.pts} pts · r${e.ronda}</span></div>`).join('');
}
async function abrirRanking(){
  const body = $('rankbody');
  body.innerHTML = '<div class="rrow"><span class="rnm">A carregar…</span></div>';
  $('ranking').classList.add('show');
  try{
    const lb = await (await fetch(ENDPOINTS.leaderboard)).json();
    body.innerHTML = linhasRanking(lb.top);
  }catch(e){
    body.innerHTML = '<div class="rrow"><span class="rnm">Sem ligação ao servidor.</span></div>';
  }
}
/* ---------- submissão com sessão ----------
   O ecrã de fim mostra só o passo em que o jogador está:
   entrar com Google → escolher nome de exibição → submeter. */

/* nome do perfil: string = já escolhido · null = falta escolher ·
   undefined = não deu para saber (sem rede ou sessão inválida) */
async function nomeDoPerfil(){
  try{
    const r = await fetch(ENDPOINTS.perfil, {headers: Auth.cabecalho()});
    if(r.status === 401){ Auth.sair(); return undefined; }
    if(!r.ok) return undefined;
    return (await r.json()).nome ?? null;
  }catch(e){ return undefined; }
}

/* sugere só o PRIMEIRO nome da conta Google — nunca o nome completo */
async function sugerirNome(){
  const u = await Auth.utilizador();
  const completo = u?.user_metadata?.name || u?.user_metadata?.full_name || '';
  return completo.trim().split(/\s+/)[0] || '';
}

async function prepararSubmissao(){
  const ver = (id,v)=>{ $(id).style.display = v ? 'block' : 'none'; };
  const info = $('subinfo');
  info.className=''; info.textContent=''; $('quemsou').innerHTML='';

  if(!SUBMISSAO || !Auth.disponivel()){ $('submitbox').style.display='none'; return; }
  $('submitbox').style.display='block';

  if(!Auth.sessao()){
    ver('blogin',true); ver('loginnota',true); ver('nomebox',false); ver('bsubmeter',false);
    return;
  }
  ver('blogin',false); ver('loginnota',false);

  const nome = await nomeDoPerfil();
  if(nome === undefined){
    ver('nomebox',false); ver('bsubmeter',false);
    info.className='err'; info.textContent='Sem ligação ao servidor. Recarrega a página.';
    return;
  }
  if(nome === null){
    ver('nomebox',true); ver('bsubmeter',false);
    if(!$('innome').value) $('innome').value = await sugerirNome();
    return;
  }
  ver('nomebox',false); ver('bsubmeter',true);
  $('quemsou').innerHTML = `A submeter como <b>${esc(nome)}</b> · <u id="bsair">sair</u>`;
  $('bsair').onclick = ()=>{ Auth.sair(); prepararSubmissao(); };
}

/* entrar obriga a sair da página: guarda a run para não se perder no caminho */
function entrarParaSubmeter(){
  if(SUBMISSAO) Auth.guardarRunPendente(SUBMISSAO);
  Auth.entrarComGoogle();
}

async function guardarNome(){
  const info = $('subinfo');
  const nome = normalizarNome($('innome').value);
  if(!nomeValido(nome)){
    info.className='err';
    info.textContent='Nome: 3–20 caracteres, sem palavrões e sem frases sobre outras pessoas.';
    return;
  }
  $('bguardarnome').disabled = true;
  info.className=''; info.textContent='A guardar…';
  try{
    const r = await fetch(ENDPOINTS.perfil, {
      method:'POST',
      headers:{'Content-Type':'application/json', ...Auth.cabecalho()},
      body: JSON.stringify({nome}),
    });
    const res = await r.json();
    $('bguardarnome').disabled = false;
    if(!r.ok){ info.className='err'; info.textContent = res.erro || 'Erro ao guardar.'; return; }
    prepararSubmissao();
  }catch(e){
    $('bguardarnome').disabled = false;
    info.className='err'; info.textContent='Sem ligação ao servidor.';
  }
}

async function submeter(){
  if(!SUBMISSAO) return;
  const info = $('subinfo');
  $('bsubmeter').disabled = true;
  info.className=''; info.textContent='A validar no servidor…';
  try{
    const r = await fetch(ENDPOINTS.submit, {
      method:'POST',
      headers:{'Content-Type':'application/json', ...Auth.cabecalho()},
      body: JSON.stringify({run_id: SUBMISSAO.run_id, log: SUBMISSAO.log}),
    });
    const res = await r.json();
    if(!r.ok){
      info.className='err'; info.textContent = res.erro || 'Erro ao submeter.';
      $('bsubmeter').disabled = false;
      if(r.status === 401){ Auth.sair(); prepararSubmissao(); }
      return;
    }
    Auth.limparRunPendente();
    info.className='okk';
    info.textContent = res.posicao ? `✓ Validado: ${res.pts} pts — posição #${res.posicao}!` : `✓ Validado: ${res.pts} pts.`;
    beep(700,.06);beep(950,.08);
    const lb = await (await fetch(ENDPOINTS.leaderboard)).json();
    $('rankdead').innerHTML = linhasRanking(lb.top, res.posicao);
  }catch(e){
    info.className='err'; info.textContent='Sem ligação ao servidor.';
    $('bsubmeter').disabled = false;
  }
}
function fecharIntro(){ $('intro').classList.remove('show'); beep(600,.08); }

/* ============ TUTORIAL ============ */
const TUT = {active:false, step:0, expect:null};
function bubble(txt, pos, okFn){
  const b = $('tutbubble');
  $('tuttxt').innerHTML = txt;
  const ok = $('tutok');
  if(okFn){ ok.style.display='block'; ok.onclick = ()=>{ b.classList.remove('show'); okFn(); }; }
  else ok.style.display='none';
  Object.assign(b.style, {top:'',bottom:'',left:'',right:'',transform:''}, pos);
  b.classList.add('show');
}
function hideBubble(){ $('tutbubble').classList.remove('show'); }
function iniciarTutorial(){
  fecharIntro();
  TUT.active = true;
  Engine.maoTutorial(G);
  renderHand();
  tutStep(1);
}
function tutStep(n){
  TUT.step = n;
  if(n===1){
    TUT.expect = 'carne';
    bubble('🥩 Toca na <b>CARNE</b> aqui em baixo para a empilhar no pão.', {bottom:'160px', left:'50%', transform:'translateX(-50%)'});
  }
  if(n===2){
    TUT.expect = 'queijo';
    bubble('🧀 Agora o <b>QUEIJO</b>. Repara: em cima da carne, ele <b>derrete</b> → bónus!', {bottom:'160px', left:'50%', transform:'translateX(-50%)'});
  }
  if(n===3){
    TUT.expect = null;
    $('herobox').classList.add('tut-hi');
    const hb = $('herobox').getBoundingClientRect();
    bubble('📊 Os teus pontos: <b>FICHAS × MULT</b>.<br>Cada ingrediente dá fichas. Combinações vizinhas (como o 🧀 Derretido) sobem o <b>MULT</b> — é aí que os pontos explodem.', {top:Math.round(hb.bottom+10)+'px', left:'50%', transform:'translateX(-50%)'}, ()=>{
      $('herobox').classList.remove('tut-hi');
      tutStep(4);
    });
  }
  if(n===4){
    $('bservir').classList.add('tut-hi');
    bubble('🍔 Toca em <b>SERVIR</b> para fechar o burger e pontuar!', {bottom:'80px', right:'12px'});
  }
  if(n===5){
    $('bservir').classList.remove('tut-hi');
    bubble('🎯 O objetivo: enche a <b>barra vermelha (ALVO)</b> lá em cima antes de gastares os <b>4 SERVIÇOS</b>.<br><br>⚖️ Atenção ao <b>EQUILÍBRIO</b> (barra à direita): molhos pesam 2 — se passares do limite, a pilha <b>tomba</b>!<br><br>🔄 <b>TROCAR</b> renova a bancada. Entre rondas, compras <b>staff e receitas</b>. Boa run!', {top:'50%', left:'50%', transform:'translate(-50%,-50%)'}, ()=>{
      TUT.active = false;
      renderHand();
    });
  }
  renderHand();
}
function tutAdvanceAfterPlace(k){
  if(!TUT.active) return;
  if(TUT.step===1 && k==='carne') tutStep(2);
  else if(TUT.step===2 && k==='queijo') tutStep(3);
}

/* ============ COLEÇÃO (livro visual estilo Balatro) ============ */
function cartaColecao(frame, src, nome, own, detalhe, extraClass){
  const c = document.createElement('div');
  c.className = extraClass ? `ccard ${extraClass}` : 'ccard';
  c.style.backgroundImage = `url(${frame})`;
  c.innerHTML = `${own?'<span class="cown">✓</span>':''}<img class="cart" src="${src}"><div class="cnome">${nome}</div>`;
  c.onclick = detalhe;
  return c;
}
function abrirLivro(){
  const body = $('livrobody'); body.innerHTML='';
  const sec = t => { const d=document.createElement('div'); d.className='lsec'; d.textContent=t; body.appendChild(d); };
  const grid = () => { const g=document.createElement('div'); g.className='colgrid'; body.appendChild(g); return g; };

  sec('📖 Receitas · compram-se na loja · máx 3 (+1 com Estante Extra)');
  let g = grid();
  RECEITAS.forEach(r=>{
    const own = G.receitas.some(x=>x.id===r.id);
    g.appendChild(cartaColecao(SPR.card_receita, arteDaCarta('r', r), r.n, own,
      ()=>abrirInfo('📖', {n:r.n, d:`${r.d} · ${r.preco>0?r.preco+'€ na loja':'receita inicial'}`})));
  });

  sec('👤 Staff · contrata na loja · máx 3 (+1 com Freezer Novo)');
  g = grid();
  STAFF.forEach(s=>{
    const own = G.staff.some(x=>x.id===s.id);
    g.appendChild(cartaColecao(SPR.card_staff, arteDaCarta('s', s), s.n, own,
      ()=>abrirInfo('👤', {n:s.n, d:`${s.d} · ${s.preco}€ na loja`})));
  });

  sec('🔧 Equipamento · compra-se na loja · permanente, não se vende');
  g = grid();
  EQUIPAMENTOS.forEach(e=>{
    const own = G.equip.some(x=>x.id===e.id);
    g.appendChild(cartaColecao(SPR.card_equip, arteDaCarta('e', e), e.n, own,
      ()=>abrirInfo('🔧', {n:e.n, d:`${e.d} · ${e.preco}€ na loja`}), 'equip'));
  });

  sec('🥦 Bosses · a cada 3 rondas, por esta ordem');
  BOSSES.forEach(b=>{
    const [cab, regra] = b.n.split(':');
    const esp = cab.indexOf(' ');
    const d = document.createElement('div');
    d.className = 'cboss';
    d.innerHTML = `<span class="bico">${cab.slice(0,esp)}</span><span><span class="btit">${cab.slice(esp+1)}</span><br><span class="breg">${regra.trim()}</span></span>`;
    body.appendChild(d);
  });

  sec('🔥 Adjacências · sempre ativas');
  ADJ.forEach(a=>{
    const d = document.createElement('div');
    d.className = 'lrow';
    d.innerHTML = `<span>${a.e} <b>${a.n}</b> — ${a.d}</span><span class="lb ${a.m?'m':''}">${a.b}</span>`;
    body.appendChild(d);
  });

  sec('🍔 Ingredientes · fichas e peso');
  g = grid();
  for(const k in ING){
    const o = ING[k];
    const d = document.createElement('div');
    d.className = 'cing';
    d.innerHTML = `<img src="${arteCarta(o.spr||k)}"><div class="nm">${o.n}</div><div class="inf">+${o.chips} <span class="peso">⚖${o.peso}</span> 🕒${o.vida??'∞'}</div>`;
    g.appendChild(d);
  }

  $('livro').classList.add('show');
}

$('bservir').onclick = servir;
$('btrocar').onclick = trocar;
$('blixo').onclick = lixo;
$('bcontinuar').onclick = proximaRonda;
$('blivro').onclick = abrirLivro;
$('branking').onclick = abrirRanking;
$('bsubmeter').onclick = submeter;
$('blogin').onclick = entrarParaSubmeter;
$('bguardarnome').onclick = guardarNome;
$('btutorial').onclick = iniciarTutorial;
$('bjasei').onclick = fecharIntro;

renderHand(); renderStack(); renderHUD(); renderCrew();

/* dev: ?semintro salta o ecrã inicial; ?demo monta um cenário fixo
   (seed 42, Fresquinho ativo, boss visível) para screenshots — offline, nunca submete */
if(QS.has('semintro') || QS.has('demo')) $('intro').classList.remove('show');
if(QS.has('demo')){
  ['alface','tomate','bacon'].forEach(k=>{ const i=G.hand.findIndex(c=>Engine.chave(c)===k); if(i>=0) Engine.colocar(G,i); });
  G.boss = BOSSES[0]; // só visual: estado de demo não é submetível
  // mostra os estados de frescura na mão (visual, offline)
  const comVida = G.hand.filter(c=>ING[Engine.chave(c)].vida);
  if(comVida[0]) comVida[0].idade = 1;   // ⭐ auge
  if(comVida[1]) comVida[1].idade = 2;   // murcho
  if(comVida[2]) comVida[2].idade = 99;  // 💀 estragado
  renderHand(); renderStack(); renderHUD();
  if(QS.get('demo')==='loja'){ G.pts = 200; resolverFim(Engine.servir(G).fim); }
  if(QS.get('demo')==='troca'){ swapMode=true; swapSel.add(0); swapSel.add(2); renderHand(); updateTrocarBtn(); }
  if(QS.get('demo')==='livro'){ abrirLivro(); }
}

/* Voltar do login: se ficou uma run à espera de submissão, retoma o ecrã de
   fim com ela em vez de a deitar fora (a run nova desta página fica de lado). */
const PENDENTE = Auth.lerRunPendente();
if(PENDENTE && PENDENTE.run_id){
  if(Auth.sessao()){
    SUBMISSAO = PENDENTE;
    $('intro').classList.remove('show');
    $('deadstats').innerHTML = statsHTML(PENDENTE.stats);
    $('gameover').classList.add('show');
    prepararSubmissao();
  } else {
    Auth.limparRunPendente();   // login cancelado ou falhado
  }
}
