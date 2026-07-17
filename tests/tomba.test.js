/* Tomba: exceder o equilíbrio deita a pilha abaixo — perde 1 serviço,
   a pilha esvazia e o ingrediente FICA na mão (comportamento do v0.2). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colocar, servir, stabMax, alvo } from '../engine/game.js';
import { runTeste, staffPorId } from './helpers.js';

const PILHA_NO_LIMITE = ['ketchup','ketchup','ketchup','cebola']; // peso 2×4 = 8 (máximo base)

test('exceder o peso máximo tomba a pilha', () => {
  const st = runTeste();
  st.stack = [...PILHA_NO_LIMITE];
  const mao = st.hand.length;
  const r = colocar(st, 0); // qualquer ingrediente (peso ≥1) excede
  assert.equal(r.ok, true);
  assert.equal(r.evento, 'tomba');
  assert.equal(r.fim, null);
  assert.deepEqual(st.stack, []);        // pilha perdida
  assert.equal(st.serves, 3);            // −1 serviço
  assert.equal(st.hand.length, mao);     // o ingrediente não sai da mão
  assert.deepEqual(st.log, [{t:'colocar', i:0}]); // tomba é um colocar no log
});

test('Balcão Reforçado (+3 equilíbrio) evita o tomba no mesmo cenário', () => {
  const st = runTeste(1, {staff:[staffPorId('balcao')]});
  assert.equal(stabMax(st), 11);
  st.stack = [...PILHA_NO_LIMITE];
  const r = colocar(st, 0);
  assert.equal(r.evento, 'colocado');
  assert.equal(st.stack.length, 5);
  assert.equal(st.serves, 4);
});

test('tomba no último serviço sem alvo batido = game over', () => {
  const st = runTeste();
  st.serves = 1;
  st.stack = [...PILHA_NO_LIMITE];
  const r = colocar(st, 0);
  assert.equal(r.evento, 'tomba');
  assert.equal(r.fim, 'fim');
  assert.equal(st.fase, 'fim');
});

test('tomba com alvo já batido abre a loja (checarFim vê os pontos primeiro)', () => {
  const st = runTeste();
  st.pts = alvo(1); // 120
  st.serves = 1; st.trocas = 3;
  st.stack = [...PILHA_NO_LIMITE];
  const r = colocar(st, 0);
  assert.equal(r.fim, 'loja');
  assert.equal(st.fase, 'loja');
  assert.equal(st.loja.bonus, 4 + 0 + 3); // 4 base + serviços restantes + trocas
});

test('servir que bate o alvo abre a loja com o bónus certo', () => {
  const st = runTeste();
  st.pts = alvo(1) - 1;      // falta 1 ponto: qualquer burger chega
  st.stack = ['carne'];
  st.serves = 4; st.trocas = 2;
  const money = st.money;
  const r = servir(st);
  assert.equal(r.fim, 'loja');
  assert.equal(st.loja.bonus, 4 + 3 + 2); // serves já decrementado pelo servir
  assert.equal(st.money, money + 9);
  assert.equal(st.loja.ofertas.length, 5); // 2 staff + 2 receitas + 1 equipamento (M4)
  assert.ok(st.loja.ofertas.slice(0,2).every(o=>o.t==='s'));
  assert.ok(st.loja.ofertas.slice(2,4).every(o=>o.t==='r'));
  assert.equal(st.loja.ofertas[4].t, 'e');
});
