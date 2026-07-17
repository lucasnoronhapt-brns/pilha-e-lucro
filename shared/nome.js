/* Validação do nome de exibição do ranking — partilhada entre client e servidor
   (o servidor é sempre a autoridade; o client só dá feedback imediato).
   Regras: 3-20 caracteres, uma ou mais palavras, letras/números/espaços e . ' - _
   permitidos; filtro básico de palavrões PT. */

export function normalizarNome(s){
  return String(s||'').trim().replace(/\s+/g,' ');
}

const FORMATO = /^[\p{L}\p{N} .'’_-]{3,20}$/u;

/* filtro básico PT — compara contra o nome sem acentos nem separadores,
   para apanhar "m-e-r-d-a" e afins; lista curta, afinável */
const PALAVROES = [
  'merda','caralho','crlh','foda','fode','fodas','fodase','fodasse','puta','putas',
  'cona','conas','cabrao','cabroes','porra','buceta','paneleiro','paneleira','fdp',
  'pila','picha','broche','brochista','xoxota','arrombado','arrombada','badalhoca',
];

export function nomeValido(nome){
  if(!FORMATO.test(nome)) return false;
  const plano = nome.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g,'')  // tira acentos
    .replace(/[^a-z0-9]/g,'');                        // tira separadores
  return !PALAVROES.some(p=>plano.includes(p));
}
