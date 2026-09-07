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
  if(typeof saveBalance==='function') saveBalance(S.bal);
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
  const tension=(r>=2)&&(books>=2)&&!window._skipSpin; /* Skip überspringt auch die Tension-Dramatik */

  /* Start THIS reel decelerating */
  REELS[r].triggerStop(fg[r],tension,()=>{
    G[r]=[...REELS[r].syms];
    if(r===4) done(); /* last reel settled → all done */
  });

  /* Trigger NEXT reel STOP_GAP ms after THIS reel STARTS (not finishes).
     Tension reels keep the gap so the drama builds visibly.
     Turbo-Modus verkürzt den Gap grundsätzlich; aktiver Skip verkürzt ihn
     zusätzlich noch weiter (die beiden Effekte stapeln sich). */
  if(r<4){
    let gap=tension?STOP_GAP*4:STOP_GAP;
    if(S.turbo) gap=gap/TURBO_STOP_MULT;
    if(window._skipSpin) gap=Math.max(30,gap/SKIP_TIME_MULT);
    setTimeout(()=>chainStop(r+1,fg,done), Math.round(gap));
  }
}

function spin(){
  if(S.sp){ skipCurrentSpin(); return; }
  window._skipSpin=false; /* frischer Spin startet immer ungeskippt */
  if(typeof forceCloseWinUI==='function') forceCloseWinUI(); /* alte Gewinnlinien/Zähler/Lottie sofort beenden */
  const bet=S.ln*BETS[S.bi];
  if(!S.fs&&S.bal<bet){
    flashE('dbal');
    if(S.auto){ S.auto=false; document.getElementById('auto').classList.remove('on'); }
    showBrokeModal();
    return;
  }
  S.sp=true;S.win=0;
  document.getElementById('dwin').classList.remove('won');
  /* Button bleibt WÄHREND jedes Spins aktiv (Normal wie Turbo) — ein
     erneuter Klick skippt immer den laufenden Spin (siehe skipCurrentSpin()).
     Ein disabled-Button würde diesen Klick gar nicht erst registrieren. */
  document.getElementById('spin').disabled=false;
  const g5b=document.getElementById('g5050');
  g5b.disabled=true; g5b.classList.remove('ready');
  document.querySelectorAll('.cell.win').forEach(c=>c.classList.remove('win'));
  if(S.fs>0){
    S.fs--;
    document.getElementById('fsc').textContent=S.fs;
    if(!S.fs)document.getElementById('fsb').style.display='none';
  }else S.bal-=bet;
  ui();
  /* Firebase-Live-Gewichte übernehmen wenn verfügbar */
  if(window.FB_STATE?.connected && window.FB_STATE.weights){
    const fw = window.FB_STATE.weights;
    SY.forEach(s=>{ if(fw[s.id]!==undefined) s.w=fw[s.id]; });
  }

  /* Firebase-Event prüfen */
  const fbEvent = window.FB_STATE?.nextSpin || 'normal';

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
  let fg;
  const _fbReset=()=>{
    if(window.FB_STATE) window.FB_STATE.nextSpin='normal';
    if(window._fbRef) window._fbRef.update({nextSpin:'normal',forceWild:null});
    if(window._fbPlayerRef) window._fbPlayerRef.update({nextSpin:'normal',forceWild:null});
  };

  if(fbEvent==='threeBooks'){
    /* 3 Bücher auf 3 zufälligen Walzen / zufälligen Reihen — Rest normal */
    fg=Array.from({length:5},rndReel);
    const bookSy=SY.find(s=>s.id==='book');
    const reels=[0,1,2,3,4].sort(()=>Math.random()-.5).slice(0,3);
    reels.forEach(r=>{ const row=Math.floor(Math.random()*3); fg[r][row]=bookSy; });
    _fbReset();

  } else if(fbEvent==='forceSym'){
    /* Ganzer Spin = ein bestimmtes Symbol auf allen 5 Walzen, alle 3 Reihen */
    const symId=window.FB_STATE?.forceWild||'exp';
    const sym=SY.find(s=>s.id===symId)||SY[1];
    fg=Array.from({length:5},()=>[sym,sym,sym]);
    _fbReset();

  } else if(fbEvent==='legendary'){
    /* Zufällig aussehender Legendary Win:
       Hauptlinie (Reihe 1) = 5× zufälliges Premium-Symbol, Rest normal */
    const premiums=SY.filter(s=>!['A','K','Q','J','ten','book'].includes(s.id));
    const hero=premiums[Math.floor(Math.random()*premiums.length)];
    fg=Array.from({length:5},rndReel);
    fg.forEach(col=>col[1]=hero);
    [0,4].forEach(r=>{ if(Math.random()>.4) fg[r][Math.random()>.5?0:2]=hero; });
    _fbReset();

  } else {
    fg=Array.from({length:5},rndReel);
  }
  /* Start all reels fast simultaneously */
  REELS.forEach(rc=>rc.startFastSpin());
  /* After initial fast spin, chain the stops. window._pendingChainStart lets
     skipCurrentSpin() cancel this wait and start the stop-chain immediately
     if the player clicks Spin again while reels are still fast-spinning. */
  const startChain=()=>{
    window._pendingChainStart=null;
    chainStop(0,fg,()=>setTimeout(evalW, window._skipSpin?0:(S.turbo?Math.round(180/TURBO_STOP_MULT):180)));
  };
  const chainTimer=setTimeout(startChain, S.turbo?Math.round(INIT_MS/TURBO_INIT_MULT):INIT_MS);
  window._pendingChainStart=()=>{ clearTimeout(chainTimer); startChain(); };
}

/* Wird aufgerufen wenn der Spieler während eines laufenden Spins erneut auf
   Spin klickt (Original-Verhalten: kompletter Spin wird sofort zu Ende
   gespielt statt normal auszurollen — Walzenstopp, Expand-Morph und
   Gewinnlinien-Sequenz springen alle direkt zum Endzustand). */
function skipCurrentSpin(){
  window._skipSpin=true;
  if(typeof window._pendingChainStart==='function'){
    window._pendingChainStart();
  }
  /* Aktive Gewinnlinien-Sequenz (falls schon am Laufen) überspringen —
     nutzt den bereits vorhandenen #winskip-Mechanismus aus win.js. */
  document.getElementById('winskip')?.click();
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
      /* Erste Auslösung: neues Sondersymbol bestimmen, volles Intro zeigen */
      fsTrigger=true;
      S.fs=10; { const cand=SY.filter(s=>s.id!=='book'); S.fsym=cand[Math.floor(Math.random()*cand.length)]; }
      document.getElementById('fsc').textContent=10;
      document.getElementById('fss').textContent=S.fsym.n.split(' ')[0];
      document.getElementById('fssi').src=S.fsym.s;
      playFsIntro();
    } else {
      /* Retrigger (Original-Verhalten): +10 Freispiele ONTOP der verbleibenden,
         unbegrenzt oft möglich, das bereits gewählte Sondersymbol bleibt gleich. */
      S.fs+=10;
      document.getElementById('fsc').textContent=S.fs;
      if(typeof playFsRetrigger==='function') playFsRetrigger();
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
  if(typeof trackSpin==='function') trackSpin();
  if(typeof trackBalanceSnapshot==='function') trackBalanceSnapshot(S.bal);
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
    if(S.aN>0&&S.bal>=S.ln*BETS[S.bi]) scheduleNextAutoSpin();
    else{
      S.auto=false; document.getElementById('auto').classList.remove('on');
      if(S.bal<S.ln*BETS[S.bi]) showBrokeModal();
    }
  }
}

/* ── Pleite-Hinweis ──
   Erscheint sobald der aktuelle Einsatz das Guthaben übersteigt (auch bei
   niedrigster Einsatzstufe = "wirklich pleite"). Bietet Reset auf Startguthaben an. */
function showBrokeModal(){
  let ov=document.getElementById('brokeov');
  if(!ov){
    ov=document.createElement('div');
    ov.id='brokeov';
    ov.className='ov';
    ov.innerHTML=`
      <div id="brokebox">
        <div id="brokeicon">💸</div>
        <div id="broketitle">Guthaben aufgebraucht</div>
        <div id="brokemsg">Dein Einsatz übersteigt dein aktuelles Guthaben.<br>Möchtest du dein Guthaben zurücksetzen?</div>
        <div id="brokebtns">
          <button id="brokeCancel" class="brokebtn brokebtn-no">Abbrechen</button>
          <button id="brokeReset" class="brokebtn brokebtn-yes">Zurücksetzen</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    document.getElementById('brokeCancel').onclick=()=>ov.classList.remove('open');
    document.getElementById('brokeReset').onclick=()=>{
      S.bal=1000;
      ui();
      if(typeof saveBalance==='function') saveBalance(S.bal);
      ov.classList.remove('open');
    };
  }
  ov.classList.add('open');
}

/* Wartet bis alle laufenden visuellen Sequenzen (Gewinnlinien, Expand-Morph,
   Freispiel-Intro) wirklich fertig sind, statt mit geraten Zeiten zu arbeiten.
   Das behebt Überlappungen zwischen Autoplay und Animationen, und pausiert
   Autoplay korrekt solange der Spieler noch den Freispiel-Intro bestätigen muss. */
function scheduleNextAutoSpin(){
  const check=()=>{
    if(!S.auto)return; /* Spieler hat Autoplay zwischenzeitlich gestoppt */
    if((window._visualsBusy||0)>0){ setTimeout(check,150); return; }
    setTimeout(spin,400); /* kleiner Puffer nach Ende der letzten Animation */
  };
  setTimeout(check,150);
}

/* ── GAMBLE ── */
const SUITS=[9829,9830,9824,9827];let gSt=0,gAct=false,gGen=0;

/* Animated count-up for the stake display — feels alive, not a static swap */