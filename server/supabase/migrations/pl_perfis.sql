-- Pilha & Lucro — perfis de jogador (login com Google)
-- ATENÇÃO: este projeto Supabase é PARTILHADO com o bolão e a sala de pausa.
-- Só recursos novos com prefixo pl_; nunca alterar tabelas/políticas existentes.

create table if not exists public.pl_perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  criado timestamptz not null default now(),
  atualizado timestamptz not null default now()
);

-- nome único ignorando maiúsculas/minúsculas: ninguém se faz passar por um colega
create unique index if not exists pl_perfis_nome_unico on public.pl_perfis (lower(nome));

-- dono da pontuação; as linhas antigas (submetidas antes do login) ficam a null
alter table public.pl_scores add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists pl_scores_user on public.pl_scores (user_id);

-- RLS: anon só LÊ os nomes (o ranking mostra-os). A escrita passa
-- exclusivamente pela Edge Function pl-perfil (service role, que ignora RLS),
-- para o nome ter SEMPRE de passar pelo filtro do shared/nome.js.
alter table public.pl_perfis enable row level security;

drop policy if exists pl_perfis_leitura_publica on public.pl_perfis;
create policy pl_perfis_leitura_publica
  on public.pl_perfis for select
  to anon, authenticated
  using (true);
