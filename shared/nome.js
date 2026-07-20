/* Validação do nome de exibição do ranking — partilhada entre client e servidor
   (o servidor é sempre a autoridade; o client só dá feedback imediato).
   Regras: 3-20 caracteres, uma ou mais palavras, letras/números/espaços e . ' - _
   permitidos; filtro básico de palavrões PT; bloqueia frases sobre terceiros
   (ex.: "O Francisco é gay") — um nome de exibição não é uma frase. */

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
  'burro','burra','estupido','estupida','idiota','gay','marica','puto','sida',
];

/* um nome próprio não começa por artigo/conjunção nem contém verbo "ser"/
   conectores — isto é o que apanha "O Francisco é gay" e "E a Clara também"
   sem depender de uma palavra específica na lista de palavrões */
const ARTIGO_INICIAL = new Set(['o','a','os','as','um','uma','esse','essa','este','esta','aquele','aquela']);
const PALAVRA_FRASE = new Set([
  'e','é','eh','sao','são','esta','está','estao','estão','foi','era','sera','será',
  'tambem','também','isto','isso','aquilo','porque','pois','que','nao','não',
]);

function pareceFrase(nomePlano){
  const palavras = nomePlano.split(' ').filter(Boolean);
  if(palavras.length === 0) return false;
  if(ARTIGO_INICIAL.has(palavras[0])) return true;
  return palavras.some(p=>PALAVRA_FRASE.has(p));
}

export function nomeValido(nome){
  if(!FORMATO.test(nome)) return false;
  const semAcentos = nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  if(pareceFrase(semAcentos)) return false;
  const plano = semAcentos.replace(/[^a-z0-9]/g,'');
  return !PALAVROES.some(p=>plano.includes(p));
}
