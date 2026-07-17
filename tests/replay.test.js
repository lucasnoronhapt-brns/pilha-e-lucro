/* Replay: mesma seed + mesmo action_log = mesmo resultado, sempre.
   É esta propriedade que permite ao servidor (M2) validar pontuações. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../engine/rng.js';
import * as E from '../engine/game.js';
import { replay } from '../engine/replay.js';

test('mulberry32 é determinístico', () => {
  const a = mulberry32(42), b = mulberry32(42);
  const sa = [a(),a(),a(),a(),a()], sb = [b(),b(),b(),b(),b()];
  assert.deepEqual(sa, sb);
  assert.ok(sa.every(v=>v>=0 && v<1));
});

test('mesma seed gera a mesma mão inicial; seeds diferentes divergem', () => {
  assert.deepEqual(E.novaRun(7).hand, E.novaRun(7).hand);
  assert.notDeepEqual(E.novaRun(1).hand, E.novaRun(2).hand);
});

/* Joga uma run "ao vivo" guiada só pelo estado — determinística dada a seed.
   Passa por tutorial, colocações, tombas, serviços, trocas, compras e rondas. */
function jogarRunAoVivo(seed){
  const st = E.novaRun(seed);
  E.maoTutorial(st);
  let guard = 0;
  while(st.fase!=='fim' && st.ronda<6 && guard++<800){
    if(st.fase==='jogo'){
      if(st.trocas>0 && st.stack.length===0 && guard%5===0) E.trocar(st,[0,2,4]);
      for(let n=0;n<4 && st.fase==='jogo';n++) E.colocar(st, n%st.hand.length);
      if(st.fase==='jogo' && st.trocas>0 && st.stack.length>0 && guard%9===0){ E.lixo(st); continue; }
      if(st.fase==='jogo' && st.stack.length>0) E.servir(st);
    } else if(st.fase==='loja'){
      E.comprar(st, guard%4);
      E.proximaRonda(st);
    }
  }
  return st;
}

test('replay do log de uma run ao vivo reproduz o estado final exato', () => {
  const live = jogarRunAoVivo(123456);
  assert.ok(live.log.length > 20, 'a run de teste devia ter dezenas de ações');
  const rep = replay(123456, live.log);
  assert.equal(rep.ok, true, rep.erro);
  assert.equal(rep.pts, live.pts);
  assert.equal(rep.ronda, live.ronda);
  assert.equal(rep.fase, live.fase);
  assert.equal(rep.totalBurgers, live.totalBurgers);
  assert.equal(rep.melhorBurger, live.melhorBurger);
  assert.equal(rep.ptsTotais, live.ptsTotais);
});

test('ptsTotais acumula entre rondas (o pts da ronda faz reset)', () => {
  const st = E.novaRun(3);
  st.pts = E.alvo(1) - 1;    // qualquer burger bate o alvo
  st.stack = ['carne'];
  E.servir(st);
  assert.equal(st.fase, 'loja');
  assert.equal(st.ptsTotais, 22); // só conta o burger servido, não o pts forjado
  E.proximaRonda(st);
  assert.equal(st.pts, 0);
  assert.equal(st.ptsTotais, 22);
});

test('dois replays do mesmo log dão o mesmo resultado', () => {
  const live = jogarRunAoVivo(2026);
  assert.deepEqual(replay(2026, live.log), replay(2026, live.log));
});

test('seed errada não valida o mesmo log', () => {
  const live = jogarRunAoVivo(123456);
  const rep = replay(123457, live.log);
  const igual = rep.ok && rep.pts===live.pts && rep.totalBurgers===live.totalBurgers
    && rep.melhorBurger===live.melhorBurger && rep.ronda===live.ronda;
  assert.equal(igual, false);
});

test('ação ilegal acrescentada ao log rejeita a run', () => {
  const live = jogarRunAoVivo(555);
  const rep = replay(555, [...live.log, {t:'comprar', i:0}]);
  assert.equal(rep.ok, false);
  assert.match(rep.erro, /ilegal/);
});

test('ação desconhecida rejeita a run', () => {
  const rep = replay(1, [{t:'hackear_pontos'}]);
  assert.equal(rep.ok, false);
  assert.match(rep.erro, /desconhecida/);
});

test('servir de pilha vazia no início do log é ilegal', () => {
  const rep = replay(1, [{t:'servir'}]);
  assert.equal(rep.ok, false);
});

test('tutorial a meio da run é ilegal (só antes do 1º burger)', () => {
  const rep = replay(1, [{t:'colocar',i:0},{t:'servir'},{t:'tutorial'}]);
  assert.equal(rep.ok, false);
});
