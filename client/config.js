/* Endpoints da API do ranking + dados públicos do projeto Supabase.
   - Dev local: deixa SUPABASE_REF = null → usa o server/local/server.js (/api/*)
     (o servidor local não tem autenticação, por isso não há login nem submissão)
   - Produção: mete a ref do projeto Supabase (Settings → General → Reference ID)
     e os pedidos passam para as Edge Functions pl-* desse projeto. */

const SUPABASE_REF = 'uubvzimxahvrqafeknwv'; // produção; null volta ao server/local

/* A chave anon é PÚBLICA por natureza (viaja no browser de toda a gente) e só
   dá acesso ao que as políticas RLS deixarem — no nosso caso, ler o ranking.
   A service_role NUNCA pode aparecer do lado do cliente: vive só nas Edge
   Functions, que a leem da variável de ambiente do próprio Supabase. */
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1YnZ6aW14YWh2cnFhZmVrbnd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMDE1MzcsImV4cCI6MjA5NTc3NzUzN30.xTrFtQY3RhCQ930Ssa0nGBRkH_oAV8dtx_bFZ1Z7B4s';

export const SUPABASE = SUPABASE_REF ? {
  url: `https://${SUPABASE_REF}.supabase.co`,
  anon: ANON,
} : null;

export const ENDPOINTS = SUPABASE_REF ? {
  start:       `https://${SUPABASE_REF}.supabase.co/functions/v1/pl-start-run`,
  submit:      `https://${SUPABASE_REF}.supabase.co/functions/v1/pl-submit-run`,
  leaderboard: `https://${SUPABASE_REF}.supabase.co/functions/v1/pl-leaderboard`,
  perfil:      `https://${SUPABASE_REF}.supabase.co/functions/v1/pl-perfil`,
} : {
  start:       '/api/run/start',
  submit:      '/api/run/submit',
  leaderboard: '/api/leaderboard',
  perfil:      null,
};
