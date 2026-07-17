/* Helpers partilhados pelos testes do engine (não é ficheiro de teste). */
import { novaRun } from '../engine/game.js';
import { RECEITAS, STAFF, EQUIPAMENTOS } from '../engine/data.js';

export const receitaPorId = id => RECEITAS.find(r=>r.id===id);
export const staffPorId = id => STAFF.find(s=>s.id===id);
export const equipPorId = id => EQUIPAMENTOS.find(e=>e.id===id);

/* Run de teste: por defeito SEM receitas (nem a Cheeseburger inicial),
   para isolar o que cada teste mede. */
export function runTeste(seed=1, {receitas=[], staff=[], equip=[]}={}){
  const st = novaRun(seed);
  st.receitas = receitas;
  st.staff = staff;
  st.equip = equip;
  return st;
}
