/* pl-start-run — emite {run_id, seed} para uma run nova.
   O cliente NUNCA escolhe a seed (regra de segurança do CLAUDE.md).
   Deploy: supabase functions deploy pl-start-run --no-verify-jwt */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (code: number, obj: unknown) =>
  new Response(JSON.stringify(obj), { status: code, headers: { ...CORS, 'Content-Type': 'application/json' } });

const MAX_STARTS_HORA = 30;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { erro: 'método' });

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'desconhecido';

  const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: e1 } = await db.from('pl_runs')
    .select('id', { count: 'exact', head: true })
    .eq('ip', ip).gte('criada', desde);
  if (e1) return json(500, { erro: 'erro interno' });
  if ((count ?? 0) >= MAX_STARTS_HORA) return json(429, { erro: 'demasiadas runs — tenta daqui a pouco' });

  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  const { data, error: e2 } = await db.from('pl_runs')
    .insert({ seed, ip }).select('id').single();
  if (e2) return json(500, { erro: 'erro interno' });

  return json(200, { run_id: data.id, seed });
});
