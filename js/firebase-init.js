/* firebase-init.js
   Initialisiert Firebase und stellt globale Echtzeit-Konfiguration bereit.
   Das Spiel liest Gewichte + Events von hier — Admin-Seite schreibt sie.

   Zusätzlich: Spieler-Persistenz (anonyme Auth, Guthaben, Name, Geräteinfo)
   und pro-Spieler-Events (Admin kann EINEN bestimmten Spieler gezielt
   ansteuern, nicht nur alle gleichzeitig). */

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
   Spieler). Ist das Spieler-Event gesetzt (≠ "normal"), hat es Vorrang —
   damit kann der Admin gezielt ein einzelnes Gerät ansteuern. */
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

    window._fbRef = ref; /* für engine.js's Event-Reset */

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
   SPIELER-PERSISTENZ: Guthaben, Name, Geräteinfo, gezielte Events
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

/* Öffentliche IP über kostenlosen Drittanbieter-Dienst (ipify) ermitteln.
   Kein API-Key nötig. Schlägt die Anfrage fehl (Offline, Blocker, etc.),
   wird einfach "unbekannt" gespeichert — kein Blocker für das Spiel. */
function _fetchIP(){
  return fetch("https://api.ipify.org?format=json")
    .then(r => r.json()).then(d => d.ip)
    .catch(() => "unbekannt");
}

/* Grobe, freundliche Geräte-/Browser-Erkennung aus dem User-Agent.
   Browser geben aus Datenschutzgründen keinen echten Gerätenamen
   (z.B. "Jonas-iPhone") heraus — das hier ist die bestmögliche Annäherung. */
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

/* Sammelt alle verfügbaren, nicht-invasiven Geräte-Metadaten */
function _collectDeviceInfo(){
  return {
    userAgent: navigator.userAgent,
    device:    _parseDevice(navigator.userAgent),
    language:  navigator.language || "?",
    timezone:  (Intl.DateTimeFormat().resolvedOptions().timeZone) || "?",
    screen:    screen.width+"x"+screen.height
  };
}

/* ── Namensabfrage beim allerersten Besuch ──
   Modal wird dynamisch erzeugt (gleiches Muster wie showBrokeModal in
   engine.js). "Ohne Namen"-Option verhindert, dass jemand ausgesperrt wird. */
function _showNamePrompt(onSubmit){
  let ov = document.getElementById('nameov');
  if(!ov){
    ov = document.createElement('div');
    ov.id = 'nameov'; ov.className = 'ov';
    ov.innerHTML = `
      <div id="namebox">
        <div id="nameicon">👋</div>
        <div id="nametitle">Willkommen!</div>
        <div id="namemsg">Wie dürfen wir dich nennen?</div>
        <input type="text" id="nameinput" maxlength="24" placeholder="Dein Name">
        <div id="namebtns">
          <button id="nameSkip" class="brokebtn brokebtn-no">Ohne Namen</button>
          <button id="nameOk"   class="brokebtn brokebtn-yes">Los geht's</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
  }
  ov.classList.add('open');
  const input = document.getElementById('nameinput');
  setTimeout(()=>input.focus(), 150);

  const finish = (name) => {
    ov.classList.remove('open');
    onSubmit(name);
  };
  document.getElementById('nameOk').onclick   = () => finish(input.value.trim() || "Gast");
  document.getElementById('nameSkip').onclick = () => finish("Gast");
  input.onkeydown = (e) => { if(e.key === "Enter") finish(input.value.trim() || "Gast"); };
}

function initPlayerPersistence(){
  try{
    firebase.auth().signInAnonymously().catch(e=>console.warn("Anon-Auth fehlgeschlagen:",e));
    firebase.auth().onAuthStateChanged(user=>{
      if(!user) return;
      _playerRef = firebase.database().ref("players/"+user.uid);

      /* Pro-Spieler-Event-Listener — läuft unabhängig vom Namen/Erstbesuch */
      _playerRef.on("value", snap=>{
        const d = snap.val();
        if(!d) return;
        _fbPlayerEvent = { nextSpin: d.nextSpin || "normal", forceWild: d.forceWild || null };
        _recomputeEffectiveEvent();
      });
      window._fbPlayerRef = _playerRef; /* für engine.js's Event-Reset */

      _playerRef.once("value").then(snap=>{
        const d = snap.val();

        if(d && d.name){
          /* Wiederkehrender Spieler: Guthaben übernehmen, Metadaten auffrischen */
          if(typeof d.balance==="number" && typeof S!=="undefined"){
            S.bal = d.balance;
            if(typeof ui==="function") ui();
          }
          const info = _collectDeviceInfo();
          _fetchIP().then(ip=>{
            _playerRef.update({...info, ip, lastSeen: Date.now()}).catch(()=>{});
          });
        } else {
          /* Erster Besuch: Name abfragen, dann vollständigen Datensatz anlegen */
          _showNamePrompt(name=>{
            const info = _collectDeviceInfo();
            _fetchIP().then(ip=>{
              _playerRef.set({
                name,
                balance:   (typeof S!=="undefined" ? S.bal : 1000),
                createdAt: Date.now(),
                lastSeen:  Date.now(),
                ip,
                ...info,
                nextSpin:  "normal",
                forceWild: null
              }).catch(()=>{});
            });
          });
        }
      }).catch(e=>console.warn("Spielerdaten laden fehlgeschlagen:",e));
    });
  }catch(e){
    console.warn("Spieler-Persistenz nicht verfügbar:",e);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initFirebase();
  initPlayerPersistence();
});
