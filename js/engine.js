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
    /* Gleiche Wahrscheinlichkeiten wie immer — auch während Freispielen.
       Das Expanding Wild entsteht NICHT durch erhöhte Chance, sondern erst
       danach, wenn das gewählte Symbol zufällig auf 3+ Walzen landet. */
    const used=new Set(), col=[];
    for(let i=0;i<3;i++){
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
  let tot=0; const bet=BETS[S.bi];
  const winData=[];
  let fsTrigger=false; /* true wenn Freispiele gerade getriggert */

  /* ── Scatter ── */
  let sc=0;
  for(let r=0;r<5;r++) for(let row=0;row<3;row++) if(G[r][row].id==='book') sc++;
  if(sc>=3){
    const scPay=S.ln*bet*(sc===3?2:sc===4?20:200);
    tot+=scPay;
    const scRows=Array.from({length:5},(_,r)=>{
      const a=[];for(let row=0;row<3;row++)if(G[r][row].id==='book')a.push(row);return a;
    });
    winData.push({isScatter:true,sym:SY[0],pay:scPay,sc,scRows});
    if(!S.fs){
      fsTrigger=true;
      S.fs=10; { const cand=SY.filter(s=>s.id!=='book'); S.fsym=cand[Math.floor(Math.random()*cand.length)]; }
      document.getElementById('fsc').textContent=10;
      document.getElementById('fss').textContent=S.fsym.n.split(' ')[0];
      document.getElementById('fssi').src=S.fsym.s;
      playFsIntro();
    }
  }

  /* ── Expanding Wild (nur in Freispielen) ──
     Wenn das gewählte Symbol auf ≥3 Walzen erscheint, werden ALLE Zellen
     der betroffenen Walzen auf dieses Symbol gesetzt. G[] wird SOFORT
     aktualisiert (für korrekte Auswertung unten); REELS[r].syms bleibt
     bis zur Morph-Animation unverändert, damit der Spieler den Wandel
     tatsächlich sieht (wie im Original: Seite für Seite, Walze für Walze). */
  let ewReels=[];
  if(S.fs&&S.fsym&&!fsTrigger){
    for(let r=0;r<5;r++) if(G[r].some(s=>s.id===S.fsym.id)) ewReels.push(r);
    if(ewReels.length>=3){
      for(const r of ewReels) G[r]=[S.fsym,S.fsym,S.fsym]; /* nur Logik-Daten */
    }else{
      ewReels=[];
    }
  }

  /* ── Paylines ──
     Buch (book) ist NUR Wild + Scatter — es hat KEINE eigene Linien-Auszahlung
     (die Scatter-Auswertung oben deckt "3+ Bücher" bereits vollständig ab).
     Forscher (exp) zahlt bereits ab 2 Symbolen, alle anderen ab 3 (Original-Regel). */
  for(let l=0;l<S.ln;l++){
    const ln=PL[l];

    /* Führende Bücher überspringen, um das erste "echte" Linien-Symbol zu finden */
    let startR=0;
    while(startR<5 && G[startR][ln[startR]].id==='book') startR++;
    if(startR>=5) continue; /* komplette Linie nur Bücher → bereits über Scatter abgedeckt */

    const fi=G[startR][ln[startR]];
    const MIN = fi.id==='exp' ? 2 : 3;

    let cnt=0;
    for(let r=0;r<5;r++){
      if(G[r][ln[r]].id===fi.id||G[r][ln[r]].id==='book') cnt++;
      else break;
    }
    if(cnt>=MIN){
      const p=(fi.pay[cnt]||0)*bet; tot+=p;
      winData.push({isScatter:false,sym:fi,pay:p,ln,count:cnt});
    }
  }

  /* ── Sofort abschließen ── */
  ui();
  S.sp=false; document.getElementById('spin').disabled=false;
  const g5=document.getElementById('g5050');
  if(tot>0&&!S.fs&&!S.auto){ g5.disabled=false; g5.classList.add('ready'); }
  else { g5.disabled=true; g5.classList.remove('ready'); }

  if(tot>0){
    S.win=tot; S.bal+=tot;
    document.getElementById('dwin').classList.add('won');
  }

  /* Rein visuell, blockiert nie das Spiel:
     1) Falls Expanding Wild getriggert hat → erst die Morph-Animation abspielen
     2) Danach (oder sofort, falls kein Expand) → normale Gewinnlinien-Sequenz */
  if(!fsTrigger){
    const runWinSeq=()=>{
      if(tot>0 && typeof showWinSequence==='function'){
        try{ showWinSequence(winData,tot); }catch(e){ console.error('WinSeq:',e); }
      }
    };
    if(ewReels.length>=3 && typeof playExpandMorph==='function'){
      try{ playExpandMorph(ewReels,S.fsym,runWinSeq); }
      catch(e){ console.error('ExpandMorph:',e); runWinSeq(); }
    }else{
      runWinSeq();
    }
  }

  if(S.auto&&S.aN>0){
    S.aN--;
    if(S.aN>0&&S.bal>=S.ln*BETS[S.bi]) setTimeout(spin,tot>0&&!fsTrigger?3200:550);
    else{ S.auto=false; document.getElementById('auto').classList.remove('on'); }
  }
}

/* ── GAMBLE ── */
const SUITS=[9829,9830,9824,9827];let gSt=0,gAct=false,gGen=0;

/* Animated count-up for the stake display — feels alive, not a static swap */