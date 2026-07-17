/* Bosses: modificadores de ronda (a cada 3 rondas) e o seu ciclo. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calc, colocar, proximaRonda } from '../engine/game.js';
import { BOSSES } from '../engine/data.js';
import { runTeste, staffPorId } from './helpers.js';

test('🥦 Crítico Vegetariano: proteínas dão 0 fichas (adjacências mantêm-se)', () => {
  const st = runTeste();
  st.boss = BOSSES[0];
  // carne→0, queijo 10; Derretido continua a dar +2 mult
  const s = calc(st, ['carne','queijo']);
  assert.equal(s.chips, 10);
  assert.equal(s.mult, 3);
  assert.equal(s.total, 30);
});

test('🧊 Sem Frescos: frescos dão 0 fichas mas Fresquinho ainda conta', () => {
  const st = runTeste();
  st.boss = BOSSES[2];
  assert.equal(calc(st, ['alface','tomate']).total, 10); // 0+0+10 fresquinho
});

test('⏱️ Cliente Apressado: a 7ª camada é recusada (sem penalização)', () => {
  const st = runTeste();
  st.boss = BOSSES[1];
  st.stack = ['picles','picles','picles','picles','picles','picles']; // peso 6, cap 6
  const serves = st.serves, mao = st.hand.length;
  const r = colocar(st, 0);
  assert.deepEqual(r, {ok:false, reason:'cap'});
  assert.equal(st.stack.length, 6);      // pilha intacta
  assert.equal(st.serves, serves);       // não é tomba: sem perda de serviço
  assert.equal(st.hand.length, mao);     // carta fica na mão
  assert.equal(st.log.length, 0);        // ação recusada não entra no log
});

test('bosses aparecem a cada 3 rondas e ciclam pela ordem do v0.2', () => {
  const st = runTeste();
  const vistos = {};
  while(st.ronda < 12){
    st.fase = 'loja';           // força a transição (o teste só olha ao calendário)
    proximaRonda(st);
    if(st.ronda % 3 === 0) vistos[st.ronda] = st.boss.n;
    else assert.equal(st.boss, null, `ronda ${st.ronda} não devia ter boss`);
  }
  assert.equal(vistos[3], BOSSES[0].n);
  assert.equal(vistos[6], BOSSES[1].n);
  assert.equal(vistos[9], BOSSES[2].n);
  assert.equal(vistos[12], BOSSES[0].n); // volta ao início
});

test('Duplo Turno e Mãos Rápidas aplicam-se na ronda seguinte', () => {
  const st = runTeste(1, {staff:[staffPorId('turno'), staffPorId('maos')]});
  st.fase = 'loja';
  proximaRonda(st);
  assert.equal(st.serves, 5);
  assert.equal(st.trocas, 4);
});
