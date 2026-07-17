/* M4 — Equipamentos: vouchers permanentes (não ocupam slots 3/3, não se vendem). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../engine/game.js';
import { replay } from '../engine/replay.js';
import { STAFF } from '../engine/data.js';
import { runTeste, staffPorId, equipPorId } from './helpers.js';

/* leva uma run acabada de criar até à loja (pts forjados: só para testes unitários) */
function naLoja(seed=1){
  const st = E.novaRun(seed);
  st.pts = E.alvo(1);
  st.stack = ['carne'];
  E.servir(st);
  assert.equal(st.fase, 'loja');
  return st;
}

test('Freezer Novo: +1 slot de staff (4 no total)', () => {
  const st = runTeste(1, {staff:[staffPorId('chefbacon'),staffPorId('horta'),staffPorId('estufa')], equip:[equipPorId('freezer')]});
  assert.equal(E.staffMax(st), 4);
});

test('Estante Extra: +1 slot de receitas (4 no total)', () => {
  const st = runTeste(1, {equip:[equipPorId('estante')]});
  assert.equal(E.receitaMax(st), 4);
});

test('sem equipamento os slots continuam em 3', () => {
  const st = runTeste();
  assert.equal(E.staffMax(st), 3);
  assert.equal(E.receitaMax(st), 3);
});

test('Fornecedor Direto: -1€ (mín. 1€) em qualquer oferta', () => {
  const st = runTeste(1, {equip:[equipPorId('fornecedor')]});
  assert.equal(E.precoOferta(st, 5), 4);
  assert.equal(E.precoOferta(st, 1), 1); // nunca abaixo de 1€
});

test('comprar equipamento: soma a st.equip, cobra o preço, não ocupa staff/receitas', () => {
  const st = naLoja();
  st.money = 50;
  const iOferta = st.loja.ofertas.findIndex(o=>o.t==='e');
  assert.ok(iOferta >= 0, 'devia haver oferta de equipamento');
  const id = st.loja.ofertas[iOferta].o.id;
  const money = st.money;
  const r = E.comprar(st, iOferta);
  assert.equal(r.ok, true);
  assert.ok(E.temEquip(st, id));
  assert.equal(st.staff.length, 0);
  assert.equal(st.receitas.length, 1); // Cheeseburger inicial, intacta
  assert.equal(st.money, money - r.oferta.o.preco);
});

test('equipamento comprado não volta a aparecer numa loja seguinte', () => {
  const st = naLoja();
  st.money = 999;
  const iOferta = st.loja.ofertas.findIndex(o=>o.t==='e');
  const id = st.loja.ofertas[iOferta].o.id;
  E.comprar(st, iOferta);
  E.proximaRonda(st);
  st.stack = ['carne'];
  st.pts = E.alvo(st.ronda);
  E.servir(st);
  assert.equal(st.fase, 'loja');
  assert.ok(!st.loja.ofertas.some(o=>o.t==='e' && o.o.id===id));
});

test('equipamento não se vende (só staff e receitas)', () => {
  const st = naLoja();
  st.equip = [equipPorId('freezer')];
  const r = E.vender(st, 'e', 0);
  assert.deepEqual(r, {ok:false, reason:'tipo'});
  assert.equal(st.equip.length, 1);
});

test('slots cheios de staff com Freezer Novo: cabe o 4º, falha o 5º', () => {
  const st = naLoja();
  st.money = 50;
  st.equip = [equipPorId('freezer')];
  const iOferta = st.loja.ofertas.findIndex(o=>o.t==='s');
  assert.ok(iOferta >= 0);
  const idOferta = st.loja.ofertas[iOferta].o.id;
  st.staff = STAFF.filter(s=>s.id!==idOferta).slice(0,3);
  assert.equal(st.staff.length, 3);
  assert.equal(E.comprar(st, iOferta).ok, true); // 4º cabe graças ao Freezer
  assert.equal(st.staff.length, 4);
});

test('replay reproduz uma run com compra de equipamento no log', () => {
  const jogar = () => {
    const st = E.novaRun(2028);
    let g = 0;
    while(st.fase!=='fim' && g++<800){
      if(st.fase==='jogo'){
        for(let n=0;n<4 && st.fase==='jogo';n++) E.colocar(st, n%st.hand.length);
        if(st.fase==='jogo' && st.stack.length>0) E.servir(st);
      } else {
        const iE = st.loja.ofertas.findIndex(o=>o.t==='e' && !o.sold && st.money>=E.precoOferta(st,o.o.preco));
        if(iE>=0) E.comprar(st, iE);
        E.proximaRonda(st);
      }
    }
    return st;
  };
  const live = jogar();
  assert.ok(live.log.some(a=>a.t==='comprar'), 'o log devia ter pelo menos um comprar');
  const rep = replay(2028, live.log);
  assert.equal(rep.ok, true, rep.erro);
  assert.equal(rep.ptsTotais, live.ptsTotais);
  assert.equal(rep.ronda, live.ronda);
});
