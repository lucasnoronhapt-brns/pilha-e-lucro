/* Receitas: padrões contíguos (seq), por contagem (count) e por categoria (countCat). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calc } from '../engine/game.js';
import { runTeste, receitaPorId } from './helpers.js';

test('Cheeseburger (seq): dispara em qualquer posição da pilha', () => {
  const st = runTeste(1, {receitas:[receitaPorId('cheese')]});
  // alface(8)+carne(22)+queijo(10)+20 receita = 60 fichas; Derretido → mult 3
  const s = calc(st, ['alface','carne','queijo']);
  assert.equal(s.chips, 60);
  assert.equal(s.mult, 3);
  assert.equal(s.total, 180);
});

test('Cheeseburger não dispara se a sequência estiver separada', () => {
  const st = runTeste(1, {receitas:[receitaPorId('cheese')]});
  const s = calc(st, ['carne','alface','queijo']);
  assert.equal(s.total, 40); // 22+8+10, sem receita nem Derretido
});

test('Clássico da Casa (seq de 4): +2 mult', () => {
  const st = runTeste(1, {receitas:[receitaPorId('classico')]});
  // ketchup(5)+carne(22)+queijo(10)+alface(8) +8 base selada = 53 fichas
  // mult: 1 +2 Derretido +2 receita = 5 → 265
  const s = calc(st, ['ketchup','carne','queijo','alface']);
  assert.equal(s.chips, 53);
  assert.equal(s.mult, 5);
  assert.equal(s.total, 265);
});

test('Salada Empilhada (seq): +25 fichas', () => {
  const st = runTeste(1, {receitas:[receitaPorId('salada')]});
  // 8+8+7 +10 fresquinho +25 receita = 58
  assert.equal(calc(st, ['alface','tomate','cebola']).total, 58);
});

test('Bacon Lovers (count): 2+ bacons em qualquer posição', () => {
  const st = runTeste(1, {receitas:[receitaPorId('bacon2')]});
  // bacon(14)+alface(8)+bacon(14) = 36 fichas; mult 1+2 = 3
  assert.equal(calc(st, ['bacon','alface','bacon']).total, 108);
  // com 1 bacon não dispara
  assert.equal(calc(st, ['bacon','alface']).total, 22);
});

test('Mar de Molho (countCat): 3+ molhos', () => {
  const st = runTeste(1, {receitas:[receitaPorId('molho3')]});
  // ketchup(5)+maionese(5)+m.especial(9) +8 base selada +30 receita = 57
  assert.equal(calc(st, ['ketchup','maionese','molho_especial']).total, 57);
});

test('Peq.-Almoço Reforçado (seq): mult fracionário +2.5 arredonda no total', () => {
  const st = runTeste(1, {receitas:[receitaPorId('pequeno')]});
  // fichas: 12+14+10 +12 crocante = 48
  // mult: 1 +1 peq-almoço +2 derretido (queijo sobre bacon) +2.5 receita = 6.5
  const s = calc(st, ['ovo','bacon','queijo']);
  assert.equal(s.chips, 48);
  assert.equal(s.mult, 6.5);
  assert.equal(s.total, 312); // round(48 × 6.5)
});

test('várias receitas ativas acumulam', () => {
  const st = runTeste(1, {receitas:[receitaPorId('cheese'), receitaPorId('bacon2')]});
  // bacon,bacon,carne,queijo: fichas 14+14+22+10 +6 dose dupla +20 cheese = 86
  // mult: 1 +2 derretido +2 bacon2 = 5 → 430
  const s = calc(st, ['bacon','bacon','carne','queijo']);
  assert.equal(s.total, 430);
});
