
const I={A:"./assets/A.webp",K:"./assets/K.webp",J:"./assets/J.webp",Q:"./assets/Q.webp",ten:"./assets/ten.webp",isis:"./assets/isis.webp",scarab:"./assets/scarab.webp",exp:"./assets/exp.webp",book:"./assets/book.webp"};

const SY=[
  {id:'book',  s:I.book,  n:'Buch (Wild/Scatter)',pay:{3:18,4:180,5:1800},w:2, fill:true},
  {id:'exp',   s:I.exp,   n:'Abenteurer',         pay:{2:5,3:10,4:100,5:1000},w:3, fill:true},
  {id:'isis',  s:I.isis,  n:'Isis',                pay:{3:5,4:50,5:500},  w:4},
  {id:'scarab',s:I.scarab,n:'Skarab\u00e4us',      pay:{3:4,4:40,5:400},  w:5},
  {id:'A',     s:I.A,     n:'Ass',                 pay:{3:2,4:23,5:210},  w:6},
  {id:'K',     s:I.K,     n:'K\u00f6nig',          pay:{3:2,4:21,5:185},  w:7},
  {id:'Q',     s:I.Q,     n:'Dame',                pay:{3:2,4:19,5:160},  w:9},
  {id:'J',     s:I.J,     n:'Bube',                pay:{3:2,4:19,5:160},  w:11},
  {id:'ten',   s:I.ten,   n:'10',                  pay:{3:2,4:16,5:140},  w:18},
]; /* total weight=65 | RTP simuliert: 95.1% (1.5 Mio Spins) | Freispiele ~1:160
     Kartenwerte nach Seltenheit gestaffelt (A>K>Q/J>10) statt einheitlich,
     da bei unabh. Zell-RNG sonst das häufigste Symbol (10) >50% des RTP allein erzeugt. */
const TW=SY.reduce((a,x)=>a+x.w,0);
function rnd(){let r=Math.random()*TW;for(const s of SY){r-=s.w;if(r<=0)return s;}return SY[SY.length-1];}
const PL=[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[1,0,0,0,1],[1,2,2,2,1],[0,0,1,2,2],[2,2,1,0,0],[0,1,0,1,0]];
const BETS=[.1,.2,.5,1,2,5,10],DUR=[1050,1300,1580,1880,2200],FILL=15;
let G=[];
const S={bal:1000,win:0,ln:10,bi:3,sp:false,fs:0,fsym:null,auto:false,aN:0};

/* ── Pre-load all symbol images into Image objects ── */
const PIMG={};