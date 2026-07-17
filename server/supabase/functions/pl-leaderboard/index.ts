/* pl-leaderboard — top 10 validado pelo servidor.
   Deploy: supabase functions deploy pl-leaderboard --no-verify-jwt */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};
const json = (code: number, obj: unknown) =>
  new Response(JSON.stringify(obj), { status: code, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'GET') return json(405, { erro: 'método' });

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const [{ data: top, error }, { count }] = await Promise.all([
    db.from('pl_scores')
      .select('nome, pts, ronda, burgers, melhor, quando')
      .order('pts', { ascending: false }).order('ronda', { ascending: false })
      .order('quando', { ascending: true }).limit(10),
    db.from('pl_scores').select('id', { count: 'exact', head: true }),
  ]);
  if (error) return json(500, { erro: 'erro interno' });
  return json(200, { top: top ?? [], total: count ?? 0 });
});
