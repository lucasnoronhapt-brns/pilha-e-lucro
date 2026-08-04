/* Sessão do jogador — login com Google através do Supabase Auth.
   Sem dependências externas: só fetch e redirects, como o resto do projeto.

   Fluxo: mandamos o jogador para /auth/v1/authorize?provider=google; o Google
   devolve-o ao jogo com os tokens no fragmento (#) do URL, que apanhamos em
   capturarRedirect() e limpamos logo do endereço. */

import { SUPABASE } from './config.js';

const CHAVE_SESSAO = 'pl_sessao';
const CHAVE_RUN = 'pl_run_pendente';

export const disponivel = () => !!SUPABASE;

/* ---------- sessão ---------- */
function guardar(s){ try{ localStorage.setItem(CHAVE_SESSAO, JSON.stringify(s)); }catch(e){} }

export function sessao(){
  try{
    const s = JSON.parse(localStorage.getItem(CHAVE_SESSAO) || 'null');
    if(!s || !s.access_token) return null;
    if(s.expira_em && Date.now() > s.expira_em) return null;  // token caducado
    return s;
  }catch(e){ return null; }
}

export function sair(){ try{ localStorage.removeItem(CHAVE_SESSAO); }catch(e){} }

export const cabecalho = () => {
  const s = sessao();
  return s ? { Authorization: `Bearer ${s.access_token}` } : {};
};

/* Apanha o #access_token=... com que o Supabase nos devolve ao jogo.
   Devolve true se acabou de chegar uma sessão nova. */
export function capturarRedirect(){
  if(!location.hash || !location.hash.includes('access_token')) return false;
  const p = new URLSearchParams(location.hash.slice(1));
  const token = p.get('access_token');
  if(token){
    guardar({
      access_token: token,
      /* expires_in vem em segundos; guardamos o instante absoluto, com uma
         margem de 60s para não submeter com um token a expirar a meio */
      expira_em: Date.now() + ((Number(p.get('expires_in')) || 3600) - 60) * 1000,
    });
  }
  /* tira o token do endereço para não ficar à vista nem no histórico */
  history.replaceState(null, '', location.pathname + location.search);
  return !!token;
}

export function entrarComGoogle(){
  const volta = location.origin + location.pathname;
  location.href = `${SUPABASE.url}/auth/v1/authorize`
    + `?provider=google&redirect_to=${encodeURIComponent(volta)}`;
}

/* Dados da conta Google — só para sugerir o primeiro nome de exibição. */
export async function utilizador(){
  const s = sessao();
  if(!s) return null;
  try{
    const r = await fetch(`${SUPABASE.url}/auth/v1/user`, {
      headers: { apikey: SUPABASE.anon, Authorization: `Bearer ${s.access_token}` },
    });
    if(!r.ok) return null;
    return await r.json();
  }catch(e){ return null; }
}

/* ---------- run à espera de submissão ----------
   Entrar com o Google obriga a sair da página, o que mataria a run acabada de
   jogar. Guardamos o essencial no sessionStorage até voltarmos.
   Não abre brecha de batota: o log continua a ser re-simulado pelo servidor,
   que rejeita qualquer ação ilegal, e o run_id é de uso único. */
export function guardarRunPendente(dados){
  try{ sessionStorage.setItem(CHAVE_RUN, JSON.stringify(dados)); }catch(e){}
}
export function lerRunPendente(){
  try{ return JSON.parse(sessionStorage.getItem(CHAVE_RUN) || 'null'); }catch(e){ return null; }
}
export function limparRunPendente(){
  try{ sessionStorage.removeItem(CHAVE_RUN); }catch(e){}
}
