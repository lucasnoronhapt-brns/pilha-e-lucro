# Pilha & Lucro — CLAUDE.md

## O que é
Roguelike de montagem de hambúrgueres inspirado na estrutura do Balatro (runs, loja, modificadores, pontuação fichas × mult), mas com mecânicas próprias: **empilhamento vertical com risco de tombar**, **bónus por adjacência entre camadas** e (futuro) **perecibilidade de ingredientes e pipeline de grill**. Autor: Lucas. Alvo: browser (desktop + mobile), com ranking online estilo fliperama.

## Estado atual
**M1 (migração) concluído** — jul 2026. O protótipo foi separado em `engine/` + `client/` + `tests/`, com jogabilidade idêntica ao v0.2:
- `engine/` — ES modules puros (zero DOM, zero `Math.random()`): `rng.js` (mulberry32), `data.js`, `game.js` (estado + ações com validação de legalidade + scoring), `replay.js` (re-simula um action_log)
- Fases explícitas no estado (`jogo`/`loja`/`fim`); ações ilegais devolvem `{ok:false, reason}`
- **Action log**: cada ação legal é registada pelo próprio engine em `state.log` (`tutorial`, `colocar` — inclui tombas —, `servir`, `trocar`, `lixo`, `comprar`, `vender`, `continuar`); no browser inspeciona-se com `__run.log`
- Seed: por agora gerada no cliente (`crypto.getRandomValues`, visível na consola) — passa a vir do servidor no M2
- `Math.random()` só sobrevive no client em efeitos visuais/áudio (posição de floats, vibrato de beeps)
- Sprites extraídos do base64 para `assets/sprites/` (31 PNG + fundo.jpg); o v0.2 usa 32 dos ~60 do acervo
- **Testes**: `npm test` (runner nativo do Node, sem dependências) — 40 testes: adjacências, receitas, bosses, tomba, replay (mesma seed + mesmo log = mesmo estado; logs adulterados rejeitados)
- **Correr localmente**: `py -m http.server 8000` na raiz → http://localhost:8000/client/ (o alias `python` do Windows não existe; usar `py`)

O ficheiro original `pilha_e_lucro_v0_2.html` (411 KB, sprites em base64) fica **intocado como referência de comportamento**. Detalhes do v0.2 preservados de propósito: o burger do tutorial não dispara o fim de ronda (o check acontece no serviço seguinte); no tomba o ingrediente fica na mão; queijo sobre bacon dá Crocante E Derretido.

### Mecânicas implementadas (v0.2)
- Mão de 7 ingredientes, empilhar por toque, refill automático
- 12 ingredientes com fichas base, categoria (proteína/laticínio/fresco/molho) e peso
- **Equilíbrio**: peso acumulado vs. máximo (base 8); molhos e cebola pesam 2; exceder = pilha tomba, perde 1 serviço (screen shake + som)
- **Adjacências** (sempre ativas): Derretido (queijo sobre proteína, +2 mult), Base Selada (molho na 1ª camada, +8), Fresquinho (alface+tomate, +10), Crocante (bacon+queijo, +12), Dose Dupla (iguais seguidos, +6), Pequeno-Almoço (ovo+bacon, +1 mult)
- Pontuação = fichas × mult, com preview ao vivo e animação de scoring passo a passo ao servir
- **Rondas**: alvo = round(100 · r^1.55 / 10)·10 + 20; 4 serviços e 3 trocas por ronda; falha = game over com estatísticas
- **Boss a cada 3 rondas**: Crítico Vegetariano (proteínas = 0 fichas), Cliente Apressado (máx 6 camadas), Sem Frescos (frescos = 0)
- **Loja entre rondas**: 2 staff + 2 receitas aleatórias, renderizadas com molduras de carta; dinheiro = 4 + serviços não usados + trocas não usadas. **Vender** (jul 2026): na loja podes vender staff/receitas por metade do preço (floor; Cheeseburger inicial vende por 0€) para libertar slots — ação `vender` no log, fila "Vender:" com confirmação em popup
- 6 receitas (padrões contíguos ou por contagem; máx 3 slots), 7 staff passivos (máx 3 slots) — inclui Chef do Bacon
- Detalhe visual importante: queijo usa sprite "frio" por defeito e troca para "derretendo" quando colocado sobre proteína
- **Perecibilidade (M3, jul 2026)**: a mão PERSISTE entre rondas (mudança vs. v0.2, que redistribuía) e cada carta envelhece +1 ronda ao passar de ronda; refill chega fresco. Curva: idade 0 = 100% → 1 = **auge 150%** → 2..vida-1 = murcho 50% → ≥vida = **estragado** (não coloca, ocupa o slot, só sai com troca). Vidas: alface/tomate 2, cebola 3, carnes/ovo/queijo 5, m. especial 6; **picles/ketchup/maionese são conservas eternas**. Frescura multiplica só as fichas base (bónus de staff inteiros; adjacências/receitas intactas). Badges na mão: contador de rondas restantes, ⭐ auge, 💀 estragado. Sprites de estado: só alface (murcha/estragada) por agora; restantes com filtro CSS até exportar mais do acervo. Contaminação ficou reservada para boss futuro
- **Tutorial guiado** (obrigatório manter): primeiro burger passo a passo com destaque e bloqueio de ações — paredes de texto NÃO funcionam (validado com o autor)
- **📖 Coleção** (estilo Balatro, jul 2026 — era o "Livro"): galeria visual com todas as receitas e staff como cartas nas molduras (✓ no que tens na run), bosses como cartões, adjacências e ingredientes com a arte `card_art_*`; toque abre detalhe
- **Troca seletiva**: modo de seleção, descarta só os ingredientes marcados
- Áudio: bleeps WebAudio (pitch sobe com a altura da pilha, cash ao servir, buzz ao tombar)

## Regras de segurança (INEGOCIÁVEL — lição do projeto "Bolão")
**A pontuação NUNCA é confiada ao cliente.** Arquitetura obrigatória para o ranking:
1. Servidor emite a **seed** da run (endpoint `POST /run/start`); cliente nunca escolhe seed
2. Toda a aleatoriedade do jogo usa PRNG determinístico com essa seed (ex.: mulberry32). `Math.random()` é proibido na lógica de jogo
3. Cliente regista **log de ações** compacto (colocar X, servir, trocar [ids], comprar Y, lixo)
4. Fim de run: cliente envia `{run_id, action_log}`. O **servidor re-simula** a run com a mesma lógica e calcula a pontuação ele próprio. Divergência ou ação ilegal = run rejeitada
5. A lógica de jogo (scoring, adjacências, receitas, bosses, pesos) vive num **módulo puro partilhado** (`engine/`) importado pelo cliente e pelo servidor — uma única fonte de verdade
6. Defesas adicionais: rate limiting por jogador, limites de plausibilidade (pontos máximos teóricos por ronda), seeds expiram, run_id de uso único
7. Ranking lê apenas pontuações validadas pelo servidor

## Estrutura
```
./                    # raiz do projeto (esta pasta)
├── engine/           # lógica pura, determinística, zero DOM (partilhada cliente/servidor)
│   ├── rng.js        # mulberry32 + shuffleSeeded
│   ├── data.js       # ingredientes, receitas, staff, bosses, adjacências
│   ├── game.js       # estado, ações, validação de legalidade, scoring, action log
│   └── replay.js     # re-simula um action_log e devolve o resultado (base do M2)
├── client/           # UI em DOM como no protótipo (index.html + main.js, ES modules)
├── server/           # (M2) Supabase Edge Functions (start-run, submit-run, leaderboard)
├── assets/sprites/   # PNGs individuais extraídos do v0.2
├── tests/            # node --test, sem browser nem dependências
└── pilha_e_lucro_v0_2.html  # protótipo original — referência de comportamento, não mexer
```
Workflow preferido do autor: servidor local + Chrome, edições cirúrgicas via Claude Code CLI.

## Roadmap
- ~~**M1 — Migração**~~ ✅ concluído (ver Estado atual)
- ~~**M1.5 — Interface legível estilo Balatro**~~ ✅ concluído (jul 2026), só client/ + validação de nome:
  - Caixas de recursos com cores fixas: Serviços #4A9FE8, Trocas #D8352A, Caixa #F2B32A, Ronda #E8843F. Portrait: grelha 2×2; landscape/desktop: coluna lateral esquerda 210px
  - Fichas×mult em caixa herói (28-34px, pulse ao subir); adjacências ao vivo (tag flutuante ao colocar + lista junto à pilha até servir)
  - Fundo `fundo_v2.png` (sem menu); alvo num quadro chalkboard CSS no topo do stage; boss como cartão animado por cima do quadro
  - Staff/receitas como mini-cartas 48px com molduras + popup de detalhe; contador n/3
  - Regra de legibilidade: nenhum texto de jogo <11px; valores consultados em jogo ≥22px
  - Nome do ranking: 3-20 caracteres livres + filtro de palavrões PT em `shared/nome.js` (partilhado client/servidor; servidor manda); nota "visível para todos" no formulário
  - Truques de dev no client: `?semintro` (salta intro), `?demo` (cenário fixo para screenshots; offline)
- ~~**M2 — Ranking seguro**~~ ✅ concluído (jul 2026): fase A local (`server/local/server.js`) e fase B Supabase em produção. Edge Functions `pl-start-run`/`pl-submit-run`/`pl-leaderboard` + tabelas `pl_runs`/`pl_scores` no **projeto Supabase partilhado com o bolão e a sala de pausa** (ref `uubvzimxahvrqafeknwv`, plano free = máx 2 projetos ativos) — tudo aditivo com prefixo `pl_`/`pl-`, nunca tocar no resto. Deploy: ver `server/supabase/LEIA-ME.md`; **após mudar o engine, correr `npm run sync:supabase` + redeploy de `pl-submit-run`**. `client/config.js` alterna local↔produção. Nome de exibição: 3-20 caracteres + filtro de palavrões (`shared/nome.js`). **Público**: jogo em https://lucasnoronhapt-brns.github.io/pilha-e-lucro/ (GitHub Pages do repo https://github.com/lucasnoronhapt-brns/pilha-e-lucro, branch main; `git push` = deploy do client em ~1 min).
- ~~**M3 — Perecibilidade**~~ ✅ concluído (jul 2026, ver Mecânicas). Pendências menores: sprites de estado do tomate e restantes (acervo), contaminação como boss futuro ("Frigorífico Avariado").
- **M4 — Equipamentos** (moldura industrial, tipo vouchers): melhorias permanentes do restaurante (+slots, loja mais barata, chapa dupla).
- **M5 — Grill/pipeline**: carne crua → tempo de grelha → janela de uso → lixo. Introduzir progressivamente (não no round 1).
- **M6 — Lendárias** (moldura dourada): quebra-regras ("carne queimada vale ×2"), só depois do balanceamento base.

## Assets
~60 sprites pixel art consistentes (extraídos com chroma-key magenta + NEAREST downscale, pipeline Python/Pillow existente): 12 ingredientes, estados (carne crua/grelhada/queimada, alface fresca/murcha/estragada, tomate ×3, queijo frio/derretendo/derretido), 6 pães (clássico/brioche/pretzel, topo+base), 4 molduras de carta (receita/staff/equipamento/lendária), 16 elementos UI, fundo de cozinha 1100px. Geração de novos assets: ChatGPT com bloco de estilo fixo (16-bit, outline #2B1B0E, perfil lateral, fundo #FF00FF) anexando sempre a folha de referência.

## Regras de trabalho
- Edições cirúrgicas: nunca compactar/resumir secções de código não relacionadas
- Prototipar a mecânica antes de expandir arte ou sistemas; uma camada de cada vez
- Pausar para confirmação entre passos grandes de implementação
- PT-PT na UI ("tu")
- Sem IP do McDonald's: hamburgueria fictícia, nomes próprios
- Nunca usar localStorage para nada crítico; estado de run vive em memória + servidor
