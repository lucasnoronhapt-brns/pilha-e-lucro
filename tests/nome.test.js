/* Validação do nome de exibição — palavrões e frases sobre terceiros
   (ex.: "O Francisco é gay") não podem passar; nomes próprios normais sim. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nomeValido, normalizarNome } from '../shared/nome.js';

test('nomes próprios normais são válidos', () => {
  assert.equal(nomeValido('Lucas Noronha'), true);
  assert.equal(nomeValido('Sandro Alves'), true);
  assert.equal(nomeValido('Ana Pereira da Silva'), true);
  assert.equal(nomeValido("O'Brien"), true);
  assert.equal(nomeValido('Zé'), false); // < 3 caracteres
});

test('bloqueia frases sobre terceiros começadas por artigo/conjunção', () => {
  assert.equal(nomeValido('O Francisco é gay'), false);
  assert.equal(nomeValido('E a Clara também'), false);
  assert.equal(nomeValido('A Marta é burra'), false);
});

test('bloqueia nomes com verbo "ser"/conectores no meio, mesmo sem artigo inicial', () => {
  assert.equal(nomeValido('Francisco é parvo'), false);
  assert.equal(nomeValido('Clara tambem'), false);
});

test('bloqueia palavrões e insultos conhecidos', () => {
  assert.equal(nomeValido('Merda Total'), false);
  assert.equal(nomeValido('Idiota'), false);
  assert.equal(nomeValido('m-e-r-d-a'), false); // separadores não escondem o palavrão
});

test('normalizarNome colapsa espaços e apara extremidades', () => {
  assert.equal(normalizarNome('  Lucas   Noronha  '), 'Lucas Noronha');
});
