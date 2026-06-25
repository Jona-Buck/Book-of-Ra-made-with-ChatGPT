function animateStake(from,to,dur){
  const el=document.getElementById('gmst');
  const t0=performance.now();
  function step(now){
    const t=Math.min((now-t0)/dur,1);
    const eased=1-Math.pow(1-t,3); /* easeOutCubic */
    el.textContent=fmt(from+(to-from)*eased)+' \u20ac';
    if(t<1)requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* Gold spark burst — small particles flying outward from the card */
function spawnSparks(container,n,colorWin){
  for(let i=0;i<n;i++){
    const s=document.createElement('div');
    s.className='gm-spark';
    const ang=Math.random()*Math.PI*2;
    const dist=40+Math.random()*50;
    s.style.setProperty('--dx',Math.cos(ang)*dist+'px');
    s.style.setProperty('--dy',Math.sin(ang)*dist+'px');
    s.style.animationDelay=(Math.random()*0.08)+'s';
    if(!colorWin){
      s.style.background='radial-gradient(circle,#FF6050,#A01010 70%,transparent)';
    }
    container.appendChild(s);
    setTimeout(()=>s.remove(),900);
  }
}

function openGm(a){
  gSt=a;gAct=true;gGen++;
  document.getElementById('gmst').textContent=fmt(gSt)+' \u20ac';
  const card =document.getElementById('gmcard');
  const back =document.getElementById('gmback');
  const stage=document.getElementById('gmstage');
  card.classList.remove('flipped');
  stage.classList.remove('wiggle','shake');
  back.classList.remove('is-red','is-black','win-pulse');
  back.innerHTML='';
  document.getElementById('gmres').textContent='';
  document.getElementById('gmov').classList.add('open');
}

function doGm(red){
  if(!gAct)return;gAct=false;
  const myGen=gGen; /* snapshot — if overlay closes/reopens, stale timeouts abort */

  const card =document.getElementById('gmcard');
  const back =document.getElementById('gmback');
  const stage=document.getElementById('gmstage');
  const r    =document.getElementById('gmres');
  r.textContent='';

  /* Phase 1: brief anticipation wiggle (card still face-down) ── 550ms */
  stage.classList.add('wiggle');

  setTimeout(()=>{
    if(myGen!==gGen)return; /* overlay was closed/reset — abort stale chain */
    stage.classList.remove('wiggle');

    /* Phase 2: determine result, paint the back face, then flip ── */
    const idx=Math.floor(Math.random()*4),isR=idx<2;
    back.innerHTML='&#'+SUITS[idx]+';';
    back.classList.add(isR?'is-red':'is-black');
    card.classList.add('flipped');

    /* Phase 3: after the flip settles (550ms), reveal outcome ── */
    setTimeout(()=>{
      if(myGen!==gGen)return; /* overlay closed during the flip — abort */
      const won=red===isR;
      if(won){
        const oldStake=gSt;
        S.bal+=gSt; gSt*=2;
        animateStake(oldStake,gSt,450);
        back.classList.add('win-pulse');
        spawnSparks(stage,14,true);
        r.textContent='\u2736 GEWONNEN! Verdoppelt!';
        r.style.color='#60FF50';
        ui();
        setTimeout(()=>{gAct=true;},850);
      }else{
        S.bal-=gSt; S.win=0;
        stage.classList.add('shake');
        spawnSparks(stage,8,false);
        setTimeout(()=>stage.classList.remove('shake'),420);
        r.textContent='\u2717 Verloren';
        r.style.color='#FF5050';
        ui();
        setTimeout(closeGm,1500);
      }
    },550);
  },550);
}
/* ── FREE SPINS INTRO: light burst, gold dust, count-up, flip-reveal ── */