# Pipeline de arte das cartas: assets/brutos/*.png → assets/sprites/card_art_<icon>.png
# Chroma-key do magenta #FF00FF, crop ao conteúdo, enquadra em quadrado, NEAREST 128px.
# Correr: py assets/processa_card_art.py
import sys
from pathlib import Path
from PIL import Image

# a consola do Windows usa cp1252 e rebenta nos acentos/setas destas mensagens
sys.stdout.reconfigure(encoding='utf-8')

AQUI = Path(__file__).parent
BRUTOS = AQUI / 'brutos'
SPRITES = AQUI / 'sprites'
TAM = 128
MARGEM = 0.03  # 3% de respiro à volta do conteúdo
LARGURA_PILHA = 170  # camadas do hambúrguer: todas com a mesma largura

MAPA = {
    'alface.png': 'alface',
    'bacon.png': 'bacon',
    'catchup.png': 'ketchup',
    'cebola.png': 'cebola',
    'picles.png': 'picles',
    'maionese.png': 'maionese',
    'molho especial.png': 'molho_especial',
    'ovo.png': 'ovo',
    'proteina carne.png': 'carne',
    'proteina frango.png': 'frango',
    'pão base.png': 'pao_base',
    'queijo deretido.png': 'queijo_derretendo',
    'queijo.png': 'queijo_frio',
    'tomate.png': 'tomate',
}

def limpa_sujidade(im):
    """Remove blocos soltos que sobram do chroma-key, sem comer desenho.

    Não chega olhar ao tamanho: as ondas de calor da Estufa têm 14px e são
    legítimas, e os frascos do Mar de Molho estão desligados de propósito.
    Por isso só cai o que estiver solto E for (a) rosado — resíduo de magenta
    que passou à tangente no filtro — ou (b) minúsculo, abaixo de 8px.
    """
    from collections import deque
    px = im.load()
    w, h = im.size
    visto = [[False] * w for _ in range(h)]
    blocos = []
    for y in range(h):
        for x in range(w):
            if visto[y][x]:
                continue
            if px[x, y][3] <= 10:
                visto[y][x] = True
                continue
            fila = deque([(x, y)]); visto[y][x] = True; pts = []
            while fila:
                cx, cy = fila.popleft(); pts.append((cx, cy))
                for dx, dy in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1)):
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < w and 0 <= ny < h and not visto[ny][nx] and px[nx, ny][3] > 10:
                        visto[ny][nx] = True; fila.append((nx, ny))
            blocos.append(pts)
    if len(blocos) <= 1:
        return im, 0
    blocos.sort(key=len, reverse=True)
    apagados = 0
    for bloco in blocos[1:]:
        cores = [px[x, y] for x, y in bloco]
        mr = sum(c[0] for c in cores) // len(cores)
        mg = sum(c[1] for c in cores) // len(cores)
        mb = sum(c[2] for c in cores) // len(cores)
        rosado = mr > 120 and mb > 110 and mg < min(mr, mb) - 25
        if rosado or len(bloco) < 8:
            for x, y in bloco:
                r, g, b, a = px[x, y]; px[x, y] = (r, g, b, 0)
            apagados += len(bloco)
    return im, apagados


def limpa_franja(im):
    """Corrige pixels de magenta que ficam colados ao contorno.

    O chroma_key só apanha magenta forte; nas bordas sobram tons rosados que
    lhe escapam (ex.: verde 134 contra o limite de 130). Como estão ligados ao
    desenho, a limpeza de blocos soltos também não os vê.

    Um rosado com vizinhos rosados é DESENHO (a cebola roxa da Salada), por isso
    só se mexe nos isolados. E não se apaga à toa: apagar no meio do desenho
    abriria furos, portanto só desaparece o que está espetado no vazio (5+
    vizinhos transparentes); o resto é recolorido com a média dos vizinhos.
    """
    px = im.load()
    w, h = im.size

    def rosado(c):
        r, g, b, a = c
        return a > 10 and r > 150 and b > 140 and g < min(r, b) - 40

    VIZ = ((1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1))
    alvos = []
    for y in range(h):
        for x in range(w):
            if not rosado(px[x, y]):
                continue
            viz = [(x + dx, y + dy) for dx, dy in VIZ]
            dentro = [(nx, ny) for nx, ny in viz if 0 <= nx < w and 0 <= ny < h]
            n_rosa = sum(1 for nx, ny in dentro if rosado(px[nx, ny]))
            if n_rosa > 1:
                continue                      # faz parte de uma zona rosada = desenho
            n_transp = len(viz) - len(dentro) + sum(1 for nx, ny in dentro if px[nx, ny][3] <= 10)
            vizinhos_bons = [px[nx, ny] for nx, ny in dentro
                             if px[nx, ny][3] > 200 and not rosado(px[nx, ny])]
            alvos.append((x, y, n_transp, vizinhos_bons))

    apagados = recoloridos = 0
    for x, y, n_transp, bons in alvos:
        if n_transp >= 5 or not bons:
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, 0)
            apagados += 1
        else:
            mr = sum(c[0] for c in bons) // len(bons)
            mg = sum(c[1] for c in bons) // len(bons)
            mb = sum(c[2] for c in bons) // len(bons)
            px[x, y] = (mr, mg, mb, px[x, y][3])
            recoloridos += 1
    return im, apagados, recoloridos


def chroma_key(im):
    im = im.convert('RGBA')
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            # magenta e franjas magenta (r/b altos, g baixo)
            if r > 160 and b > 160 and g < 130 and abs(r - b) < 90:
                px[x, y] = (0, 0, 0, 0)
    return im

for bruto, icon in MAPA.items():
    caminho = BRUTOS / bruto
    if not caminho.exists():
        print(f'AVISO: falta {bruto} — ignorado')
        continue
    im = chroma_key(Image.open(caminho))
    bbox = im.getbbox()
    im = im.crop(bbox)
    # enquadra num quadrado com margem, conteúdo centrado
    lado = int(max(im.size) * (1 + 2 * MARGEM))
    quadro = Image.new('RGBA', (lado, lado), (0, 0, 0, 0))
    quadro.paste(im, ((lado - im.width) // 2, (lado - im.height) // 2))
    final = quadro.resize((TAM, TAM), Image.NEAREST)
    destino = SPRITES / f'card_art_{icon}.png'
    final.save(destino)
    print(f'{bruto} → {destino.name} ({im.width}x{im.height} → {TAM}x{TAM})')

# --- 2ª passagem: arte própria das cartas (receitas/staff/equipamentos) ---
# Estas já vêm de brutos/ com o nome final card_art_<tipo>_<id>.png, por isso
# não precisam de mapa. Ao contrário dos ingredientes NÃO são forçadas a
# quadrado: a janela da carta é horizontal e esticar/preencher desperdiçava
# espaço. Mantém-se a proporção, com o maior lado a TAM.
print()
for caminho in sorted(BRUTOS.glob('card_art_*.png')):
    im = chroma_key(Image.open(caminho))
    im, sujos = limpa_sujidade(im)
    bbox = im.getbbox()
    if not bbox:
        print(f'AVISO: {caminho.name} ficou vazia depois do chroma-key — ignorada')
        continue
    orig = im.size
    im = im.crop(bbox)
    marg = int(max(im.size) * MARGEM)
    quadro = Image.new('RGBA', (im.width + 2 * marg, im.height + 2 * marg), (0, 0, 0, 0))
    quadro.paste(im, (marg, marg))
    escala = TAM / max(quadro.size)
    novo = (max(1, round(quadro.width * escala)), max(1, round(quadro.height * escala)))
    final = quadro.resize(novo, Image.NEAREST)
    # 2ª limpeza já na escala final: o corte dos 8px está calibrado para aqui,
    # e a redução também cria specks novos ao amostrar bordas contaminadas
    final, sujos2 = limpa_sujidade(final)
    final, fr_apag, fr_recol = limpa_franja(final)
    final.save(SPRITES / caminho.name)
    partes = []
    if sujos or sujos2:
        partes.append(f'{sujos + sujos2}px soltos')
    if fr_apag or fr_recol:
        partes.append(f'franja {fr_apag} apagados / {fr_recol} recoloridos')
    extra = '  [' + ', '.join(partes) + ']' if partes else ''
    print(f'{caminho.name}: {orig[0]}x{orig[1]} → {novo[0]}x{novo[1]}{extra}')

# --- 3ª passagem: camadas da pilha (o hambúrguer visto de lado) ---
# Nomear em brutos/ como pilha_<nome>.png; sai em sprites/<nome>.png.
# Estas NÃO são como as cartas: são bandas todas com a mesma largura
# (LARGURA_PILHA), para as camadas encaixarem umas nas outras na pilha.
# A altura é livre — é ela que dá a espessura de cada ingrediente.
print()
for caminho in sorted(BRUTOS.glob('pilha_*.png')):
    nome = caminho.stem[len('pilha_'):]
    im = chroma_key(Image.open(caminho))
    im, _ = limpa_sujidade(im)
    bbox = im.getbbox()
    if not bbox:
        print(f'AVISO: {caminho.name} ficou vazia depois do chroma-key — ignorada')
        continue
    orig = im.size
    im = im.crop(bbox)
    escala = LARGURA_PILHA / im.width
    alvo = (LARGURA_PILHA, max(1, round(im.height * escala)))
    final = im.resize(alvo, Image.NEAREST)
    final, sujos = limpa_sujidade(final)
    final, fr_apag, fr_recol = limpa_franja(final)
    destino = SPRITES / f'{nome}.png'
    extra = f'  [franja {fr_apag}/{fr_recol}]' if (fr_apag or fr_recol) else ''
    final.save(destino)
    print(f'{caminho.name} → {destino.name}: {orig[0]}x{orig[1]} → {alvo[0]}x{alvo[1]}{extra}')
