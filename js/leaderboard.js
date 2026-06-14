// Online daily-challenge leaderboard, backed by Firebase Firestore.
// Gracefully degrades to a no-op when FIREBASE_CONFIG (js/firebase-config.js)
// is left unconfigured or the device is offline.
const Leaderboard = (() => {
  const PLAYER_ID_KEY = "knot-escape-player-id";
  const PLAYER_NAME_KEY = "knot-escape-player-name";
  const SDK_VERSION = "10.12.2";

  let dbPromise = null;

  function isConfigured() {
    return !!(
      typeof FIREBASE_CONFIG !== "undefined" &&
      FIREBASE_CONFIG.apiKey &&
      FIREBASE_CONFIG.projectId
    );
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("failed to load " + src));
      document.head.appendChild(s);
    });
  }

  function getDb() {
    if (!isConfigured()) return Promise.resolve(null);
    if (!dbPromise) {
      dbPromise = (async () => {
        try {
          if (!window.firebase) {
            await loadScript(
              `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app-compat.js`
            );
            await loadScript(
              `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore-compat.js`
            );
          }
          if (!window.firebase.apps.length) {
            window.firebase.initializeApp(FIREBASE_CONFIG);
          }
          return window.firebase.firestore();
        } catch (e) {
          return null;
        }
      })();
    }
    return dbPromise;
  }

  function getPlayerId() {
    let id = localStorage.getItem(PLAYER_ID_KEY);
    if (!id) {
      id = "p_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(PLAYER_ID_KEY, id);
    }
    return id;
  }

  function getPlayerName() {
    return localStorage.getItem(PLAYER_NAME_KEY) || "";
  }

  function setPlayerName(name) {
    const trimmed = (name || "").trim().slice(0, 16);
    if (trimmed) localStorage.setItem(PLAYER_NAME_KEY, trimmed);
    else localStorage.removeItem(PLAYER_NAME_KEY);
    return trimmed;
  }

  async function submitDailyScore(dateKey, score, timeMs, hearts) {
    if (!isConfigured()) return false;
    const db = await getDb();
    if (!db) return false;
    const name = getPlayerName() || "Oyuncu";
    const id = getPlayerId();
    try {
      const ref = db
        .collection("daily_scores")
        .doc(dateKey)
        .collection("entries")
        .doc(id);
      const existing = await ref.get();
      if (existing.exists && existing.data().score >= score) return true;
      await ref.set({
        name,
        score: Math.round(score),
        timeMs: Math.round(timeMs),
        hearts,
        updatedAt: Date.now(),
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  async function fetchDailyLeaderboard(dateKey, limit) {
    if (!isConfigured()) return null;
    const db = await getDb();
    if (!db) return null;
    try {
      const snap = await db
        .collection("daily_scores")
        .doc(dateKey)
        .collection("entries")
        .orderBy("score", "desc")
        .limit(limit || 10)
        .get();
      return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      return null;
    }
  }

  return {
    isConfigured,
    getPlayerId,
    getPlayerName,
    setPlayerName,
    submitDailyScore,
    fetchDailyLeaderboard,
  };
})();
