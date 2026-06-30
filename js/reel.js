function preloadAll(cb){
  /* Use img.decode() so the bitmap is fully decoded BEFORE first draw —
     without this, the browser may decode synchronously on first drawImage(),
     causing a visible stutter on the very first spin. */
  const promises=SY.map(sym=>{
    const img=new Image();
    img.src=sym.s;
    return (img.decode?img.decode():Promise.resolve())
      .catch(()=>{})
      .then(()=>{PIMG[sym.id]=img;});
  });
  Promise.all(promises).then(cb);
}

/* Easing: fast linear → smooth brake with natural momentum overshoot.
   easeOutBack (c1=0.7): decelerates, briefly overshoots final position
   (~30% of next symbol visible for ~80-170ms), then gravity pulls back.
   One continuous motion — no programmatic phases. */
/* Smooth easeOutBack — single continuous curve, no hybrid phases.
   Fast start (speed = c1+3 at t=0), smooth deceleration, tiny natural
   overshoot at ~t=0.76 (next symbol briefly visible), settles naturally. */
function ez(t){
  /* easeOutBack c1=0.3: initial speed=3.3, gentle rollout, subtle near-miss */
  const c1=0.3,c3=1.3;
  return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2);
}

/* ══════════════════════════════════════════════
   CANVAS REEL  — all drawing happens here,
   zero DOM manipulation per animation frame
═══════════════════════════════════════════════ */
class RC{
  constructor(el,idx){
    this.el=el;this.idx=idx;
    this.cv=document.createElement('canvas');
    this.cv.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;display:block;';
    el.style.position='relative';
    el.appendChild(this.cv);
    this.ctx=this.cv.getContext('2d',{alpha:true,desynchronized:true});
    this.syms=[rnd(),rnd(),rnd()];
    this.winRows=[];   // which rows glow
    this._anim=null;
    this._win=null;
    this.resize();
  }

  resize(){
    /* Cap DPR at 2 — dpr=3 (some phones) quadruples pixel-fill cost for
       barely-visible sharpness gain. 2x is the sweet spot for perf/quality. */
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const r=this.el.getBoundingClientRect();
    this.W=Math.round(r.width)||160;
    this.H=Math.round(r.height)||450;
    this.cH=this.H/3;
    this.cv.width =Math.round(this.W*dpr);
    this.cv.height=Math.round(this.H*dpr);
    this.cv.style.width =this.W+'px';
    this.cv.style.height=this.H+'px';
    this.ctx.setTransform(dpr,0,0,dpr,0,0);
    this.ctx.imageSmoothingEnabled=true;
    this.ctx.imageSmoothingQuality='medium'; /* 'high' is much slower, barely visible diff at these sizes */
    this._drawStatic(this.syms,0);
  }

  /* draw one symbol into a cell rect */
  _drawSym(ctx,sym,x,y,w,h){
    const img=PIMG[sym.id];
    if(!img||!img.complete||!img.naturalWidth)return;
    /* Round destination coords — avoids slow sub-pixel anti-aliasing per draw */
    const rx=Math.round(x),ry=Math.round(y),rw=Math.round(w),rh=Math.round(h);
    if(sym.fill){
      ctx.drawImage(img,rx,ry,rw,rh);
    }else{
      const sz=Math.round(Math.min(rw,rh)*0.72);
      ctx.drawImage(img,rx+Math.round((rw-sz)/2),ry+Math.round((rh-sz)/2),sz,sz);
    }
  }

  /* draw 3 static symbols + optional win-glow overlay */
  _drawStatic(syms,winAlpha){
    const ctx=this.ctx,W=this.W,cH=this.cH;
    ctx.clearRect(0,0,W,this.H);
    syms.forEach((sym,row)=>this._drawSym(ctx,sym,0,row*cH,W,cH));
    if(winAlpha&&this.winRows.length){
      ctx.fillStyle='rgba(255,210,55,'+winAlpha+')';
      this.winRows.forEach(row=>ctx.fillRect(0,row*cH,W,cH));
    }
  }

  /* pulsing gold glow on winning rows */
  startWin(rows){
    if(this._win)cancelAnimationFrame(this._win);
    this.winRows=rows;
    const self=this,t0=performance.now();
    const go=now=>{
      const a=0.18*(0.5+0.5*Math.sin((now-t0)/600*Math.PI*2));
      self._drawStatic(self.syms,a);
      self._win=requestAnimationFrame(go);
    };
    this._win=requestAnimationFrame(go);
  }

  clearWin(){
    if(this._win){cancelAnimationFrame(this._win);this._win=null;}
    this.winRows=[];
    this._drawStatic(this.syms,0);
  }

  /* snap flash after reel stops */
  _snap(){}   /* no blink */

  /* ── Expanding-Wild Morph: einzelne Reihe von oldSym zu newSym ──
     Erste Hälfte: oldSym schrumpft vertikal auf 0 (wie Buchseite, die sich schließt).
     Zweite Hälfte: newSym wächst vertikal von 0 auf voll (Seite öffnet sich). */
  morphRow(row,newSym,dur,done){
    if(this._anim)cancelAnimationFrame(this._anim);
    if(this._win){cancelAnimationFrame(this._win);this._win=null;}
    const ctx=this.ctx,W=this.W,cH=this.cH,oldSym=this.syms[row],self=this;
    const y=row*cH,t0=performance.now();
    const frame=now=>{
      const t=Math.min((now-t0)/dur,1);
      self._drawStatic(self.syms,0); /* andere Reihen bleiben unverändert sichtbar */
      ctx.save();
      ctx.beginPath();ctx.rect(0,y,W,cH);ctx.clip();
      if(t<0.5){
        const p=t/0.5,sc=Math.max(1-p,0.001);
        ctx.save();ctx.translate(0,y+cH/2);ctx.scale(1,sc);ctx.translate(0,-(y+cH/2));
        self._drawSym(ctx,oldSym,0,y,W,cH);
        ctx.restore();
      }else{
        const p=(t-0.5)/0.5,sc=Math.max(p,0.001);
        ctx.save();ctx.translate(0,y+cH/2);ctx.scale(1,sc);ctx.translate(0,-(y+cH/2));
        self._drawSym(ctx,newSym,0,y,W,cH);
        ctx.restore();
      }
      ctx.restore();
      if(t<1){self._anim=requestAnimationFrame(frame);return;}
      self.syms[row]=newSym;
      self._drawStatic(self.syms,0);
      if(done)done();
    };
    this._anim=requestAnimationFrame(frame);
  }

  /* ── FAST SPIN: constant-speed loop until triggerStop() called ── */
  startFastSpin(){
    if(this._anim)cancelAnimationFrame(this._anim);
    if(this._win) cancelAnimationFrame(this._win);
    this.winRows=[];
    const N=60;
    this._lp=Array.from({length:N},()=>rnd());
    this._lpH=N*this.cH;
    this._lpOff=Math.random()*this._lpH; /* random start → different each spin */
    this._fast=true;
    const PX=2.4; /* px per ms — same for all reels → equal start speed */
    let prev=null;
    this.ctx.imageSmoothingQuality='low'; /* cheap during fast blur-loop */
    const tick=now=>{
      if(!this._fast)return;
      const dt=prev?Math.min(now-prev,33):16;
      prev=now;
      /* DECREASING lpOff → symbols scroll DOWN (matches sy=i*cH-fy below) */
      this._lpOff-=PX*dt;
      if(this._lpOff<0)this._lpOff+=this._lpH;
      this._drawLoopAt(this._lpOff);
      this._anim=requestAnimationFrame(tick);
    };
    this._anim=requestAnimationFrame(tick);
  }

  _drawLoopAt(lpOff){
    const ctx=this.ctx,W=this.W,cH=this.cH,H=this.H,n=this._lp.length;
    ctx.clearRect(0,0,W,H);
    /* lpOff DECREASES over time (wrapped safely >=0) → sy=i*cH-fy
       INCREASES over time → symbols move DOWN, new ones enter from top. */
    const off=((lpOff%this._lpH)+this._lpH)%this._lpH; /* always in [0,lpH) */
    const fc=Math.floor(off/cH);
    const fy=off-fc*cH;
    for(let i=0;i<=Math.ceil(H/cH)+1;i++){
      const ci=(fc+i)%n;  /* PLUS — verified seamless across wrap boundary */
      const sy=i*cH-fy;
      if(sy+cH<0)continue;
      if(sy>H)break;
      this._drawSym(ctx,this._lp[ci],0,sy,W,cH);
    }
  }

  /* ── TRIGGER STOP: decelerate from current loop position to finalSyms ──
     Seamless: strip starts at exact visual state of the loop.
     ez() has easeOutBack → natural near-miss overshoot built-in.        */
  triggerStop(finalSyms,tensionMode,done){
    this._fast=false;
    this.ctx.imageSmoothingQuality='medium'; /* restore quality for the settle */
    if(this._anim){cancelAnimationFrame(this._anim);this._anim=null;}
    const cH=this.cH,n=this._lp.length;
    /* Normalise lpOff (always positive, decreasing trend) */
    const lpOff=((this._lpOff%this._lpH)+this._lpH)%this._lpH;
    const fc=Math.floor(lpOff/cH);
    const fy=lpOff-fc*cH;
    /* curr[0] = symbol at top of canvas, curr[1..3] = below it
       (matches _drawLoopAt's ci=((fc-i)%n+n)%n convention exactly) */
    const curr=Array.from({length:4},(_,i)=>this._lp[(fc+i)%n]);
    const DC=3;
    const strip=[rnd(),...finalSyms,...Array.from({length:DC},()=>rnd()),...curr];
    const startOff=(DC+4)*cH+fy;
    const endOff=cH;
    const totalScroll=startOff-endOff;
    /* Dynamic duration: initial decel speed matches loop speed (4.2px/ms).
       ez() starts at speed = c1+3 = 3.3 in normalised units.
       decelDur = 3.3 * totalScroll / 4.2                               */
    const baseDur=3.3*totalScroll/4.2;
    const decelDur=tensionMode ? baseDur*2.6 : baseDur;
    const ctx=this.ctx,W=this.W,H=this.H,self=this;
    const t0=performance.now();
    const frame=now=>{
      const t=Math.min((now-t0)/decelDur,1);
      const off=startOff+ez(t)*(endOff-startOff);
      ctx.clearRect(0,0,W,H);
      for(let i=0;i<strip.length;i++){
        const sy=i*cH-off;
        if(sy+cH<0)continue;
        if(sy>H)break;
        self._drawSym(ctx,strip[i],0,sy,W,cH);
      }
      if(t<1){self._anim=requestAnimationFrame(frame);return;}
      self.syms=[...finalSyms];
      self._drawStatic(self.syms,0);
      done();
    };
    this._anim=requestAnimationFrame(frame);
  }

}

/* ── REELS: one RC instance per reel column ── */

/* ── Orchestriert die sequentielle Expand-Animation über mehrere Walzen ──
   Walze für Walze (links→rechts), pro Walze alle 3 Reihen leicht versetzt
   (wie umblätternde Buchseiten). Ruft allDone() erst auf, wenn wirklich alles fertig ist. */
function playExpandMorph(reelIdxs,fsym,allDone){
  if(reelIdxs.length===0){ allDone(); return; }
  const ROW_STAGGER=90, MORPH_DUR=260, REEL_GAP=120;
  const perReelTime=ROW_STAGGER*2+MORPH_DUR; /* letzte Reihe startet bei 2*stagger, läuft MORPH_DUR */

  function startReel(i){
    const r=reelIdxs[i];
    for(let row=0;row<3;row++){
      setTimeout(()=>{ REELS[r].morphRow(row,fsym,MORPH_DUR,()=>{}); }, row*ROW_STAGGER);
    }
    if(i<reelIdxs.length-1){
      setTimeout(()=>startReel(i+1), perReelTime+REEL_GAP);
    }else{
      /* Letzte Walze fertig → alle betroffenen Walzen kurz golden aufleuchten lassen */
      setTimeout(()=>{
        reelIdxs.forEach(ri=>REELS[ri].startWin([0,1,2]));
        setTimeout(()=>{
          reelIdxs.forEach(ri=>REELS[ri].clearWin());
          allDone();
        },500);
      },perReelTime+60);
    }
  }
  startReel(0);
}
