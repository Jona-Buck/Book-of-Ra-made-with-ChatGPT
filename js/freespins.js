function spawnDust(container,n){
  for(let i=0;i<n;i++){
    const d=document.createElement('div');
    d.className='fs-dust';
    const ang=Math.random()*Math.PI*2;
    const dist=60+Math.random()*140;
    d.style.setProperty('--dx',Math.cos(ang)*dist+'px');
    d.style.setProperty('--dy',Math.sin(ang)*dist+'px');
    d.style.animationDelay=(Math.random()*0.3)+'s';
    container.appendChild(d);
    setTimeout(()=>d.remove(),1500);
  }
}

function animateCountUp(el,to,dur){
  const t0=performance.now();
  function step(now){
    const t=Math.min((now-t0)/dur,1);
    const eased=1-Math.pow(1-t,3);
    el.textContent=Math.round(to*eased);
    if(t<1)requestAnimationFrame(step);
    else el.textContent=to;
  }
  requestAnimationFrame(step);
}

function playFsIntro(){
  const box=document.getElementById('fsbox');
  const wrap=document.getElementById('fsburstwrap');
  const num=document.getElementById('fsnum');
  const card=document.getElementById('fsflipcard');

  /* Reset state */
  num.textContent='0';
  card.classList.remove('revealed');
  wrap.innerHTML='';

  document.getElementById('fsov').classList.add('open');

  /* Light burst */
  const burst=document.createElement('div');
  burst.className='fs-burst';
  wrap.appendChild(burst);
  setTimeout(()=>burst.remove(),950);

  /* Gold dust */
  spawnDust(wrap,18);

  /* Count up 0 -> 10 */
  animateCountUp(num,10,700);

  /* Flip-reveal the wild symbol shortly after */
  setTimeout(()=>{ card.classList.add('revealed'); },550);
}

function closeGm(){
  gAct=false;gGen++; /* invalidate any in-flight doGm timeout chain */
  document.getElementById('gmov').classList.remove('open');
  document.getElementById('gmcard').classList.remove('flipped');
  document.getElementById('gmstage').classList.remove('shake','wiggle');
}

/* ── PAYTABLE ── */