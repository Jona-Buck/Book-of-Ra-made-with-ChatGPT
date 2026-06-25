function buildPT(){
  const c=document.getElementById('ptrows');c.innerHTML='';
  SY.forEach(sym=>{
    const row=document.createElement('div');row.className='ptr';
    const si=document.createElement('div');si.className='pti';
    const im=document.createElement('img');im.src=sym.s;si.appendChild(im);row.appendChild(si);
    const nm=document.createElement('div');nm.className='ptn';nm.textContent=sym.n;row.appendChild(nm);
    const pp=document.createElement('div');pp.className='ptp';
    pp.innerHTML='<span>\u00d7<b>'+sym.pay[3]+'</b></span><span>\u00d7<b>'+sym.pay[4]+'</b></span><span>\u00d7<b>'+sym.pay[5]+'</b></span>';
    row.appendChild(pp);c.appendChild(row);
  });
}

/* ── CONTROLS ── */
document.getElementById('bm').onclick=()=>{if(S.bi>0){S.bi--;ui();}};
document.getElementById('bp').onclick=()=>{if(S.bi<BETS.length-1){S.bi++;ui();}};
document.getElementById('spin').onclick=spin;
document.getElementById('auto').onclick=()=>{
  if(S.auto){S.auto=false;S.aN=0;document.getElementById('auto').classList.remove('on');}
  else{S.auto=true;S.aN=25;document.getElementById('auto').classList.add('on');if(!S.sp)spin();}
};
document.getElementById('g5050').onclick=()=>{
  const g5=document.getElementById('g5050');
  if(g5.disabled||S.win<=0||S.sp)return;
  g5.disabled=true; g5.classList.remove('ready');
  openGm(S.win);
};
document.getElementById('ib').onclick=()=>{buildPT();document.getElementById('ptov').classList.add('open');};
document.getElementById('ptx').onclick=()=>document.getElementById('ptov').classList.remove('open');
document.getElementById('ptov').onclick=e=>{if(e.target===e.currentTarget)e.currentTarget.classList.remove('open');};
document.getElementById('gmr').onclick=()=>doGm(true);
document.getElementById('gmbl').onclick=()=>doGm(false);
document.getElementById('gmtk').onclick=closeGm;
document.getElementById('gmx').onclick=closeGm;
document.getElementById('fsok').onclick=()=>{
  document.getElementById('fsov').classList.remove('open');
  document.getElementById('fsb').style.display='block';
};
document.getElementById('snd').onclick=function(){
  this.style.color=(this.style.color==='#F0CB50')?'':'#F0CB50';
};
document.addEventListener('keydown',e=>{
  if(e.code==='Space'){e.preventDefault();spin();}
  if(e.key==='Escape'){document.getElementById('ptov').classList.remove('open');closeGm();}
});

/* ── INIT: pre-load images THEN build canvas reels ── */
preloadAll(()=>{
  buildReels();
  ui();
});

