/* Copia o engine e o shared/nome.js para functions/_shared/ antes do deploy.
   A fonte de verdade continua a ser engine/ na raiz (regra 5 do CLAUDE.md);
   _shared/ é GERADO — não editar à mão. Correr: npm run sync:supabase */

import { cp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..', '..');
const DEST = path.join(AQUI, 'functions', '_shared');

await mkdir(DEST, { recursive: true });
await cp(path.join(RAIZ, 'engine'), path.join(DEST, 'engine'), { recursive: true });
await mkdir(path.join(DEST, 'shared'), { recursive: true });
await cp(path.join(RAIZ, 'shared', 'nome.js'), path.join(DEST, 'shared', 'nome.js'));
await writeFile(path.join(DEST, 'LEIA-ME.txt'),
  'Pasta GERADA por sync-shared.mjs a partir de engine/ e shared/ na raiz.\nNão editar aqui — editar na raiz e voltar a correr npm run sync:supabase.\n');
console.log('engine/ e shared/nome.js sincronizados para', DEST);
