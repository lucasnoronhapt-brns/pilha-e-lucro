/* Re-simula um action_log a partir da seed e devolve o resultado.
   É isto que o servidor (M2) vai correr para validar pontuações —
   qualquer ação ilegal ou desconhecida rejeita a run.

   Formato do log (um objeto por ação, na ordem em que aconteceram):
     {t:'tutorial'}          — mão guiada do tutorial
     {t:'colocar', i}        — colocar a carta i da mão (inclui tombas)
     {t:'servir'}
     {t:'trocar', ids:[..]}  — troca seletiva dos índices marcados
     {t:'lixo'}
     {t:'comprar', i}        — oferta i da loja
     {t:'vender', tipo, i}   — vende staff ('s') ou receita ('r') i por metade do preço
     {t:'continuar'}         — próxima ronda
*/

import { novaRun, colocar, servir, trocar, lixo, comprar, vender, proximaRonda, maoTutorial } from './game.js';

const ACOES = {
  tutorial:  (st,a)=>maoTutorial(st),
  colocar:   (st,a)=>colocar(st, a.i),
  servir:    (st,a)=>servir(st),
  trocar:    (st,a)=>trocar(st, a.ids),
  lixo:      (st,a)=>lixo(st),
  comprar:   (st,a)=>comprar(st, a.i),
  vender:    (st,a)=>vender(st, a.tipo, a.i),
  continuar: (st,a)=>proximaRonda(st),
};

export function replay(seed, log){
  const st = novaRun(seed);
  for(let n=0;n<log.length;n++){
    const a = log[n] || {};
    const fn = ACOES[a.t];
    if(!fn) return {ok:false, erro:`ação desconhecida #${n}: ${a.t}`};
    const r = fn(st, a);
    if(!r.ok) return {ok:false, erro:`ação ilegal #${n} (${a.t}): ${r.reason}`};
  }
  return {
    ok:true,
    ronda:st.ronda, pts:st.pts, ptsTotais:st.ptsTotais, fase:st.fase,
    totalBurgers:st.totalBurgers, melhorBurger:st.melhorBurger,
  };
}
