-- Pilha & Lucro — ranking (M2 fase B)
-- ATENÇÃO: este projeto Supabase é PARTILHADO com o bolão e a sala de pausa.
-- Só recursos novos com prefixo pl_; nunca alterar tabelas/políticas existentes.

create table if not exists public.pl_runs (
  id uuid primary key default gen_random_uuid(),
  seed bigint not null,
  criada timestamptz not null default now(),
  usada boolean not null default false,
  ip text
);

create table if not exists public.pl_scores (
  id bigint generated always as identity primary key,
  nome text not null,
  pts int not null,
  ronda int not null,
  burgers int not null,
  melhor int not null,
  quando timestamptz not null default now(),
  run_id uuid not null unique references public.pl_runs(id)
);

create index if not exists pl_runs_ip_criada on public.pl_runs (ip, criada desc);
create index if not exists pl_scores_ordem on public.pl_scores (pts desc, ronda desc, quando asc);

-- RLS: anon só LÊ o ranking; runs e escrita de scores passam exclusivamente
-- pelas Edge Functions (service role, que ignora RLS).
alter table public.pl_runs enable row level security;
alter table public.pl_scores enable row level security;

drop policy if exists pl_scores_leitura_publica on public.pl_scores;
create policy pl_scores_leitura_publica
  on public.pl_scores for select
  to anon, authenticated
  using (true);
