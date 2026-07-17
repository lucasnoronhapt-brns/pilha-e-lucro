# M2 fase B — deploy no Supabase (projeto partilhado com o bolão)

⚠️ Este projeto Supabase é partilhado com o **bolão** e a **sala de pausa**.
Tudo aqui é aditivo e com prefixo `pl_`/`pl-` — nunca tocar nos recursos das outras apps.

## Passos (uma vez)

1. **Tabelas**: no dashboard → SQL Editor → colar e correr `migrations/pl_ranking.sql`
   (cria `pl_runs` e `pl_scores` com RLS; não mexe em mais nada).
2. **Sincronizar o engine** (gera `functions/_shared/` a partir da raiz — fonte de verdade única):
   ```
   npm run sync:supabase
   ```
3. **Deploy das functions** (CLI do Supabase autenticada; `--no-verify-jwt` porque
   os endpoints são públicos e têm as suas próprias defesas):
   ```
   supabase link --project-ref <REF>
   supabase functions deploy pl-start-run   --no-verify-jwt
   supabase functions deploy pl-submit-run  --no-verify-jwt
   supabase functions deploy pl-leaderboard --no-verify-jwt
   ```
4. **Client**: em `client/config.js`, mudar `SUPABASE_REF = null` para `'<REF>'`.
5. Alojar `client/ + engine/ + shared/ + assets/` num estático (GitHub Pages, Netlify…).

## Depois de cada alteração ao engine
Voltar a correr `npm run sync:supabase` e fazer redeploy do `pl-submit-run`,
senão o servidor re-simula com uma versão antiga e rejeita runs legítimas.

## Defesas (iguais ao servidor local)
- seed emitida pelo servidor; `run_id` de uso único (update condicional — sem corrida)
- seeds expiram em 6h; máx 30 runs/hora por IP; log ≤ 20000 ações
- pontuação sempre re-simulada no servidor com o engine partilhado
- nome validado por `shared/nome.js` (3-20 caracteres + filtro de palavrões)
- anon só consegue LER `pl_scores` (RLS); escrita só via service role nas functions
