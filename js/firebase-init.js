/* firebase-init.js
   Initialisiert Firebase und stellt globale Echtzeit-Konfiguration bereit.
   Das Spiel liest Gewichte + Events von hier — Admin-Seite schreibt sie. */

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
  nextSpin:  "normal",   /* "normal" | "freeSpins" | "bigWin" | "expandWild" */
  forceWild: null,       /* Symbol-ID für Force-Wild */
  connected: false
};

function initFirebase() {
  try {
    firebase.initializeApp(FIREBASE_CFG);
    const db  = firebase.database();
    const ref = db.ref("gameConfig");

    /* Schreibe Defaults wenn noch nichts in DB steht */
    ref.once("value").then(snap => {
      if (!snap.exists()) {
        ref.set({
          weights:  DEFAULT_WEIGHTS,
          nextSpin: "normal",
          forceWild: null
        });
      }
    });

    /* Ref global verfügbar machen damit engine.js Events zurücksetzen kann */
    window._fbRef = ref;

    /* Live-Listener: jede Änderung vom Admin kommt hier an */
    ref.on("value", snap => {
      const d = snap.val();
      if (!d) return;
      if (d.weights)  window.FB_STATE.weights   = {...DEFAULT_WEIGHTS, ...d.weights};
      if (d.nextSpin) window.FB_STATE.nextSpin  = d.nextSpin;
      window.FB_STATE.forceWild  = d.forceWild  || null;
      window.FB_STATE.connected  = true;
      /* Dispatch Event damit das Spiel reagieren kann */
      window.dispatchEvent(new CustomEvent("fbUpdate", {detail: window.FB_STATE}));
    });

    console.log("✅ Firebase verbunden");
  } catch(e) {
    console.warn("Firebase nicht verfügbar, Fallback auf Defaults:", e);
  }
}

document.addEventListener("DOMContentLoaded", initFirebase);
