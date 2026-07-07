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
let _confirmationResult = null; /* Phone-Auth: laufender SMS-Vorgang */

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
    "auth/invalid-verification-code": "Falscher Code.",
    "auth/invalid-phone-number":      "Ungültige Telefonnummer (mit Ländervorwahl, z.B. +49...).",
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

let _recaptchaVerifier = null;

function _getRecaptcha(){
  /* Wiederverwendbarer Verifier — Neuanlage ohne .clear() der alten Instanz
     wirft "reCAPTCHA has already been rendered" bei jedem erneuten Versuch
     (z.B. nach Tippfehler bei der Nummer) und ließ Telefon-Login lautlos
     scheitern. */
  if(_recaptchaVerifier){
    try{ _recaptchaVerifier.clear(); }catch(e){}
  }
  _recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {size:'invisible'});
  return _recaptchaVerifier;
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
          <button class="authmethod" id="authPhoneShow">📱 Mit Telefonnummer</button>
          <button class="authmethod" id="authEmailShow">✉️ Mit E-Mail</button>
        </div>

        <div id="authPhoneForm" style="display:none">
          <input type="text" id="authName1" maxlength="24" placeholder="Dein Name">
          <input type="tel" id="authPhone" placeholder="+49 151 12345678">
          <button class="authmethod authmethod-go" id="authPhoneSend">Code senden</button>
          <div id="authPhoneCodeWrap" style="display:none">
            <input type="text" id="authPhoneCode" maxlength="6" placeholder="SMS-Code">
            <button class="authmethod authmethod-go" id="authPhoneConfirm">Bestätigen</button>
          </div>
          <div id="recaptcha-container"></div>
          <a href="#" class="authBack">← Zurück</a>
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
    const phoneForm = document.getElementById('authPhoneForm');
    const emailForm = document.getElementById('authEmailForm');

    function backToChoice(){
      phoneForm.style.display = 'none';
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

    document.getElementById('authPhoneShow').onclick = () => {
      choice.style.display = 'none'; phoneForm.style.display = 'block'; _authErr('');
    };
    document.getElementById('authEmailShow').onclick = () => {
      choice.style.display = 'none'; emailForm.style.display = 'block'; _authErr('');
    };

    document.getElementById('authPhoneSend').onclick = () => {
      _authErr('');
      const name  = document.getElementById('authName1').value.trim();
      const phone = document.getElementById('authPhone').value.trim();
      if(!name){ _authErr('Bitte Namen eingeben.'); return; }
      if(!phone){ _authErr('Bitte Telefonnummer eingeben.'); return; }
      try{
        const verifier = _getRecaptcha();
        firebase.auth().signInWithPhoneNumber(phone, verifier)
          .then(res=>{
            _confirmationResult = res;
            document.getElementById('authPhoneCodeWrap').style.display = 'block';
          })
          .catch(e=>{ console.error('Phone signIn error:', e); _authErr(_friendlyAuthError(e)); });
      }catch(e){ console.error('Recaptcha error:', e); _authErr(_friendlyAuthError(e)); }
    };

    document.getElementById('authPhoneConfirm').onclick = () => {
      _authErr('');
      const code = document.getElementById('authPhoneCode').value.trim();
      const name = document.getElementById('authName1').value.trim();
      if(!_confirmationResult){ _authErr('Bitte zuerst Code anfordern.'); return; }
      _confirmationResult.confirm(code)
        .then(result=>{
          ov.classList.remove('open');
          return result.user.updateProfile({displayName:name}).catch(()=>{})
            .then(()=> firebase.database().ref('players/'+result.user.uid).update({name}).catch(()=>{}));
        })
        .catch(e=>_authErr(_friendlyAuthError(e)));
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

/* Erhöhen, um ALLE Spieler beim nächsten Besuch zur erneuten Anmeldung zu
   zwingen (z.B. nach einem Login-Bugfix, um sicherzustellen dass niemand
   in einer alten/fehlerhaften Sitzung hängen bleibt). Jeder Browser wird
   dadurch genau einmal automatisch abgemeldet. */
const AUTH_EPOCH = 2;

function initPlayerPersistence(){
  try{
    const seen = parseInt(localStorage.getItem('authEpochSeen')||'0',10);
    const startListener = () => {
      firebase.auth().onAuthStateChanged(user=>{
        if(user){ _setupPlayer(user); }
        else{ _showAuthPrompt(); }
      });
    };
    if(seen < AUTH_EPOCH){
      localStorage.setItem('authEpochSeen', String(AUTH_EPOCH));
      firebase.auth().signOut().catch(()=>{}).then(startListener);
    } else {
      startListener();
    }
  }catch(e){
    console.warn("Spieler-Persistenz nicht verfügbar:",e);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initFirebase();
  initPlayerPersistence();
});
