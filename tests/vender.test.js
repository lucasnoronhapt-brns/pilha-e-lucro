/* Vender staff/receitas na loja: metade do preço (floor), liberta o slot. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../engine/game.js';
import { replay } from '../engine/replay.js';
import { STAFF } from '../engine/data.js';
import { runTeste, staffPorId } from './helpers.js';

/* leva uma run acabada de criar até à loja (pts forjados: só para testes unitários) */
function naLoja(seed=1){
  const st = E.novaRun(seed);
  st.pts = E.alvo(1);
  st.stack = ['carne'];
  E.servir(st);
  assert.equal(st.fase, 'loja');
  return st;
}

test('vender staff devolve metade do preço e liberta o slot', () => {
  const st = naLoja();
  st.staff = [staffPorId('chefbacon'), staffPorId('horta')]; // preços 5 e 4
  const money = st.money;
  const r = E.vender(st, 's', 0);
  assert.equal(r.ok, true);
  assert.equal(r.valor, 2);            // floor(5/2)
  assert.equal(st.money, money+2);
  assert.deepEqual(st.staff.map(s=>s.id), ['horta']);
});

test('vender a Cheeseburger inicial (preço 0) dá 0€ mas liberta o slot', () => {
  const st = naLoja();
  assert.equal(st.receitas.length, 1);
  const money = st.money;
  const r = E.vender(st, 'r', 0);
  assert.equal(r.ok, true);
  assert.equal(r.valor, 0);
  assert.equal(st.money, money);
  assert.equal(st.receitas.length, 0);
});

test('vender fora da loja é ilegal', () => {
  const st = runTeste(1, {staff:[staffPorId('horta')]});
  assert.equal(st.fase, 'jogo');
  const r = E.vender(st, 's', 0);
  assert.deepEqual(r, {ok:false, reason:'fase'});
  assert.equal(st.staff.length, 1);
});

test('tipo ou índice inválidos são rejeitados sem alterar nada', () => {
  const st = naLoja();
  assert.equal(E.vender(st, 'x', 0).ok, false);
  assert.equal(E.vender(st, 'r', 5).ok, false);
  assert.equal(E.vender(st, 'r', -1).ok, false);
  assert.equal(st.receitas.length, 1);
});

test('slots cheios: comprar falha, vender liberta, comprar passa', () => {
  const st = naLoja();
  st.money = 50;
  const iOferta = st.loja.ofertas.findIndex(o=>o.t==='s');
  assert.ok(iOferta >= 0, 'devia haver oferta de staff');
  const idsOferta = st.loja.ofertas.filter(o=>o.t==='s').map(o=>o.o.id);
  // enche os slots com staff que NÃO estão nas ofertas (evita duplicados)
  st.staff = STAFF.filter(s=>!idsOferta.includes(s.id)).slice(0,3);
  assert.equal(st.staff.length, 3);
  assert.equal(E.comprar(st, iOferta).reason, 'slots');
  assert.equal(E.vender(st, 's', 0).ok, true);
  assert.equal(E.comprar(st, iOferta).ok, true);
  assert.equal(st.staff.length, 3);
});

test('replay reproduz uma run com vender no log', () => {
  // run real, sem estados forjados: joga até à loja, vende a Cheeseburger, compra, segue até ao fim
  const jogar = () => {
    const st = E.novaRun(2027);
    let g = 0;
    while(st.fase!=='fim' && g++<800){
      if(st.fase==='jogo'){
        for(let n=0;n<4 && st.fase==='jogo';n++) E.colocar(st, n%st.hand.length);
        if(st.fase==='jogo' && st.stack.length>0) E.servir(st);
      } else {
        E.vender(st, 'r', 0);
        E.comprar(st, 0);
        E.proximaRonda(st);
      }
    }
    return st;
  };
  const live = jogar();
  assert.ok(live.log.some(a=>a.t==='vender'), 'o log devia ter pelo menos um vender');
  const rep = replay(2027, live.log);
  assert.equal(rep.ok, true, rep.erro);
  assert.equal(rep.ptsTotais, live.ptsTotais);
  assert.equal(rep.ronda, live.ronda);
  // vender adulterado no fim (fase 'fim') é rejeitado
  const mau = replay(2027, [...live.log, {t:'vender', tipo:'s', i:0}]);
  assert.equal(mau.ok, false);
});
