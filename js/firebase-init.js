/* firebase-init.js
   Initialisiert Firebase und stellt globale Echtzeit-Konfiguration bereit.
   Das Spiel liest Gewichte + Events von hier — Admin-Seite schreibt sie.

   Spieler-Identität: Google / Telefonnummer / E-Mail (echte Accounts statt
   freiem Namensfeld — dadurch weiß man wer wirklich dahintersteckt UND
   das Guthaben synchronisiert sich automatisch geräteübergreifend, sobald
   sich jemand mit demselben Account erneut anmeldet). */

const FIREBASE_CFG = {
  apiKey:            "AIzaSyDIbryLvdVvLnsCH72fmNQd_yCTNJdGAsA",
  authDomain:        "book-of-ra-rtp-host.firebaseapp.com",
  databaseURL:       "https://book-of-ra-rtp-host-default-rtdb.firebaseio.com",
  projectId:         "book-of-ra-rtp-host",
  storageBucket:     "book-of-ra-rtp-host.firebasestorage.app",
  messagingSenderId: "945474695262",
  appId:             "1:945474695262:web:417b17edc298df232c04cf"
};

/* Standard-Gewichte (Fallback wenn Firebase nicht erreichbar) */
const DEFAULT_WEIGHTS = {
  book:2, exp:3, isis:4, scarab:5, A:6, K:7, Q:9, J:11, ten:18
};

/* Globaler Live-State — wird vom Spiel gelesen */
window.FB_STATE = {
  weights:   {...DEFAULT_WEIGHTS},
  nextSpin:  "normal",
  forceWild: null,
  connected: false
};

/* ── Effektives Event zusammenführen ──
   Zwei Quellen: globales Event (gameConfig/nextSpin, betrifft ALLE) und
   spieler-spezifisches Event (players/{uid}/nextSpin, betrifft NUR diesen
   Spieler). Ist das Spieler-Event gesetzt (≠ "normal"), hat es Vorrang. */
let _fbGlobalEvent = {nextSpin:"normal", forceWild:null};
let _fbPlayerEvent = {nextSpin:"normal", forceWild:null};

function _recomputeEffectiveEvent(){
  const useP = _fbPlayerEvent.nextSpin && _fbPlayerEvent.nextSpin !== "normal";
  window.FB_STATE.nextSpin  = useP ? _fbPlayerEvent.nextSpin  : _fbGlobalEvent.nextSpin;
  window.FB_STATE.forceWild = useP ? _fbPlayerEvent.forceWild : _fbGlobalEvent.forceWild;
}

/* ── Globale Konfiguration (Gewichte + Alle-Spieler-Events) ── */
function initFirebase() {
  try {
    firebase.initializeApp(FIREBASE_CFG);
    const db  = firebase.database();
    const ref = db.ref("gameConfig");

    ref.once("value").then(snap => {
      if (!snap.exists()) {
        ref.set({ weights: DEFAULT_WEIGHTS, nextSpin: "normal", forceWild: null });
      }
    });

    window._fbRef = ref;

    ref.on("value", snap => {
      const d = snap.val();
      if (!d) return;
      if (d.weights) window.FB_STATE.weights = {...DEFAULT_WEIGHTS, ...d.weights};
      _fbGlobalEvent = { nextSpin: d.nextSpin || "normal", forceWild: d.forceWild || null };
      window.FB_STATE.connected = true;
      _recomputeEffectiveEvent();
      window.dispatchEvent(new CustomEvent("fbUpdate", {detail: window.FB_STATE}));
    });

    console.log("✅ Firebase verbunden");
  } catch(e) {
    console.warn("Firebase nicht verfügbar, Fallback auf Defaults:", e);
  }
}

/* ══════════════════════════════════════════════════════════
   SPIELER-IDENTITÄT & PERSISTENZ
   ══════════════════════════════════════════════════════════ */
let _playerRef = null;
let _saveTimer = null;

function saveBalance(bal){
  if(!_playerRef) return;
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    _playerRef.update({ balance: bal, lastSeen: Date.now() }).catch(()=>{});
  }, 600);
}

function _fetchIP(){
  return fetch("https://api.ipify.org?format=json")
    .then(r => r.json()).then(d => d.ip)
    .catch(() => "unbekannt");
}

function _parseDevice(ua){
  const os = /Windows/.test(ua) ? "Windows"
           : /Android/.test(ua) ? "Android"
           : /iPhone/.test(ua)  ? "iPhone"
           : /iPad/.test(ua)    ? "iPad"
           : /Mac OS/.test(ua)  ? "Mac"
           : /Linux/.test(ua)   ? "Linux" : "Unbekannt";
  const br = /Edg\//.test(ua)    ? "Edge"
           : /OPR\//.test(ua)    ? "Opera"
           : /Chrome\//.test(ua) ? "Chrome"
           : /Firefox\//.test(ua)? "Firefox"
           : /Safari\//.test(ua) ? "Safari" : "Unbekannt";
  return os+" · "+br;
}

function _collectDeviceInfo(){
  return {
    userAgent: navigator.userAgent,
    device:    _parseDevice(navigator.userAgent),
    language:  navigator.language || "?",
    timezone:  (Intl.DateTimeFormat().resolvedOptions().timeZone) || "?",
    screen:    screen.width+"x"+screen.height
  };
}

/* Firebase-Fehlercodes in verständliche deutsche Meldungen übersetzen */
function _friendlyAuthError(e){
  const map = {
    "auth/wrong-password":            "Falsches Passwort.",
    "auth/invalid-email":             "Ungültige E-Mail-Adresse.",
    "auth/weak-password":             "Passwort zu schwach (mind. 6 Zeichen).",
    "auth/too-many-requests":         "Zu viele Versuche. Bitte später erneut probieren.",
    "auth/popup-closed-by-user":      "Anmeldung abgebrochen.",
    "auth/user-not-found":            "Kein Konto mit dieser E-Mail gefunden.",
  };
  return map[e.code] || e.message || "Unbekannter Fehler.";
}

/* ── Spieler-Datensatz anlegen/aktualisieren ──
   Läuft für JEDE Anmeldeart identisch — liest was an Identität verfügbar
   ist (Name, E-Mail, Telefon, Google-Foto) und ergänzt Geräte-Metadaten. */
function _setupPlayer(user, nameOverride){
  _playerRef = firebase.database().ref("players/"+user.uid);
  window._fbPlayerRef = _playerRef;
  _initChatWidget();

  _playerRef.on("value", snap=>{
    const d = snap.val();
    if(!d) return;
    _fbPlayerEvent = { nextSpin: d.nextSpin || "normal", forceWild: d.forceWild || null };
    _recomputeEffectiveEvent();
  });

  const provider = (user.providerData[0] && user.providerData[0].providerId) || "unknown";
  const identity = {
    name:          nameOverride || user.displayName || "Unbenannt",
    authProvider:  provider,
    email:         user.email || null,
    phoneNumber:   user.phoneNumber || null,
    emailVerified: !!user.emailVerified,
    photoURL:      user.photoURL || null
  };

  _playerRef.once("value").then(snap=>{
    const d = snap.val();
    const info = _collectDeviceInfo();

    if(d && typeof d.balance==="number"){
      /* Wiederkehrender Spieler (ggf. neues Gerät!) — Guthaben übernehmen */
      if(typeof S!=="undefined"){ S.bal = d.balance; if(typeof ui==="function") ui(); }
      _fetchIP().then(ip=>{
        _playerRef.update({...identity, ...info, ip, lastSeen: Date.now()}).catch(()=>{});
      });
    } else {
      /* Erster Besuch dieses Accounts — neuen Datensatz anlegen */
      _fetchIP().then(ip=>{
        _playerRef.set({
          ...identity,
          balance:   (typeof S!=="undefined" ? S.bal : 1000),
          createdAt: Date.now(),
          lastSeen:  Date.now(),
          ip, ...info,
          nextSpin:  "normal",
          forceWild: null
        }).catch(()=>{});
      });
    }
  });
}

/* ══════════════════════════════════════════════════════════
   ANMELDE-MODAL: Google / Telefon / E-Mail
   ══════════════════════════════════════════════════════════ */
function _authErr(msg){
  const el = document.getElementById('authError');
  if(el) el.textContent = msg || '';
}

function _showAuthPrompt(){
  let ov = document.getElementById('authov');
  if(!ov){
    ov = document.createElement('div');
    ov.id = 'authov'; ov.className = 'ov';
    ov.innerHTML = `
      <div id="authbox">
        <div id="authicon">🔐</div>
        <div id="authtitle">Willkommen!</div>
        <div id="authmsg">Melde dich an, um zu spielen</div>

        <div id="authChoice">
          <button class="authmethod" id="authGoogleBtn">🔵 Mit Google anmelden</button>
          <button class="authmethod" id="authEmailShow">✉️ Mit E-Mail</button>
        </div>

        <div id="authEmailForm" style="display:none">
          <input type="text" id="authName2" maxlength="24" placeholder="Dein Name">
          <input type="email" id="authEmail" placeholder="E-Mail-Adresse">
          <input type="password" id="authPass" placeholder="Passwort (mind. 6 Zeichen)">
          <button class="authmethod authmethod-go" id="authEmailGo">Anmelden / Registrieren</button>
          <a href="#" class="authBack">← Zurück</a>
        </div>

        <div id="authError"></div>
      </div>`;
    document.body.appendChild(ov);

    const choice = document.getElementById('authChoice');
    const emailForm = document.getElementById('authEmailForm');

    function backToChoice(){
      emailForm.style.display = 'none';
      choice.style.display = 'flex';
      _authErr('');
    }
    ov.querySelectorAll('.authBack').forEach(a=>a.onclick = e=>{ e.preventDefault(); backToChoice(); });

    document.getElementById('authGoogleBtn').onclick = () => {
      _authErr('');
      const provider = new firebase.auth.GoogleAuthProvider();
      firebase.auth().signInWithPopup(provider)
        .then(()=> ov.classList.remove('open'))
        .catch(e=>{ console.error('Google signIn error:', e); _authErr(_friendlyAuthError(e)); });
    };

    document.getElementById('authEmailShow').onclick = () => {
      choice.style.display = 'none'; emailForm.style.display = 'block'; _authErr('');
    };

    document.getElementById('authEmailGo').onclick = () => {
      _authErr('');
      const name  = document.getElementById('authName2').value.trim();
      const email = document.getElementById('authEmail').value.trim();
      const pass  = document.getElementById('authPass').value;
      if(!name){ _authErr('Bitte Namen eingeben.'); return; }
      if(!email || !pass){ _authErr('Bitte E-Mail und Passwort eingeben.'); return; }

      firebase.auth().createUserWithEmailAndPassword(email, pass)
        .then(result=>{
          ov.classList.remove('open');
          result.user.sendEmailVerification().catch(()=>{});
          return result.user.updateProfile({displayName:name}).catch(()=>{})
            .then(()=> firebase.database().ref('players/'+result.user.uid).update({name}).catch(()=>{}));
        })
        .catch(e=>{
          if(e.code === 'auth/email-already-in-use'){
            /* Konto existiert bereits — als Login versuchen (gleiches Modal, kein Toggle nötig) */
            firebase.auth().signInWithEmailAndPassword(email, pass)
              .then(()=> ov.classList.remove('open'))
              .catch(e2=>{ console.error('Email signIn error:', e2); _authErr(_friendlyAuthError(e2)); });
          } else {
            console.error('Email signUp error:', e);
            _authErr(_friendlyAuthError(e));
          }
        });
    };
  }
  ov.classList.add('open');
}

/* ══════════════════════════════════════════════════════════
   STATISTIK-TRACKING (echte Daten für Admin-Dashboard)
   ══════════════════════════════════════════════════════════ */
function trackSpin(){
  const user = firebase.auth().currentUser;
  if(!user || !_playerRef) return;
  const today = new Date().toISOString().slice(0,10); /* YYYY-MM-DD */
  const updates = {};
  updates['players/'+user.uid+'/spinsCount'] = firebase.database.ServerValue.increment(1);
  updates['players/'+user.uid+'/activityByDay/'+today] = firebase.database.ServerValue.increment(1);
  firebase.database().ref().update(updates).catch(()=>{});
}

let _lastLoggedBalance=null;
function trackBalanceSnapshot(bal){
  if(!_playerRef || _lastLoggedBalance===bal) return;
  _lastLoggedBalance=bal;
  _playerRef.child('balanceHistory').push({t:Date.now(),bal}).catch(()=>{});
  if(Math.random()<0.05) _trimBalanceHistory(); /* gelegentlich aufräumen statt bei jedem Eintrag */
}

function _trimBalanceHistory(){
  if(!_playerRef) return;
  _playerRef.child('balanceHistory').once('value').then(snap=>{
    const d=snap.val(); if(!d) return;
    const keys=Object.keys(d).sort(); /* Push-Keys sind chronologisch sortierbar */
    if(keys.length<=200) return;
    const updates={};
    keys.slice(0,keys.length-200).forEach(k=>updates[k]=null);
    _playerRef.child('balanceHistory').update(updates).catch(()=>{});
  }).catch(()=>{});
}

/* ══════════════════════════════════════════════════════════
   SUPPORT-CHAT (Spieler ↔ Admin)
   ══════════════════════════════════════════════════════════ */
function _escChat(s){ return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function _initChatWidget(){
  if(document.getElementById('chatBtn')) return; /* nur einmal aufbauen */

  const btn=document.createElement('button');
  btn.id='chatBtn'; btn.innerHTML='💬<span id="chatBadge"></span>';
  document.body.appendChild(btn);

  const panel=document.createElement('div');
  panel.id='chatPanel';
  panel.innerHTML=`
    <div id="chatHead">💬 Support-Chat <span id="chatClose">✕</span></div>
    <div id="chatMsgs"></div>
    <div id="chatInputRow">
      <input type="text" id="chatInput" placeholder="Nachricht schreiben…" maxlength="500">
      <button id="chatSend">➤</button>
    </div>`;
  document.body.appendChild(panel);

  const badge=document.getElementById('chatBadge');
  let isOpen=false;

  function markRead(){
    if(_playerRef) _playerRef.child('lastReadByPlayer').set(Date.now()).catch(()=>{});
    badge.classList.remove('show');
  }
  function toggle(){
    isOpen=!isOpen;
    panel.classList.toggle('open',isOpen);
    if(isOpen) markRead();
  }
  btn.onclick=toggle;
  document.getElementById('chatClose').onclick=toggle;

  function send(){
    const inp=document.getElementById('chatInput');
    const text=inp.value.trim();
    if(!text||!_playerRef) return;
    _playerRef.child('chat').push({from:'player',text,t:Date.now()}).catch(()=>{});
    inp.value='';
  }
  document.getElementById('chatSend').onclick=send;
  document.getElementById('chatInput').onkeydown=e=>{ if(e.key==='Enter') send(); };

  if(_playerRef){
    _playerRef.child('chat').on('value', snap=>{
      const d=snap.val()||{};
      const msgs=Object.values(d).sort((a,b)=>a.t-b.t);
      const cont=document.getElementById('chatMsgs');
      cont.innerHTML=msgs.map(m=>
        `<div class="chatMsg ${m.from==='admin'?'from-admin':'from-player'}">${_escChat(m.text)}</div>`
      ).join('') || '<div id="chatEmpty">Noch keine Nachrichten. Schreib uns gern!</div>';
      cont.scrollTop=cont.scrollHeight;

      _playerRef.child('lastReadByPlayer').once('value').then(lrSnap=>{
        const lastRead=lrSnap.val()||0;
        const hasUnread=msgs.some(m=>m.from==='admin'&&m.t>lastRead);
        badge.classList.toggle('show', hasUnread && !isOpen);
      });
    });
  }
}

function initPlayerPersistence(){
  try{
    /* Sitzung bleibt über Browser-Neustarts hinweg bestehen — einmal
       anmelden, danach angemeldet bleiben (kein wiederholtes Einloggen). */
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(()=>{});
    firebase.auth().onAuthStateChanged(user=>{
      if(user){ _setupPlayer(user); }
      else{ _showAuthPrompt(); }
    });
  }catch(e){
    console.warn("Spieler-Persistenz nicht verfügbar:",e);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initFirebase();
  initPlayerPersistence();
});
