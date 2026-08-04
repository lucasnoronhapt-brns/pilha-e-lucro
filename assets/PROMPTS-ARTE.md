# Prompts de arte — cartas do Condimenta Burguer

Arte própria para cada receita, staff e equipamento, para as cartas deixarem de
reaproveitar sprites de ingredientes (o Freezer Novo mostrava uma fatia de queijo).

## Como usar

1. Gera a imagem no ChatGPT com o **bloco de estilo** + o prompt da carta,
   anexando sempre a **folha de referência** do acervo
2. Passa pelo pipeline habitual (chroma-key magenta + NEAREST downscale)
3. Grava em `assets/sprites/card_art_<tipo>_<id>.png`
   — tipo: `r` receita · `s` staff · `e` equipamento
   — exemplo: `card_art_e_freezer.png`
4. Acrescenta o `id` ao Set do tipo em `ARTE_PROPRIA`, em `client/main.js`

Enquanto o id não estiver no Set, a carta usa o sprite do ingrediente como antes —
podes ir acrescentando uma a uma, sem partir nada.

## Bloco de estilo (colar sempre antes do prompt)

```
Pixel art 16-bit, estilo consistente com a folha de referência anexada.
Contorno preto-café #2B1B0E de 1px em toda a silhueta.
Paleta quente e saturada, sombreado simples em 3 tons (luz, base, sombra).
Objeto único e centrado, sem texto, sem moldura, sem sombra projetada no chão.
Fundo totalmente liso #FF00FF (magenta puro), sem gradiente nem ruído.
Composição ligeiramente na horizontal (~4:3), o objeto a preencher a área toda.
```

**Nota sobre o ângulo:** os ingredientes são de perfil lateral porque se empilham.
Estas cartas não empilham — objetos e pessoas ficam melhor em **vista de frente ou
3/4**. Mantém o resto do estilo igual.

**Enquadramento:** a janela da arte na carta é ~160×134 px. Desenha com folga à
volta; o jogo encaixa a imagem sem cortar (`object-fit: contain`).

---

# Receitas (`r`)

Combinações de hambúrguer. Mostrar o **resultado montado**, não os ingredientes soltos.

| id | nome | prompt |
|---|---|---|
| `cheese` | Cheeseburger | Um hambúrguer pequeno e simples visto de frente, pão de cima e de baixo, um bife de carne e uma fatia de queijo amarelo a derreter pelas bordas. |
| `classico` | Clássico da Casa | Um hambúrguer completo visto de 3/4: pão, ketchup a escorrer, carne grelhada, queijo derretido e uma folha de alface a sair pelo lado. |
| `salada` | Salada Empilhada | Uma torre só de vegetais sem pão: folha de alface, duas rodelas de tomate e anéis de cebola empilhados, fresca e colorida. |
| `bacon2` | Bacon Lovers | Duas tiras de bacon estaladiço cruzadas em X, brilhantes e onduladas, vistas de cima. |
| `molho3` | Mar de Molho | Três frascos de molho lado a lado (ketchup vermelho, maionese branca, molho especial alaranjado) com um fio de molho a escorrer à frente. |
| `pequeno` | Peq.-Almoço Reforçado | Um ovo estrelado com gema amarela intacta, uma tira de bacon ao lado e uma fatia de queijo por baixo, vistos de cima. |

---

# Staff (`s`)

São **pessoas**. Retratos de meio corpo, com o utensílio ou ingrediente que os
define — a carta tem moldura de crachá, por isso funcionam como fotos de pessoal.

| id | nome | prompt |
|---|---|---|
| `chefbacon` | Chef do Bacon | Cozinheiro de meio corpo com barrete de chef, a segurar uma frigideira com tiras de bacon a fritar, expressão orgulhosa. |
| `horta` | Horta Própria | Pessoa de meio corpo com chapéu de palha e avental, a segurar um cesto de vime cheio de alface e tomates acabados de colher. |
| `estufa` | Estufa Quente | Cozinheiro de meio corpo a apontar um maçarico de cozinha a uma fatia de queijo que derrete, com ondas de calor à volta. |
| `balcao` | Balcão Reforçado | Trabalhador robusto de meio corpo, braços cruzados, encostado a um balcão de aço reforçado com rebites. |
| `maos` | Mãos Rápidas | Cozinheiro de meio corpo com as mãos desfocadas em movimento, várias linhas de velocidade, expressão concentrada. |
| `msecreto` | Molho Secreto | Cozinheiro de meio corpo a piscar o olho, a segurar um frasco escuro sem rótulo com um líquido a brilhar lá dentro. |
| `turno` | Duplo Turno | Cozinheiro de meio corpo com olheiras e um sorriso cansado, a segurar uma caneca de café a fumegar, dois relógios ao fundo. |

---

# Equipamentos (`e`)

Máquinas e mobiliário de cozinha industrial, em metal, vistas de frente ou 3/4.

| id | nome | prompt |
|---|---|---|
| `freezer` | Freezer Novo | Arca congeladora vertical de aço inoxidável, porta fechada com puxador cromado, cristais de gelo nas bordas e um brilho frio azulado. |
| `estante` | Estante Extra | Estante metálica de cozinha industrial com três prateleiras, cheia de tabuleiros e caixas de mantimentos empilhadas. |
| `fornecedor` | Fornecedor Direto | Caixote de madeira de entrega aberto, cheio de mantimentos, com uma etiqueta de preço pendurada e uma seta a apontar para baixo. |

---

# Lendárias (`l`) — M6, ainda não existem

A moldura `card_lendaria.png` já está no acervo (dourada com estrela). Quando o M6
chegar, o mesmo esquema serve: `card_art_l_<id>.png` e um Set `l` em `ARTE_PROPRIA`.

⚠️ A moldura lendária **não tem placa clara** para o texto — o interior é vermelho
escuro de cima a baixo. O nome vai precisar de cor clara nessa carta.
