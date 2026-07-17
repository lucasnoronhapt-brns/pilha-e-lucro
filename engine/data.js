/* Dados do jogo — copiados verbatim do pilha_e_lucro_v0_2.html.
   Módulo puro: sem DOM, sem estado mutável (POOL é construído uma vez). */

/* vida = rondas até estragar (M3): frescos 2-3, estáveis 5-6;
   sem vida = conserva, nunca estraga (picles, ketchup, maionese) */
export const ING = {
  carne:{n:'Carne',chips:22,cat:'proteina',peso:1,vida:5},
  frango:{n:'Frango',chips:18,cat:'proteina',peso:1,vida:5},
  bacon:{n:'Bacon',chips:14,cat:'proteina',peso:1,vida:5},
  ovo:{n:'Ovo',chips:12,cat:'proteina',peso:1,vida:5},
  queijo:{n:'Queijo',chips:10,cat:'laticinio',peso:1,vida:5,spr:'queijo_frio'},
  alface:{n:'Alface',chips:8,cat:'fresco',peso:1,vida:2},
  tomate:{n:'Tomate',chips:8,cat:'fresco',peso:1,vida:2},
  cebola:{n:'Cebola',chips:7,cat:'fresco',peso:2,vida:3},
  picles:{n:'Picles',chips:6,cat:'fresco',peso:1},
  ketchup:{n:'Ketchup',chips:5,cat:'molho',peso:2},
  maionese:{n:'Maionese',chips:5,cat:'molho',peso:2},
  molho_especial:{n:'M. Especial',chips:9,cat:'molho',peso:2,vida:6},
};

export const POOL = [];
for(const k in ING){ const w = ING[k].cat==='molho'?4:3; for(let i=0;i<w;i++) POOL.push(k); }

export const RECEITAS = [
  {id:'cheese', n:'Cheeseburger', d:'carne → queijo seguidos: +20 fichas', seq:['carne','queijo'], chips:20, preco:0, icon:'queijo_frio'},
  {id:'classico', n:'Clássico da Casa', d:'ketchup → carne → queijo → alface: +2 mult', seq:['ketchup','carne','queijo','alface'], mult:2, preco:5, icon:'carne'},
  {id:'salada', n:'Salada Empilhada', d:'alface → tomate → cebola: +25 fichas', seq:['alface','tomate','cebola'], chips:25, preco:4, icon:'tomate'},
  {id:'bacon2', n:'Bacon Lovers', d:'2+ bacons no burger: +2 mult', count:['bacon',2], mult:2, preco:5, icon:'bacon'},
  {id:'molho3', n:'Mar de Molho', d:'3+ molhos no burger: +30 fichas', countCat:['molho',3], chips:30, preco:4, icon:'molho_especial'},
  {id:'pequeno', n:'Peq.-Almoço Reforçado', d:'ovo → bacon → queijo: +2.5 mult', seq:['ovo','bacon','queijo'], mult:2.5, preco:6, icon:'ovo'},
];

export const STAFF = [
  {id:'chefbacon', n:'Chef do Bacon', d:'cada bacon dá +12 fichas', preco:5, icon:'bacon'},
  {id:'horta', n:'Horta Própria', d:'cada fresco dá +5 fichas', preco:4, icon:'alface'},
  {id:'estufa', n:'Estufa Quente', d:'cada queijo dá +1 mult (mesmo sem carne)', preco:6, icon:'queijo_derretendo'},
  {id:'balcao', n:'Balcão Reforçado', d:'+3 de equilíbrio máximo', preco:5, icon:'pao_base'},
  {id:'maos', n:'Mãos Rápidas', d:'+1 troca por ronda', preco:4, icon:'frango'},
  {id:'msecreto', n:'Molho Secreto', d:'cada molho dá +6 fichas', preco:4, icon:'maionese'},
  {id:'turno', n:'Duplo Turno', d:'+1 serviço por ronda', preco:6, icon:'ovo'},
];

export const ADJ = [
  {e:'🧀', n:'Derretido', d:'queijo logo acima de proteína', b:'+2 mult', m:true},
  {e:'🥖', n:'Base Selada', d:'molho como 1ª camada no pão', b:'+8 fichas'},
  {e:'🥗', n:'Fresquinho', d:'alface e tomate colados', b:'+10 fichas'},
  {e:'🥓', n:'Crocante', d:'bacon e queijo colados', b:'+12 fichas'},
  {e:'👯', n:'Dose Dupla', d:'dois iguais seguidos', b:'+6 fichas'},
  {e:'🍳', n:'Peq.-Almoço', d:'ovo e bacon colados', b:'+1 mult', m:true},
];

export const BOSSES = [
  {n:'🥦 CRÍTICO VEGETARIANO: proteínas dão 0 fichas', f:s=>ING[s].cat==='proteina'},
  {n:'⏱️ CLIENTE APRESSADO: máximo 6 camadas na pilha', cap:6},
  {n:'🧊 SEM FRESCOS HOJE: frescos dão 0 fichas', f:s=>ING[s].cat==='fresco'},
];
