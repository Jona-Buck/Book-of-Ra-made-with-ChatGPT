let REELS=[];
function buildReels(){
  REELS=[];G=[];
  for(let r=0;r<5;r++){
    const el=document.getElementById('r'+r);
    const rc=new RC(el,r);
    G.push(rc.syms.slice());
    REELS.push(rc);
  }
}

function resizeAll(){REELS.forEach(rc=>rc.resize());}
window.addEventListener('resize',resizeAll);

/* ── Display ── */
function fmt(n){return n.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});}
function ui(){
  const tot=S.ln*BETS[S.bi]; /* S.ln fixed at 10 — total stake per spin */
  document.getElementById('dbal').textContent=fmt(S.bal);
  document.getElementById('dwin').textContent=fmt(S.win);
  document.getElementById('dbt').textContent=fmt(tot);
}
function flashE(id){const e=document.getElementById(id);e.classList.add('err');setTimeout(()=>e.classList.remove('err'),500);}

/* ── SPIN ── */
/* ── SPIN CHAIN ──────────────────────────────────────────────────────────────
   All reels start fast simultaneously (equal pixel speed).
   Stops chain sequentially: reel 0 → gap → reel 1 → gap → ...
   TENSION: if 2+ Books visible on stopped reels, remaining reels use
   TENSION_DECEL (slow, dramatic) instead of NORMAL_DECEL.             */
const INIT_MS    = 650;   /* ms all reels spin before any stops        */
const NORMAL_DECEL=480;   /* ms for normal reel stop animation         */
const TENSION_DECEL=1400; /* ms for dramatic tension stop              */
const STOP_GAP   = 200;   /* ms pause between consecutive reel stops   */

function chainStop(r,fg,done){
  if(r>=5)return;

  /* Count books on already-settled reels */
  let books=0;
  for(let i=0;i<r;i++)
    for(let row=0;row<3;row++)
      if(G[i][row]&&G[i][row].id==='book')books++;
  const tension=(r>=2)&&(books>=2);

  /* Start THIS reel decelerating */
  REELS[r].triggerStop(fg[r],tension,()=>{
    G[r]=[...REELS[r].syms];
    if(r===4) done(); /* last reel settled → all done */
  });

  /* Trigger NEXT reel STOP_GAP ms after THIS reel STARTS (not finishes).
     Tension reels keep the gap so the drama builds visibly. */
  if(r<4){
    const gap=tension?STOP_GAP*4:STOP_GAP;
    setTimeout(()=>chainStop(r+1,fg,done), gap);
  }
}

function spin(){
  if(S.sp)return;
  const bet=S.ln*BETS[S.bi];
  if(!S.fs&&S.bal<bet){flashE('dbal');return;}
  S.sp=true;S.win=0;
  document.getElementById('dwin').classList.remove('won');
  document.getElementById('spin').disabled=true;
  const g5b=document.getElementById('g5050');
  g5b.disabled=true; g5b.classList.remove('ready');
  document.querySelectorAll('.cell.win').forEach(c=>c.classList.remove('win'));
  if(S.fs>0){
    S.fs--;
    document.getElementById('fsc').textContent=S.fs;
    if(!S.fs)document.getElementById('fsb').style.display='none';
  }else S.bal-=bet;
  ui();
  /* Pre-generate all 5 results.
     Special symbols (book/exp/scarab/isis) may appear max ONCE per reel column. */
  const SPECIAL=new Set(['book','exp','scarab','isis']);
  function rndReel(){
    const used=new Set(), col=[];
    for(let i=0;i<3;i++){
      /* Free-spin wild: whole column can be wild (expanding) */
      if(S.fs&&S.fsym&&Math.random()<.28){col.push(S.fsym);continue;}
      let sym, tries=0;
      do{ sym=rnd(); tries++; }
      while(SPECIAL.has(sym.id)&&used.has(sym.id)&&tries<30);
      if(SPECIAL.has(sym.id)) used.add(sym.id);
      col.push(sym);
    }
    return col;
  }
  const fg=Array.from({length:5},rndReel);
  /* Start all reels fast simultaneously */
  REELS.forEach(rc=>rc.startFastSpin());
  /* After initial fast spin, chain the stops */
  setTimeout(()=>chainStop(0,fg,()=>setTimeout(evalW,180)),INIT_MS);
}

function evalW(){
  let tot=0;const bet=BETS[S.bi];
  const winRows=Array.from({length:5},()=>[]);

  /* scatter */
  let sc=0;
  for(let r=0;r<5;r++)for(let row=0;row<3;row++)if(G[r][row].id==='book')sc++;
  if(sc>=3){
    tot+=S.ln*bet*(sc===3?2:sc===4?20:200);
    if(!S.fs){
      S.fs=10;S.fsym=SY[Math.floor(Math.random()*SY.length)];
      document.getElementById('fsc').textContent=10;
      document.getElementById('fss').textContent=S.fsym.n.split(' ')[0];
      document.getElementById('fssi').src=S.fsym.s;
      playFsIntro();
    }
    for(let r=0;r<5;r++)for(let row=0;row<3;row++)
      if(G[r][row].id==='book'&&!winRows[r].includes(row))winRows[r].push(row);
  }

  /* paylines */
  for(let l=0;l<S.ln;l++){
    const ln=PL[l];let fi=G[0][ln[0]];
    if(fi.id==='book'&&G[1][ln[1]].id!=='book')fi=G[1][ln[1]];
    if(fi.id==='book'){
      let c=0;for(let r=0;r<5;r++){if(G[r][ln[r]].id==='book')c++;else break;}
      if(c>=3){tot+=fi.pay[c]*bet;for(let r=0;r<c;r++)if(!winRows[r].includes(ln[r]))winRows[r].push(ln[r]);}
      continue;
    }
    let cnt=0;for(let r=0;r<5;r++){if(G[r][ln[r]].id===fi.id||G[r][ln[r]].id==='book')cnt++;else break;}
    if(cnt>=3){
      tot+=(fi.pay[cnt]||0)*bet;
      for(let r=0;r<cnt;r++)if(!winRows[r].includes(ln[r]))winRows[r].push(ln[r]);
    }
  }

  if(tot>0){
    S.win=tot;S.bal+=tot;
    document.getElementById('dwin').classList.add('won');
    for(let r=0;r<5;r++)if(winRows[r].length)REELS[r].startWin(winRows[r]);
    if(S.fs&&S.fsym)
      for(let r=0;r<5;r++)if(G[r].some(s=>s.id===S.fsym.id))REELS[r].startWin([0,1,2]);
  }

  ui();S.sp=false;document.getElementById('spin').disabled=false;

  /* Enable the 50/50 action button only when there's a win to gamble,
     and not during free spins or autoplay (keeps those flows clean). */
  const g5=document.getElementById('g5050');
  if(tot>0&&!S.fs&&!S.auto){
    g5.disabled=false; g5.classList.add('ready');
  }else{
    g5.disabled=true; g5.classList.remove('ready');
  }
  if(S.auto&&S.aN>0){
    S.aN--;
    if(S.aN>0&&S.bal>=S.ln*BETS[S.bi])setTimeout(spin,550);
    else{S.auto=false;document.getElementById('auto').classList.remove('on');}
  }
}

/* ── GAMBLE ── */
const SUITS=[9829,9830,9824,9827];let gSt=0,gAct=false,gGen=0;

/* Animated count-up for the stake display — feels alive, not a static swap */