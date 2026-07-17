# Pipeline de arte das cartas: assets/brutos/*.png → assets/sprites/card_art_<icon>.png
# Chroma-key do magenta #FF00FF, crop ao conteúdo, enquadra em quadrado, NEAREST 128px.
# Correr: py assets/processa_card_art.py
from pathlib import Path
from PIL import Image

AQUI = Path(__file__).parent
BRUTOS = AQUI / 'brutos'
SPRITES = AQUI / 'sprites'
TAM = 128
MARGEM = 0.03  # 3% de respiro à volta do conteúdo

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
