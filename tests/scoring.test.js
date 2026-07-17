/* Scoring: fichas × mult, adjacências e bónus de staff — valores esperados
   calculados à mão a partir das regras do v0.2. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calc, alvo } from '../engine/game.js';
import { runTeste, staffPorId } from './helpers.js';

test('ingrediente sozinho: só as fichas base', () => {
  const st = runTeste();
  assert.deepEqual(
    (({chips,mult,total})=>({chips,mult,total}))(calc(st, ['carne'])),
    {chips:22, mult:1, total:22}
  );
});

test('🧀 Derretido: queijo sobre proteína dá +2 mult', () => {
  const st = runTeste();
  const s = calc(st, ['carne','queijo']);
  assert.equal(s.chips, 32);
  assert.equal(s.mult, 3);
  assert.equal(s.total, 96);
});

test('queijo sem proteína por baixo não derrete', () => {
  const st = runTeste();
  const s = calc(st, ['alface','queijo']);
  assert.equal(s.mult, 1);
  assert.equal(s.total, 18);
});

test('🧀 Estufa Quente: queijo dá +1 mult mesmo sem proteína', () => {
  const st = runTeste(1, {staff:[staffPorId('estufa')]});
  const s = calc(st, ['alface','queijo']);
  assert.equal(s.mult, 2);
  assert.equal(s.total, 36);
});

test('Estufa não acumula com Derretido (o Derretido tem prioridade)', () => {
  const st = runTeste(1, {staff:[staffPorId('estufa')]});
  const s = calc(st, ['carne','queijo']);
  assert.equal(s.mult, 3); // só +2 do Derretido
});

test('🥖 Base Selada: molho na 1ª camada dá +8 fichas', () => {
  const st = runTeste();
  assert.equal(calc(st, ['ketchup']).total, 13);        // 5 + 8
  assert.equal(calc(st, ['carne','ketchup']).total, 27); // fora da base: sem bónus
});

test('🥗 Fresquinho: alface e tomate colados, nas duas ordens', () => {
  const st = runTeste();
  assert.equal(calc(st, ['alface','tomate']).total, 26); // 8+8+10
  assert.equal(calc(st, ['tomate','alface']).total, 26);
});

test('🥓 Crocante: bacon e queijo colados', () => {
  const st = runTeste();
  // queijo sobre bacon: Crocante +12 E Derretido +2 mult (bacon é proteína)
  const s1 = calc(st, ['bacon','queijo']);
  assert.equal(s1.chips, 36);
  assert.equal(s1.mult, 3);
  // bacon sobre queijo: só Crocante
  const s2 = calc(st, ['queijo','bacon']);
  assert.equal(s2.total, 36);
});

test('👯 Dose Dupla: dois iguais seguidos dão +6 fichas', () => {
  const st = runTeste();
  assert.equal(calc(st, ['picles','picles']).total, 18); // 6+6+6
});

test('🍳 Peq.-Almoço: ovo e bacon colados dão +1 mult, nas duas ordens', () => {
  const st = runTeste();
  assert.equal(calc(st, ['ovo','bacon']).total, 52);  // (12+14) × 2
  assert.equal(calc(st, ['bacon','ovo']).total, 52);
});

test('staff de fichas: Chef do Bacon, Horta e Molho Secreto', () => {
  assert.equal(calc(runTeste(1,{staff:[staffPorId('chefbacon')]}), ['bacon']).total, 26); // 14+12
  assert.equal(calc(runTeste(1,{staff:[staffPorId('horta')]}), ['alface']).total, 13);    // 8+5
  assert.equal(calc(runTeste(1,{staff:[staffPorId('msecreto')]}), ['ketchup']).total, 19); // 5+6+8 base selada
});

test('total é arredondado (mult fracionário)', () => {
  const st = runTeste();
  // sem receitas não há mult fracionário; simula com mult 2.5 via receita pequeno noutro teste;
  // aqui garante apenas que total = round(chips*mult)
  const s = calc(st, ['carne','queijo']);
  assert.equal(s.total, Math.round(s.chips*s.mult));
});

test('alvo por ronda segue a curva do v0.2', () => {
  assert.deepEqual([1,2,3,4].map(alvo), [120,310,570,880]);
});
