/* PRNG determinístico — única fonte de acaso permitida na lógica de jogo.
   Math.random() é proibido no engine (regra de segurança do CLAUDE.md). */

export function mulberry32(seed){
  let a = seed >>> 0;
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Fisher-Yates in-place com um rnd fornecido (mesma lógica do shuffle do v0.2) */
export function shuffleSeeded(a, rnd){
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(rnd()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}
