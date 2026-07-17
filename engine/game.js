/* Engine do Pilha & Lucro — lógica pura, determinística, zero DOM.
   Toda a aleatoriedade vem do mulberry32 com a seed da run.
   As ações validam legalidade e devolvem {ok, ...} — o client só apresenta.
   Comportamento copiado 1:1 do pilha_e_lucro_v0_2.html (referência). */

import { mulberry32, shuffleSeeded } from './rng.js';
import { ING, POOL, RECEITAS, STAFF, BOSSES } from './data.js';

export const alvo = r => Math.round(100*Math.pow(r,1.55)/10)*10 + 20;
export const temStaff = (st,id) => st.staff.some(s=>s.id===id);
export const stabMax = st => st.stabMaxBase + (temStaff(st,'balcao')?3:0);
export const stackCap = st => (st.boss && st.boss.cap) ? st.boss.cap : 99;

/* M3 — perecibilidade: cartas na mão/pilha são {k, idade}; strings puras
   (testes/dados antigos) são tratadas como frescas (idade 0). */
export const chave = c => typeof c==='string' ? c : c.k;
export const idadeDe = c => typeof c==='string' ? 0 : (c.idade||0);

/* Curva de frescura (idade em rondas):
   0 = fresco 100% · 1 = auge 150% · 2..vida-1 = murcho 50% · ≥vida = estragado.
   Sem vida (conserva: picles/ketchup/maionese) nunca muda. */
export function frescura(k, idade){
  const vida = ING[k].vida;
  if(!vida) return {estado:'fresco', fator:1};
  if(idade >= vida) return {estado:'estragado', fator:0};
  if(idade === 1) return {estado:'auge', fator:1.5};
  if(idade === 0) return {estado:'fresco', fator:1};
  return {estado:'murcho', fator:.5};
}

export const pesoAtual = st => st.stack.reduce((a,c)=>a+ING[chave(c)].peso,0);

const draw = st => ({k: POOL[Math.floor(st.rnd()*POOL.length)], idade:0});
function refill(st){ while(st.hand.length<7) st.hand.push(draw(st)); }

export function novaRun(seed){
  const st = {
    seed: seed>>>0,
    rnd: mulberry32(seed),
    fase:'jogo',          // 'jogo' | 'loja' | 'fim'
    emTutorial:false,     // o serviço do tutorial não dispara fim de ronda (como no v0.2)
    ronda:1, pts:0, ptsTotais:0, money:4,   // ptsTotais: cumulativo da run (o pts faz reset por ronda) — é a pontuação do ranking
    servesBase:4, trocasBase:3, serves:4, trocas:3,
    stabMaxBase:8,
    stack:[], hand:[],
    receitas:[RECEITAS[0]], staff:[],
    boss:null, totalBurgers:0, melhorBurger:0,
    loja:null,            // {bonus, servesRest, trocasRest, ofertas:[{o,t,sold}]}
    log:[],               // action_log da run — cada ação legal regista-se aqui;
                          // no M2 é isto que o servidor re-simula (replay.js)
  };
  refill(st);
  return st;
}

/* ============ SCORE (idêntico ao calc() do v0.2) ============ */
export function calc(st, stack=st.stack){
  const chaves = stack.map(chave), idades = stack.map(idadeDe);
  let chips=0, mult=1; const notas=[];
  chaves.forEach((k,i)=>{
    let c = ING[k].chips;
    if(st.boss && st.boss.f && st.boss.f(k)) c = 0;
    /* frescura multiplica só as fichas base (bónus de staff ficam inteiros) */
    const fr = frescura(k, idades[i]);
    if(fr.estado==='auge'){ c = Math.round(c*1.5); notas.push(['⭐ No Auge','+50%',i]); }
    else if(fr.estado==='murcho'){ c = Math.round(c*.5); notas.push(['🥀 Murcho','-50%',i]); }
    else if(fr.estado==='estragado'){ c = 0; }
    if(k==='bacon' && temStaff(st,'chefbacon')){ c+=12; }
    if(ING[k].cat==='fresco' && temStaff(st,'horta')){ c+=5; }
    if(ING[k].cat==='molho' && temStaff(st,'msecreto')){ c+=6; }
    chips += c;
    if(k==='queijo'){
      const sobreProteina = i>0 && ING[chaves[i-1]].cat==='proteina';
      if(sobreProteina){ mult+=2; notas.push(['🧀 Derretido','+2 mult',i]); }
      else if(temStaff(st,'estufa')){ mult+=1; notas.push(['🧀 Estufa','+1 mult',i]); }
    }
    if(i===0 && ING[k].cat==='molho'){ chips+=8; notas.push(['🥖 Base Selada','+8',i]); }
    if(i>0){
      const ant = chaves[i-1];
      if((k==='tomate'&&ant==='alface')||(k==='alface'&&ant==='tomate')){ chips+=10; notas.push(['🥗 Fresquinho','+10',i]); }
      if((k==='bacon'&&ant==='queijo')||(k==='queijo'&&ant==='bacon')){ chips+=12; notas.push(['🥓 Crocante','+12',i]); }
      if((k==='ovo'&&ant==='bacon')||(k==='bacon'&&ant==='ovo')){ mult+=1; notas.push(['🍳 Peq.-Almoço','+1 mult',i]); }
      if(k===ant){ chips+=6; notas.push(['👯 Dose Dupla','+6',i]); }
    }
  });
  st.receitas.forEach(r=>{
    let hit=false;
    if(r.seq){
      for(let i=0;i+r.seq.length<=chaves.length;i++){
        if(r.seq.every((s,j)=>chaves[i+j]===s)){ hit=true; break; }
      }
    } else if(r.count){ hit = chaves.filter(s=>s===r.count[0]).length>=r.count[1]; }
    else if(r.countCat){ hit = chaves.filter(s=>ING[s].cat===r.countCat[0]).length>=r.countCat[1]; }
    if(hit){
      if(r.chips){ chips+=r.chips; notas.push(['📖 '+r.n,'+'+r.chips,-1]); }
      if(r.mult){ mult+=r.mult; notas.push(['📖 '+r.n,'+'+r.mult+' mult',-1]); }
    }
  });
  return {chips, mult, total:Math.round(chips*mult), notas};
}

/* ============ FIM DE RONDA ============ */
function checarFim(st){
  if(st.pts >= alvo(st.ronda)){ abrirLoja(st); return 'loja'; }
  if(st.serves<=0){ st.fase='fim'; return 'fim'; }
  return null;
}

function abrirLoja(st){
  st.fase='loja';
  const bonus = 4 + st.serves + st.trocas;
  st.money += bonus;
  const poolR = RECEITAS.filter(r=>!st.receitas.some(x=>x.id===r.id) && r.preco>0);
  const poolS = STAFF.filter(s=>!st.staff.some(x=>x.id===s.id));
  shuffleSeeded(poolR, st.rnd); shuffleSeeded(poolS, st.rnd);
  st.loja = {
    bonus, servesRest:st.serves, trocasRest:st.trocas,
    ofertas: [...poolS.slice(0,2).map(o=>({o,t:'s',sold:false})),
              ...poolR.slice(0,2).map(o=>({o,t:'r',sold:false}))],
  };
}

/* ============ AÇÕES ============ */

/* Colocar a carta i da mão na pilha.
   Se o peso exceder o máximo: tomba — pilha perdida, −1 serviço,
   o ingrediente FICA na mão (comportamento do v0.2). */
export function colocar(st, i){
  if(st.fase!=='jogo') return {ok:false, reason:'fase'};
  if(!Number.isInteger(i) || i<0 || i>=st.hand.length) return {ok:false, reason:'indice'};
  const carta = st.hand[i], k = chave(carta);
  if(frescura(k, idadeDe(carta)).estado==='estragado') return {ok:false, reason:'estragado'}; // ocupa o slot; só sai com troca
  if(st.stack.length >= stackCap(st)) return {ok:false, reason:'cap'};
  if(pesoAtual(st)+ING[k].peso > stabMax(st)){
    st.log.push({t:'colocar', i});
    st.stack=[]; st.serves--;
    const fim = checarFim(st);
    return {ok:true, evento:'tomba', fim};
  }
  st.log.push({t:'colocar', i});
  st.hand.splice(i,1); st.stack.push({k, idade: idadeDe(carta)});
  refill(st);
  return {ok:true, evento:'colocado', k};
}

export function servir(st){
  if(st.fase!=='jogo' || st.serves<=0) return {ok:false, reason:'sem-servicos'};
  if(st.stack.length===0) return {ok:false, reason:'vazio'};
  st.log.push({t:'servir'});
  const s = calc(st);
  st.pts += s.total; st.ptsTotais += s.total; st.totalBurgers++;
  st.melhorBurger = Math.max(st.melhorBurger, s.total);
  st.serves--; st.stack=[];
  let fim = null;
  if(st.emTutorial){ st.emTutorial=false; }   // v0.2: o burger do tutorial adia o checarFim
  else fim = checarFim(st);
  return {ok:true, score:s, fim};
}

/* Troca seletiva: descarta os índices marcados e volta a encher a mão. */
export function trocar(st, indices){
  if(st.fase!=='jogo' || st.emTutorial) return {ok:false, reason:'fase'};
  if(st.trocas<=0) return {ok:false, reason:'sem-trocas'};
  const idx = [...new Set(indices)].filter(i=>Number.isInteger(i) && i>=0 && i<st.hand.length);
  if(idx.length===0) return {ok:false, reason:'vazio'};
  st.log.push({t:'trocar', ids:[...idx].sort((a,b)=>a-b)});
  st.trocas--;
  idx.sort((a,b)=>b-a).forEach(i=>st.hand.splice(i,1));
  refill(st);
  return {ok:true};
}

export function lixo(st){
  if(st.fase!=='jogo' || st.emTutorial) return {ok:false, reason:'fase'};
  if(st.trocas<=0 || st.stack.length===0) return {ok:false, reason:'vazio'};
  st.log.push({t:'lixo'});
  st.trocas--; st.stack=[];
  return {ok:true};
}

export function comprar(st, i){
  if(st.fase!=='loja') return {ok:false, reason:'fase'};
  const of = st.loja.ofertas[i];
  if(!of || of.sold) return {ok:false, reason:'indisponivel'};
  if(st.money < of.o.preco) return {ok:false, reason:'dinheiro'};
  if(of.t==='s' ? st.staff.length>=3 : st.receitas.length>=3) return {ok:false, reason:'slots'};
  st.log.push({t:'comprar', i});
  st.money -= of.o.preco;
  (of.t==='s'?st.staff:st.receitas).push(of.o);
  of.sold = true;
  return {ok:true, oferta:of};
}

/* Vender um staff ('s') ou receita ('r') na loja por metade do preço
   (arredondado para baixo) — liberta o slot para comprar outra. */
export function vender(st, tipo, i){
  if(st.fase!=='loja') return {ok:false, reason:'fase'};
  const lista = tipo==='s' ? st.staff : (tipo==='r' ? st.receitas : null);
  if(!lista) return {ok:false, reason:'tipo'};
  if(!Number.isInteger(i) || i<0 || i>=lista.length) return {ok:false, reason:'indice'};
  st.log.push({t:'vender', tipo, i});
  const [o] = lista.splice(i, 1);
  const valor = Math.floor(o.preco/2);
  st.money += valor;
  return {ok:true, o, valor};
}

export function proximaRonda(st){
  if(st.fase!=='loja') return {ok:false, reason:'fase'};
  st.log.push({t:'continuar'});
  st.fase='jogo'; st.loja=null;
  st.ronda++; st.pts=0;
  st.serves = st.servesBase + (temStaff(st,'turno')?1:0);
  st.trocas = st.trocasBase + (temStaff(st,'maos')?1:0);
  st.boss = (st.ronda%3===0) ? BOSSES[(st.ronda/3-1)%BOSSES.length] : null;
  st.stack=[];
  /* M3: a mão PERSISTE entre rondas (antes era redistribuída) e envelhece
     +1 ronda — é isto que dá vida à perecibilidade */
  st.hand = st.hand.map(c=>({k: chave(c), idade: idadeDe(c)+1}));
  refill(st);
  return {ok:true};
}

/* Mão fixa do tutorial (v0.2: carne, queijo + 5 do baralho).
   É uma ação do engine porque altera o estado — o replay tem de a reproduzir. */
export function maoTutorial(st){
  if(st.fase!=='jogo' || st.ronda!==1 || st.totalBurgers>0) return {ok:false, reason:'fase'};
  st.log.push({t:'tutorial'});
  st.emTutorial = true;
  st.hand = [{k:'carne',idade:0},{k:'queijo',idade:0}];
  refill(st);
  return {ok:true};
}
