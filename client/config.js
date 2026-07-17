/* Endpoints da API do ranking.
   - Dev local: deixa SUPABASE_REF = null → usa o server/local/server.js (/api/*)
   - Produção: mete a ref do projeto Supabase (Settings → General → Reference ID)
     e os pedidos passam para as Edge Functions pl-* desse projeto. */

const SUPABASE_REF = 'uubvzimxahvrqafeknwv'; // produção; null volta ao server/local

export const ENDPOINTS = SUPABASE_REF ? {
  start:       `https://${SUPABASE_REF}.supabase.co/functions/v1/pl-start-run`,
  submit:      `https://${SUPABASE_REF}.supabase.co/functions/v1/pl-submit-run`,
  leaderboard: `https://${SUPABASE_REF}.supabase.co/functions/v1/pl-leaderboard`,
} : {
  start:       '/api/run/start',
  submit:      '/api/run/submit',
  leaderboard: '/api/leaderboard',
};
