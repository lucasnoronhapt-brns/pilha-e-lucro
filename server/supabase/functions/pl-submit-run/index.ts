/* pl-submit-run — recebe {run_id, nome, log}, RE-SIMULA a run com o mesmo
   engine do cliente e calcula a pontuação no servidor. Divergência, ação
   ilegal, run repetida ou seed expirada = rejeitada.
   Antes do deploy: npm run sync:supabase (gera _shared/ a partir da raiz).
   Deploy: supabase functions deploy pl-submit-run --no-verify-jwt */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { replay } from '../_shared/engine/replay.js';
import { normalizarNome, nomeValido } from '../_shared/shared/nome.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (code: number, obj: unknown) =>
  new Response(JSON.stringify(obj), { status: code, headers: { ...CORS, 'Content-Type': 'application/json' } });

const VALIDADE_SEED_MS = 6 * 60 * 60 * 1000;
const MAX_ACOES = 20000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { erro: 'método' });

  let body: { run_id?: string; nome?: string; log?: unknown };
  try { body = await req.json(); } catch { return json(400, { erro: 'JSON inválido' }); }
  const { run_id, log } = body;
  const nome = normalizarNome(body.nome);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: run } = await db.from('pl_runs').select('*').eq('id', run_id).maybeSingle();
  if (!run) return json(404, { erro: 'run desconhecida' });
  if (run.usada) return json(409, { erro: 'run já submetida' });
  if (Date.now() - new Date(run.criada).getTime() > VALIDADE_SEED_MS) return json(410, { erro: 'seed expirada' });
  if (!nomeValido(nome)) return json(400, { erro: 'nome inválido (3-20 caracteres, sem palavrões)' });
  if (!Array.isArray(log) || log.length === 0 || log.length > MAX_ACOES) return json(400, { erro: 'action_log inválido' });

  /* A pontuação NUNCA vem do cliente. */
  const rep = replay(Number(run.seed), log);
  if (!rep.ok) return json(422, { erro: 'run rejeitada: ' + rep.erro });
  if (rep.fase !== 'fim') return json(422, { erro: 'run rejeitada: a run não chegou ao fim' });

  /* marca usada primeiro (condicional) — corrida entre 2 submits do mesmo run_id perde 1 */
  const { data: marcada } = await db.from('pl_runs')
    .update({ usada: true }).eq('id', run_id).eq('usada', false).select('id');
  if (!marcada || marcada.length === 0) return json(409, { erro: 'run já submetida' });

  const entrada = {
    nome, pts: rep.ptsTotais, ronda: rep.ronda,
    burgers: rep.totalBurgers, melhor: rep.melhorBurger, run_id,
  };
  const { error: e2 } = await db.from('pl_scores').insert(entrada);
  if (e2) return json(500, { erro: 'erro interno' });

  const { count } = await db.from('pl_scores')
    .select('id', { count: 'exact', head: true }).gt('pts', entrada.pts);
  return json(200, { ok: true, pts: entrada.pts, ronda: entrada.ronda, posicao: (count ?? 0) + 1 });
});
