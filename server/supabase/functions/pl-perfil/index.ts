/* pl-perfil — lê e grava o nome de exibição do jogador autenticado.
   É o ÚNICO sítio onde um nome entra no sistema: o pl-submit-run deixou de
   aceitar nomes vindos do cliente e vai buscá-los aqui.
   Antes do deploy: npm run sync:supabase (gera _shared/ a partir da raiz).
   Deploy: supabase functions deploy pl-perfil --no-verify-jwt */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { normalizarNome, nomeValido } from '../_shared/shared/nome.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (code: number, obj: unknown) =>
  new Response(JSON.stringify(obj), { status: code, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  /* a identidade vem SEMPRE do token, nunca do corpo do pedido */
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { erro: 'inicia sessão primeiro' });
  const { data: auth } = await db.auth.getUser(token);
  const user = auth?.user;
  if (!user) return json(401, { erro: 'sessão expirada — entra outra vez' });

  if (req.method === 'GET') {
    const { data } = await db.from('pl_perfis').select('nome').eq('id', user.id).maybeSingle();
    return json(200, { nome: data?.nome ?? null });
  }

  if (req.method === 'POST') {
    let body: { nome?: string };
    try { body = await req.json(); } catch { return json(400, { erro: 'JSON inválido' }); }
    const nome = normalizarNome(body.nome);
    if (!nomeValido(nome)) {
      return json(400, { erro: 'nome inválido: 3-20 caracteres, sem palavrões e sem frases sobre outras pessoas' });
    }

    const { error } = await db.from('pl_perfis')
      .upsert({ id: user.id, nome, atualizado: new Date().toISOString() });
    if (error) {
      /* 23505 = índice único (lower(nome)) — nome já ocupado por outra conta */
      if (error.code === '23505') return json(409, { erro: 'esse nome já está a ser usado' });
      return json(500, { erro: 'erro interno' });
    }
    return json(200, { nome });
  }

  return json(405, { erro: 'método' });
});
