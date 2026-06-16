const SVG_NS = "http://www.w3.org/2000/svg";
const DIRS = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
};
const MAX_HEARTS = 5;
// How far behind the head a single-cell cord's tail/knot sits, as a
// fraction of the cell size. Kept small so it stays inside the cell.
const TAIL_OFFSET = 0.36;
const STORAGE_KEY = "knot-escape-progress";
const DAILY_KEY = "knot-escape-daily";
const SETTINGS_KEY = "knot-escape-settings";
const STARS_KEY = "knot-escape-stars";
const RECORDS_KEY = "knot-escape-records";
const TUTORIAL_KEY = "knot-escape-tutorial";
const DAILY_CONFIG = { rows: 8, cols: 8, fillTarget: 0.68, maxLen: 6, minLen: 2 };

const state = {
  level: 0,
  arrows: [], // { cells:[[r,c]...], dir, removed, el }
  hearts: MAX_HEARTS,
  geom: null, // layout info for the current board
  mode: "level", // "level" | "daily"
  dailyStart: 0,
  levelStart: 0, // wall-clock start of the current level (for records)
  moveCount: 0, // successful removals this attempt
  history: [], // stack of removed arrows, for undo
  gameClockInterval: null,
  dailyCountdownInterval: null,
  tab: "home", // "home" | "challenge" | "collection" | "settings"
  returnTab: "home",
  settings: { sound: true, vibration: true, dark: false, colors: true },
  stars: new Array(LEVELS.length).fill(0), // best star rating (0-3) per level
  records: new Array(LEVELS.length).fill(null), // best { timeMs, moves } per level
  boardZoom: 1,
  boardPanX: 0,
  boardPanY: 0,
  boardIntroTimer: null,
};

const el = {
  home: document.getElementById("home-screen"),
  challenge: document.getElementById("challenge-screen"),
  collection: document.getElementById("collection-screen"),
  arcadeGame: document.getElementById("arcade-game"),
  settings: document.getElementById("settings-screen"),
  game: document.getElementById("game-screen"),
  splashLevel: document.getElementById("splash-level"),
  levelTitle: document.getElementById("level-title"),
  langSelect: document.getElementById("lang-select"),
  dailyTitle: document.getElementById("daily-title"),
  dailyClock: document.getElementById("daily-clock"),
  hearts: document.getElementById("hearts"),
  board: document.getElementById("board"),
  boardWrap: document.getElementById("board-wrap"),
  winOverlay: document.getElementById("win-overlay"),
  winTitle: document.getElementById("win-title"),
  winStats: document.getElementById("win-stats"),
  winDailyInfo: document.getElementById("win-daily-info"),
  winDailyScore: document.getElementById("win-daily-score"),
  winDailyNext: document.getElementById("win-daily-next"),
  btnNext: document.getElementById("btn-next"),
  loseOverlay: document.getElementById("lose-overlay"),
  btnDaily: document.getElementById("btn-daily"),
  dailyStatus: document.getElementById("daily-status"),
  dailyTimer: document.getElementById("daily-timer"),
  leaderboardCard: document.getElementById("leaderboard-card"),
  leaderboardList: document.getElementById("leaderboard-list"),
  leaderboardEmpty: document.getElementById("leaderboard-empty"),
  lbPlayerName: document.getElementById("lb-player-name"),
  btnEditName: document.getElementById("btn-edit-name"),
  nameOverlay: document.getElementById("name-overlay"),
  nameInput: document.getElementById("name-input"),
  btnNameSave: document.getElementById("btn-name-save"),
  bottomNav: document.getElementById("bottom-nav"),
  navBtns: document.querySelectorAll(".nav-btn"),
  levelGrid: document.getElementById("level-grid"),
  achvGrid: document.getElementById("achv-grid"),
  winStars: document.getElementById("win-stars"),
  app: document.querySelector(".app"),
  toggleSound: document.getElementById("toggle-sound"),
  toggleVibration: document.getElementById("toggle-vibration"),
  toggleDark: document.getElementById("toggle-dark"),
  toggleColors: document.getElementById("toggle-colors"),
  btnResetProgress: document.getElementById("btn-reset-progress"),
  btnRemoveAds: document.getElementById("btn-remove-ads"),
  btnRestorePurchases: document.getElementById("btn-restore-purchases"),
  btnWatchAd: document.getElementById("btn-watch-ad"),
  arcadeBack: document.getElementById("arcade-back"),
  btnHowToPlay: document.getElementById("btn-how-to-play"),
  btnUndo: document.getElementById("btn-undo"),
  btnHint: document.getElementById("btn-hint"),
  winRecords: document.getElementById("win-records"),
  winRecordTime: document.getElementById("win-record-time"),
  winRecordMoves: document.getElementById("win-record-moves"),
  tutorialOverlay: document.getElementById("tutorial-overlay"),
  tutorialEmoji: document.getElementById("tutorial-emoji"),
  tutorialTitle: document.getElementById("tutorial-title"),
  tutorialText: document.getElementById("tutorial-text"),
  tutorialDots: document.getElementById("tutorial-dots"),
  btnTutorialNext: document.getElementById("btn-tutorial-next"),
  continueSec: document.getElementById("continue-section"),
  btnContinue: document.getElementById("btn-continue"),
  continueArt: document.getElementById("continue-art"),
  continueTitle: document.getElementById("continue-title"),
  continueSub: document.getElementById("continue-sub"),
};

// --- Continue Playing card ---
const LAST_PLAYED_KEY = "knot-last-played";
function saveLastPlayed(data) {
  try { localStorage.setItem(LAST_PLAYED_KEY, JSON.stringify(data)); } catch (e) {}
}
function updateContinueCard() {
  let data;
  try { data = JSON.parse(localStorage.getItem(LAST_PLAYED_KEY) || ""); } catch (e) { data = null; }
  if (!data || !el.continueSec) return;
  el.continueArt.textContent = data.emoji || "🪢";
  el.continueTitle.textContent = t(data.nameKey) || data.nameKey;
  el.continueSub.textContent = data.sub || "";
  const accent = data.accent || "#2bb3a3";
  el.btnContinue.style.background = `linear-gradient(135deg, ${accent}, ${accent}bb)`;
  el.btnContinue.style.boxShadow = `0 12px 26px ${accent}44`;
  el.continueSec.classList.remove("hidden");
  el.btnContinue.classList.remove("hidden");
}
el.btnContinue.addEventListener("click", () => {
  playClick();
  let data;
  try { data = JSON.parse(localStorage.getItem(LAST_PLAYED_KEY) || ""); } catch (e) { return; }
  if (!data) return;
  if (data.id === "knot-escape") {
    playLevel(state.level);
  } else {
    const game = (window.ARCADE_GAMES || []).find((g) => g.id === data.id);
    if (game && typeof Arcade !== "undefined") Arcade.openGame(game);
  }
});
// Expose save hook so arcade.js can record the last played mini-game.
window._saveLastPlayedArcade = function (game) {
  saveLastPlayed({ id: game.id, emoji: game.emoji, nameKey: game.nameKey, accent: game.accent || "#2bb3a3", sub: t(game.descKey) || "" });
};
document.getElementById("btn-back").addEventListener("click", () => { playClick(); showTab(state.returnTab); });
document.getElementById("btn-restart").addEventListener("click", () => {
  playClick();
  if (state.mode === "daily") startDaily();
  else playLevel(state.level);
});
el.btnNext.addEventListener("click", () => {
  playClick();
  el.winOverlay.classList.add("hidden");
  if (state.mode !== "daily") {
    state.level = Math.min(state.level + 1, LEVELS.length - 1);
  }
  showTab(state.returnTab);
});
document.getElementById("btn-retry").addEventListener("click", () => {
  playClick();
  el.loseOverlay.classList.add("hidden");
  if (state.mode === "daily") startDaily();
  else playLevel(state.level);
});
el.btnDaily.addEventListener("click", () => { playClick(); startDaily(); });

// Optional rewarded ad: revive with a couple of hearts instead of restarting.
const REVIVE_HEARTS = 2;
el.btnWatchAd.addEventListener("click", async () => {
  playClick();
  el.btnWatchAd.disabled = true;
  const granted = await Ads.showRewarded();
  el.btnWatchAd.disabled = false;
  if (granted) {
    el.loseOverlay.classList.add("hidden");
    state.hearts = REVIVE_HEARTS;
    renderHearts();
    if (state.mode === "daily" && !state.gameClockInterval) {
      state.gameClockInterval = setInterval(() => {
        el.dailyClock.textContent = formatClock(performance.now() - state.dailyStart);
      }, 100);
    }
  } else {
    el.btnWatchAd.textContent = t("not_available_now");
  }
});

el.arcadeBack.addEventListener("click", () => { playClick(); Arcade.closeGame(); });

el.btnRemoveAds.addEventListener("click", async () => {
  playClick();
  if (Ads.isPremium()) { flashSettingsLabel(el.btnRemoveAds, t("ads_removed")); return; }
  const ok = await Ads.purchasePremium();
  flashSettingsLabel(el.btnRemoveAds, ok ? t("ads_removed") : t("not_available_now"));
  if (ok) updatePremiumUi();
});

el.btnRestorePurchases.addEventListener("click", async () => {
  playClick();
  const ok = await Ads.restorePurchases();
  flashSettingsLabel(el.btnRestorePurchases, ok ? t("ads_removed") : t("not_available_now"));
  if (ok) updatePremiumUi();
});

function flashSettingsLabel(btn, msg) {
  const label = btn.querySelector(".settings-label");
  if (!label) return;
  const key = label.getAttribute("data-i18n");
  label.textContent = msg;
  setTimeout(() => { if (key) label.textContent = t(key); }, 1800);
}

function updatePremiumUi() {
  el.btnRemoveAds.classList.toggle("hidden", Ads.isPremium());
}

el.navBtns.forEach((btn) => {
  btn.addEventListener("click", () => { playClick(); showTab(btn.dataset.tab); });
});

el.toggleSound.addEventListener("click", () => {
  state.settings.sound = !state.settings.sound;
  saveSettings();
  applySettings();
  playTone(state.settings.sound ? 720 : 320, 0.08);
});

el.toggleVibration.addEventListener("click", () => {
  state.settings.vibration = !state.settings.vibration;
  saveSettings();
  applySettings();
  vibrate(20);
});

el.toggleDark.addEventListener("click", () => {
  state.settings.dark = !state.settings.dark;
  saveSettings();
  applySettings();
});

el.toggleColors.addEventListener("click", () => {
  state.settings.colors = !state.settings.colors;
  saveSettings();
  applySettings();
  playClick();
});

el.btnResetProgress.addEventListener("click", () => {
  if (!confirm(t("reset_confirm"))) return;
  state.level = 0;
  state.stars.fill(0);
  state.records.fill(null);
  saveProgress();
  saveStars();
  saveRecords();
  el.splashLevel.textContent = t("level_label", { n: 1 });
  renderCollection();
  renderAchievements();
});

el.btnUndo.addEventListener("click", () => { playClick(); undoMove(); });
el.btnHint.addEventListener("click", () => { playClick(); showHint(); });
el.btnHowToPlay.addEventListener("click", () => { playClick(); showTutorial(); });

el.btnEditName.addEventListener("click", () => {
  playClick();
  el.nameInput.value = Leaderboard.getPlayerName();
  el.nameOverlay.classList.remove("hidden");
  el.nameInput.focus();
});

el.btnNameSave.addEventListener("click", () => {
  playClick();
  const name = Leaderboard.setPlayerName(el.nameInput.value);
  el.lbPlayerName.textContent = name || "Adını seç";
  el.nameOverlay.classList.add("hidden");
  refreshLeaderboard();
});

function loadProgress() {
  const saved = parseInt(localStorage.getItem(STORAGE_KEY), 10);
  if (!isNaN(saved) && saved >= 0 && saved < LEVELS.length) state.level = saved;
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, String(state.level));
}

// ---------- Stars & achievements ----------

function loadStars() {
  try {
    const raw = JSON.parse(localStorage.getItem(STARS_KEY));
    if (Array.isArray(raw)) {
      for (let i = 0; i < state.stars.length && i < raw.length; i++) {
        state.stars[i] = raw[i] | 0;
      }
    }
  } catch (e) {
    // ignore malformed storage
  }
}

function saveStars() {
  localStorage.setItem(STARS_KEY, JSON.stringify(state.stars));
}

function loadRecords() {
  try {
    const raw = JSON.parse(localStorage.getItem(RECORDS_KEY));
    if (Array.isArray(raw)) {
      for (let i = 0; i < state.records.length && i < raw.length; i++) {
        const r = raw[i];
        if (r && typeof r.timeMs === "number" && typeof r.moves === "number") {
          state.records[i] = { timeMs: r.timeMs, moves: r.moves };
        }
      }
    }
  } catch (e) {
    // ignore malformed storage
  }
}

function saveRecords() {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(state.records));
}

// Star rating for a finished level, based on hearts left at the end.
function starsForHearts(hearts) {
  if (hearts >= MAX_HEARTS) return 3;
  if (hearts >= 3) return 2;
  return 1;
}

// Mini-game (arcade) progress bridged into the achievement system. Each game
// stores { stars: number[], unlocked } under knot-arcade-progress-<id> via
// ArcadeUI; these helpers aggregate that for cross-game achievements.
const ARCADE_GAME_IDS = ["memory", "flow", "2048", "blocks"];
const ARCADE_GAME_LEVELS = 8;
function arcadeGameStars(id) {
  if (!window.ArcadeUI) return 0;
  return ArcadeUI.loadProgress(id, ARCADE_GAME_LEVELS).stars.reduce((a, b) => a + b, 0);
}
function arcadeTotalStars() {
  return ARCADE_GAME_IDS.reduce((sum, id) => sum + arcadeGameStars(id), 0);
}
function arcadeGamesCleared() {
  return ARCADE_GAME_IDS.filter((id) => arcadeGameStars(id) > 0).length;
}

const ACHIEVEMENTS = [
  {
    id: "first-knot",
    titleKey: "ach_first_knot_title",
    descKey: "ach_first_knot_desc",
    check: (s) => s.level >= 1 || s.stars[0] > 0,
  },
  {
    id: "level-10",
    titleKey: "ach_level10_title",
    descKey: "ach_level10_desc",
    check: (s) => s.level >= 10,
  },
  {
    id: "level-25",
    titleKey: "ach_level25_title",
    descKey: "ach_level25_desc",
    check: (s) => s.level >= 25,
  },
  {
    id: "all-levels",
    titleKey: "ach_all_levels_title",
    descKey: "ach_all_levels_desc",
    check: (s) => s.stars[LEVELS.length - 1] > 0,
  },
  {
    id: "perfect",
    titleKey: "ach_perfect_title",
    descKey: "ach_perfect_desc",
    check: (s) => s.stars.some((v) => v === 3),
  },
  {
    id: "star-collector",
    titleKey: "ach_star_collector_title",
    descKey: "ach_star_collector_desc",
    check: (s) => s.stars.filter((v) => v === 3).length >= 10,
  },
  {
    id: "daily-explorer",
    titleKey: "ach_daily_explorer_title",
    descKey: "ach_daily_explorer_desc",
    check: () => !!loadDailyRecord(),
  },
  {
    id: "arcade-debut",
    titleKey: "ach_arcade_debut_title",
    descKey: "ach_arcade_debut_desc",
    check: () => arcadeTotalStars() >= 1,
  },
  {
    id: "arcade-allrounder",
    titleKey: "ach_arcade_allrounder_title",
    descKey: "ach_arcade_allrounder_desc",
    check: () => arcadeGamesCleared() >= ARCADE_GAME_IDS.length,
  },
  {
    id: "arcade-champion",
    titleKey: "ach_arcade_champion_title",
    descKey: "ach_arcade_champion_desc",
    check: () => arcadeTotalStars() >= 30,
  },
];

function renderAchievements() {
  el.achvGrid.innerHTML = "";
  for (const a of ACHIEVEMENTS) {
    const unlocked = a.check(state);
    const card = document.createElement("div");
    card.className = "achv-card" + (unlocked ? " unlocked" : " locked");
    card.innerHTML = `
      <span class="achv-icon">${unlocked ? "🏆" : "🔒"}</span>
      <span class="achv-title">${t(a.titleKey)}</span>
      <span class="achv-desc">${t(a.descKey)}</span>
    `;
    el.achvGrid.appendChild(card);
  }
}

// ---------- Settings ----------

function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (raw && typeof raw === "object") Object.assign(state.settings, raw);
  } catch (e) {
    // ignore malformed storage
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

function applySettings() {
  el.app.classList.toggle("dark", state.settings.dark);
  el.app.classList.toggle("arrow-colors", state.settings.colors);
  el.toggleSound.classList.toggle("on", state.settings.sound);
  el.toggleSound.setAttribute("aria-checked", String(state.settings.sound));
  el.toggleVibration.classList.toggle("on", state.settings.vibration);
  el.toggleVibration.setAttribute("aria-checked", String(state.settings.vibration));
  el.toggleDark.classList.toggle("on", state.settings.dark);
  el.toggleDark.setAttribute("aria-checked", String(state.settings.dark));
  el.toggleColors.classList.toggle("on", state.settings.colors);
  el.toggleColors.setAttribute("aria-checked", String(state.settings.colors));
}

// ---------- Sound & haptics ----------

let audioCtx = null;

function ensureAudioCtx() {
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playTone(freq, duration, type) {
  if (!state.settings.sound) return;
  const ctx = ensureAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || "sine";
  osc.frequency.value = freq;
  gain.gain.value = 0.12;
  osc.connect(gain).connect(ctx.destination);
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.start(now);
  osc.stop(now + duration);
}

// Soft tap sound for general UI buttons.
function playClick() {
  playTone(420, 0.05, "sine");
}

// Rising sweep used when the board zooms in at the start of a level.
function playZoomSound() {
  if (!state.settings.sound) return;
  const ctx = ensureAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  const now = ctx.currentTime;
  osc.frequency.setValueAtTime(260, now);
  osc.frequency.exponentialRampToValueAtTime(520, now + 0.5);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.07, now + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.5);
}

function vibrate(pattern) {
  if (!state.settings.vibration) return;
  if (navigator.vibrate) navigator.vibrate(pattern);
}

function playWinChime() {
  playTone(660, 0.12);
  setTimeout(() => playTone(880, 0.18), 110);
}

// Airy "whoosh" as a cord slides off the board: filtered noise sweeping down
// in pitch, like something rushing past.
function playWhoosh() {
  if (!state.settings.sound) return;
  const ctx = ensureAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const dur = 0.26;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(1500, now);
  bp.frequency.exponentialRampToValueAtTime(420, now + dur);
  bp.Q.value = 0.9;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.16, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(bp).connect(gain).connect(ctx.destination);
  src.start(now);
  src.stop(now + dur);
}

// ---------- Confetti ----------

function launchConfetti() {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let canvas = document.getElementById("confetti-canvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "confetti-canvas";
    el.app.appendChild(canvas);
  }
  const rect = el.app.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const colors = ["#2bb3a3", "#ffc83d", "#ff5b6a", "#4a90d9", "#9b6dd0", "#e0843a"];
  const parts = [];
  for (let i = 0; i < 120; i++) {
    parts.push({
      x: rect.width / 2 + (Math.random() - 0.5) * 80,
      y: rect.height * 0.42,
      vx: (Math.random() - 0.5) * 9,
      vy: -7 - Math.random() * 8,
      size: 5 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 0.35,
      round: Math.random() < 0.45,
    });
  }
  const gravity = 0.3;
  const life = 2400;
  const start = performance.now();

  function frame(now) {
    const t = now - start;
    ctx.clearRect(0, 0, rect.width, rect.height);
    for (const p of parts) {
      p.vy += gravity;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, 1 - t / life);
      ctx.fillStyle = p.color;
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      }
      ctx.restore();
    }
    if (t < life) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, rect.width, rect.height);
  }
  requestAnimationFrame(frame);
}

// ---------- Daily challenge helpers ----------

function dateKey(d) {
  d = d || new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hashSeed(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function getDailyLevel() {
  const seed = hashSeed(`knot-daily-${dateKey()}`);
  const { rows, cols, fillTarget, maxLen, minLen } = DAILY_CONFIG;
  return LevelGenerator.generateLevel(rows, cols, fillTarget, maxLen, seed, minLen);
}

function loadDailyRecord() {
  try {
    const raw = JSON.parse(localStorage.getItem(DAILY_KEY));
    if (raw && raw.date === dateKey()) return raw;
  } catch (e) {
    // ignore malformed storage
  }
  return null;
}

function saveDailyRecord(record) {
  localStorage.setItem(DAILY_KEY, JSON.stringify(record));
}

function msUntilNextMidnight() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return next - now;
}

function formatHMS(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function formatClock(ms) {
  const total = Math.max(0, ms);
  const m = Math.floor(total / 60000);
  const s = (total % 60000) / 1000;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}

function updateDailyCard() {
  const record = loadDailyRecord();
  if (record && record.completed) {
    el.btnDaily.textContent = t("daily_play_again");
    el.dailyStatus.textContent = t("daily_best_status", {
      score: record.score,
      time: formatClock(record.timeMs),
    });
  } else {
    el.btnDaily.textContent = t("daily_start");
    el.dailyStatus.textContent = t("daily_status_default");
  }

  if (state.dailyCountdownInterval) clearInterval(state.dailyCountdownInterval);
  const tick = () => {
    el.dailyTimer.textContent = t("new_challenge_in", { time: formatHMS(msUntilNextMidnight()) });
  };
  tick();
  state.dailyCountdownInterval = setInterval(tick, 1000);

  refreshLeaderboard();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function refreshLeaderboard() {
  if (!Leaderboard.isConfigured()) {
    el.leaderboardCard.classList.add("hidden");
    return;
  }
  el.leaderboardCard.classList.remove("hidden");
  el.lbPlayerName.textContent = Leaderboard.getPlayerName() || t("choose_name");

  const entries = await Leaderboard.fetchDailyLeaderboard(dateKey(), 10);
  el.leaderboardList.innerHTML = "";

  if (!entries || entries.length === 0) {
    el.leaderboardEmpty.textContent = !entries
      ? t("leaderboard_load_error")
      : t("leaderboard_empty");
    el.leaderboardEmpty.classList.remove("hidden");
    return;
  }

  el.leaderboardEmpty.classList.add("hidden");
  const myId = Leaderboard.getPlayerId();
  entries.forEach((entry, i) => {
    const li = document.createElement("li");
    li.className = "leaderboard-item" + (entry.id === myId ? " mine" : "");
    li.innerHTML = `<span class="lb-rank">${i + 1}</span><span class="lb-name">${escapeHtml(
      entry.name || t("player_default")
    )}</span><span class="lb-score">${entry.score}</span>`;
    el.leaderboardList.appendChild(li);
  });
}

function startDaily() {
  if (state.dailyCountdownInterval) {
    clearInterval(state.dailyCountdownInterval);
    state.dailyCountdownInterval = null;
  }
  if (state.gameClockInterval) clearInterval(state.gameClockInterval);

  state.mode = "daily";
  const level = getDailyLevel();
  state.arrows = level.arrows.map((a) => ({
    cells: a.cells.map((c) => [...c]),
    dir: a.dir,
    removed: false,
  }));
  state.hearts = MAX_HEARTS;
  state.dailyStart = performance.now();
  state.history = [];
  state.moveCount = 0;

  el.levelTitle.classList.add("hidden");
  el.dailyTitle.classList.remove("hidden");
  el.dailyClock.classList.remove("hidden");
  el.dailyClock.textContent = "0:00.0";

  state.returnTab = state.tab;
  hideTabScreens();
  el.winOverlay.classList.add("hidden");
  el.loseOverlay.classList.add("hidden");
  el.game.classList.remove("hidden");

  renderHearts();
  computeGeometry();
  renderBoard();
  updateUndoButton();

  state.gameClockInterval = setInterval(() => {
    el.dailyClock.textContent = formatClock(performance.now() - state.dailyStart);
  }, 100);
}

// ---------- Screens ----------

function hideTabScreens() {
  el.home.classList.add("hidden");
  el.challenge.classList.add("hidden");
  el.collection.classList.add("hidden");
  el.settings.classList.add("hidden");
  el.bottomNav.classList.add("hidden");
}

function showTab(tab) {
  if (state.gameClockInterval) {
    clearInterval(state.gameClockInterval);
    state.gameClockInterval = null;
  }
  state.tab = tab;
  if (typeof Arcade !== "undefined" && Arcade.isOpen()) Arcade.closeGame(false);
  el.dailyClock.classList.add("hidden");
  el.game.classList.add("hidden");
  el.arcadeGame.classList.add("hidden");
  el.winOverlay.classList.add("hidden");
  el.loseOverlay.classList.add("hidden");
  el.bottomNav.classList.remove("hidden");

  el.home.classList.toggle("hidden", tab !== "home");
  el.challenge.classList.toggle("hidden", tab !== "challenge");
  el.collection.classList.toggle("hidden", tab !== "collection");
  el.settings.classList.toggle("hidden", tab !== "settings");

  el.navBtns.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tab));

  el.splashLevel.textContent = t("level_label", { n: state.level + 1 });
  updateDailyCard();
  if (tab === "collection") {
    renderCollection();
    renderAchievements();
  }
  if (tab === "home" && typeof Arcade !== "undefined") Arcade.renderGrid();
  if (tab === "home") updateContinueCard();
}

function renderCollection() {
  el.levelGrid.innerHTML = "";
  for (let i = 0; i < LEVELS.length; i++) {
    const cell = document.createElement("button");
    cell.className = "level-cell";
    if (i < state.level) cell.classList.add("done");
    else if (i === state.level) cell.classList.add("current");
    else cell.classList.add("locked");
    cell.disabled = i > state.level;
    if (i <= state.level) cell.addEventListener("click", () => { playClick(); playLevel(i); });

    const num = document.createElement("span");
    num.className = "cell-num";
    num.textContent = String(i + 1);
    cell.appendChild(num);

    if (state.stars[i] > 0) {
      const starRow = document.createElement("span");
      starRow.className = "cell-stars";
      for (let s = 0; s < 3; s++) {
        const star = document.createElement("span");
        star.className = "star" + (s < state.stars[i] ? " filled" : "");
        star.textContent = "★";
        starRow.appendChild(star);
      }
      cell.appendChild(starRow);
    }

    const rec = state.records[i];
    if (rec) {
      const best = document.createElement("span");
      best.className = "cell-best";
      best.textContent = (state.stars[i] >= 3 ? "✨ " : "") + formatClock(rec.timeMs);
      cell.appendChild(best);
    }

    el.levelGrid.appendChild(cell);
  }
}

function playLevel(index) {
  if (state.gameClockInterval) {
    clearInterval(state.gameClockInterval);
    state.gameClockInterval = null;
  }
  state.mode = "level";
  state.level = index;
  saveProgress();
  saveLastPlayed({ id: "knot-escape", emoji: "🪢", nameKey: "game_knot_name", accent: "#2bb3a3", sub: t("level_label", { n: index + 1 }) });
  const level = LEVELS[index];
  state.arrows = level.arrows.map((a) => ({
    cells: a.cells.map((c) => [...c]),
    dir: a.dir,
    removed: false,
  }));
  state.hearts = MAX_HEARTS;
  state.history = [];
  state.moveCount = 0;
  state.levelStart = performance.now();

  el.dailyTitle.classList.add("hidden");
  el.levelTitle.classList.remove("hidden");
  el.dailyClock.classList.add("hidden");
  el.levelTitle.textContent = t("level_label", { n: index + 1 });

  state.returnTab = state.tab;
  hideTabScreens();
  el.winOverlay.classList.add("hidden");
  el.loseOverlay.classList.add("hidden");
  el.game.classList.remove("hidden");

  renderHearts();
  computeGeometry();
  renderBoard();
  updateUndoButton();
  maybeShowTutorial();
}

function renderHearts() {
  el.hearts.innerHTML = "";
  for (let i = 0; i < MAX_HEARTS; i++) {
    const h = document.createElement("div");
    h.className = "heart" + (i < state.hearts ? "" : " empty");
    el.hearts.appendChild(h);
  }
}

// Figure out the cell size and viewBox from the arrows' bounding box.
function computeGeometry() {
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  for (const a of state.arrows) {
    for (const [r, c] of a.cells) {
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
      if (c < minC) minC = c;
      if (c > maxC) maxC = c;
    }
  }
  const cell = 40;
  const pad = cell;
  const rows = maxR - minR + 1;
  const cols = maxC - minC + 1;
  state.geom = {
    minR, minC, maxR, maxC, rows, cols, cell, pad,
    width: cols * cell + pad * 2,
    height: rows * cell + pad * 2,
  };
}

function cellToXY(r, c) {
  const g = state.geom;
  return {
    x: g.pad + (c - g.minC) * g.cell + g.cell / 2,
    y: g.pad + (r - g.minR) * g.cell + g.cell / 2,
  };
}

function renderBoard() {
  const g = state.geom;
  el.board.setAttribute("viewBox", `0 0 ${g.width} ${g.height}`);
  el.board.innerHTML = "";

  el.board.appendChild(buildGrid());

  let i = 0;
  for (const arrow of state.arrows) {
    if (arrow.removed) continue;
    const groupEl = buildArrowEl(arrow);
    groupEl.classList.add("enter");
    groupEl.style.animationDelay = (i * 0.028).toFixed(3) + "s";
    groupEl.addEventListener("animationend", function once() {
      groupEl.classList.remove("enter");
      groupEl.style.animationDelay = "";
      groupEl.removeEventListener("animationend", once);
    });
    el.board.appendChild(groupEl);
    i++;
  }

  resetBoardView();
  scheduleBoardIntroZoom();
}

// ---------- Pinch-to-zoom / pan ----------

const BOARD_ZOOM_MIN = 1;
const BOARD_ZOOM_MAX = 4;
// On level start, after showing the whole board, ease in to roughly this
// many cells across.
const BOARD_INTRO_TARGET_CELLS = 16;
const BOARD_INTRO_DELAY = 450;

function resetBoardView() {
  if (state.boardIntroTimer) {
    clearTimeout(state.boardIntroTimer);
    state.boardIntroTimer = null;
  }
  el.board.classList.remove("board-zoom-anim");
  state.boardZoom = 1;
  state.boardPanX = 0;
  state.boardPanY = 0;
  applyBoardTransform();
}

// Show the full board first, then ease in to a closer view (~16 cells
// across) so cells are easier to tap on large boards.
function scheduleBoardIntroZoom() {
  const g = state.geom;
  const target = Math.max(BOARD_ZOOM_MIN, Math.min(BOARD_ZOOM_MAX, g.cols / BOARD_INTRO_TARGET_CELLS));
  if (target <= BOARD_ZOOM_MIN + 0.01) return;
  state.boardIntroTimer = setTimeout(() => {
    state.boardIntroTimer = null;
    el.board.classList.add("board-zoom-anim");
    state.boardZoom = target;
    clampBoardPan();
    applyBoardTransform();
    playZoomSound();
    el.board.addEventListener("transitionend", function once() {
      el.board.classList.remove("board-zoom-anim");
      el.board.removeEventListener("transitionend", once);
    });
  }, BOARD_INTRO_DELAY);
}

function applyBoardTransform() {
  el.board.style.transform = `translate(${state.boardPanX}px, ${state.boardPanY}px) scale(${state.boardZoom})`;
}

function clampBoardPan() {
  const rect = el.boardWrap.getBoundingClientRect();
  const maxX = (rect.width * (state.boardZoom - 1)) / 2;
  const maxY = (rect.height * (state.boardZoom - 1)) / 2;
  state.boardPanX = Math.max(-maxX, Math.min(maxX, state.boardPanX));
  state.boardPanY = Math.max(-maxY, Math.min(maxY, state.boardPanY));
}

function pointerDist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointerMid(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// A single-finger press counts as a drag (and suppresses the tap-to-remove
// click) once it moves past this many pixels.
const PAN_DRAG_THRESHOLD = 6;

function setupBoardZoom() {
  const pointers = new Map();
  let pinch = null;
  let pan = null;

  el.boardWrap.addEventListener("pointerdown", (e) => {
    if (state.boardIntroTimer) {
      clearTimeout(state.boardIntroTimer);
      state.boardIntroTimer = null;
    }
    el.board.classList.remove("board-zoom-anim");
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      pan = { startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY, moved: false };
    } else {
      pan = null;
    }
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = {
        startDist: pointerDist(a, b),
        startZoom: state.boardZoom,
        startMid: pointerMid(a, b),
        startPanX: state.boardPanX,
        startPanY: state.boardPanY,
      };
    }
  });

  el.boardWrap.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const dist = pointerDist(a, b);
      const mid = pointerMid(a, b);
      let zoom = pinch.startZoom * (dist / pinch.startDist);
      zoom = Math.max(BOARD_ZOOM_MIN, Math.min(BOARD_ZOOM_MAX, zoom));
      state.boardZoom = zoom;
      state.boardPanX = pinch.startPanX + (mid.x - pinch.startMid.x);
      state.boardPanY = pinch.startPanY + (mid.y - pinch.startMid.y);
      if (state.boardZoom <= BOARD_ZOOM_MIN) {
        state.boardPanX = 0;
        state.boardPanY = 0;
      } else {
        clampBoardPan();
      }
      applyBoardTransform();
      e.preventDefault();
    } else if (pointers.size === 1 && pan) {
      const dx = e.clientX - pan.lastX;
      const dy = e.clientY - pan.lastY;
      if (!pan.moved && Math.hypot(e.clientX - pan.startX, e.clientY - pan.startY) > PAN_DRAG_THRESHOLD) {
        pan.moved = true;
      }
      if (pan.moved) {
        state.boardPanX += dx;
        state.boardPanY += dy;
        clampBoardPan();
        applyBoardTransform();
        e.preventDefault();
      }
      pan.lastX = e.clientX;
      pan.lastY = e.clientY;
    }
  });

  const endPointer = (e) => {
    if (pointers.size === 1 && pan && pan.moved) {
      state.suppressBoardClick = true;
    }
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) pan = null;
  };
  el.boardWrap.addEventListener("pointerup", endPointer);
  el.boardWrap.addEventListener("pointercancel", endPointer);
  el.boardWrap.addEventListener("pointerleave", endPointer);

  // If the pointer-up that ended a drag also produces a click on an arrow,
  // swallow it so dragging the board doesn't accidentally remove a cord.
  el.board.addEventListener("click", (e) => {
    if (state.suppressBoardClick) {
      state.suppressBoardClick = false;
      e.stopPropagation();
      e.preventDefault();
    }
  }, { capture: true });
}

// Soft rounded panel plus a faint dot at every grid cell, so the puzzle reads
// as a board rather than floating arrows.
function buildGrid() {
  const g = state.geom;
  const grp = document.createElementNS(SVG_NS, "g");
  grp.setAttribute("class", "grid");

  const margin = g.cell * 0.55;
  const panel = document.createElementNS(SVG_NS, "rect");
  panel.setAttribute("class", "board-panel");
  panel.setAttribute("x", String(g.pad - margin));
  panel.setAttribute("y", String(g.pad - margin));
  panel.setAttribute("width", String(g.cols * g.cell + margin * 2));
  panel.setAttribute("height", String(g.rows * g.cell + margin * 2));
  panel.setAttribute("rx", String(g.cell * 0.5));
  grp.appendChild(panel);

  for (let r = g.minR; r <= g.maxR; r++) {
    for (let c = g.minC; c <= g.maxC; c++) {
      const { x, y } = cellToXY(r, c);
      const dot = document.createElementNS(SVG_NS, "circle");
      dot.setAttribute("class", "grid-dot");
      dot.setAttribute("cx", x.toFixed(2));
      dot.setAttribute("cy", y.toFixed(2));
      dot.setAttribute("r", "2");
      grp.appendChild(dot);
    }
  }
  return grp;
}

function buildArrowEl(arrow) {
  const g = state.geom;
  const group = document.createElementNS(SVG_NS, "g");
  group.setAttribute("class", "arrow-group dir-" + arrow.dir);
  arrow.el = group;

  const pts = arrow.cells.map(([r, c]) => cellToXY(r, c));
  const head = pts[pts.length - 1];
  const { dr, dc } = DIRS[arrow.dir];
  // For a single-cell cord the tail sits a short way behind the head, but
  // must stay inside the cell's own footprint so it never overlaps a
  // neighbouring cord's cell.
  const headBack = pts.length > 1
    ? pts[pts.length - 2]
    : { x: head.x - dc * g.cell * TAIL_OFFSET, y: head.y - dr * g.cell * TAIL_OFFSET };

  // Stroke stops short of the head tip so the triangle sits cleanly on the end,
  // and everything is sized a bit smaller than the cell so neighbouring cords
  // never visually touch or overlap.
  const tip = { x: head.x + dc * g.cell * 0.36, y: head.y + dr * g.cell * 0.36 };
  const base = { x: head.x - dc * g.cell * 0.16, y: head.y - dr * g.cell * 0.16 };

  const strokeW = g.cell * 0.16;
  const linePts = pts.slice(0, -1).concat([base]);
  if (pts.length === 1) linePts.unshift(headBack);

  // Wide, invisible hit area running the whole length of the cord (tail to the
  // arrow tip) so a tap anywhere along the rope — not just on the arrowhead —
  // selects it. Added first so it sits behind the visible parts.
  const hitPts = pts.length > 1 ? pts.concat([tip]) : [headBack, tip];
  const hit = document.createElementNS(SVG_NS, "polyline");
  hit.setAttribute("class", "arrow-hit");
  hit.setAttribute("points", hitPts.map((p) => `${p.x},${p.y}`).join(" "));
  hit.setAttribute("stroke-width", String(g.cell * 0.72));
  group.appendChild(hit);

  const poly = document.createElementNS(SVG_NS, "polyline");
  poly.setAttribute("class", "arrow-stroke");
  poly.setAttribute("points", linePts.map((p) => `${p.x},${p.y}`).join(" "));
  poly.setAttribute("stroke-width", String(strokeW));
  group.appendChild(poly);

  // Small knot tied at the tail end of the cord.
  const tail = pts.length > 1 ? pts[0] : headBack;
  const knot = document.createElementNS(SVG_NS, "circle");
  knot.setAttribute("class", "arrow-knot");
  knot.setAttribute("cx", String(tail.x));
  knot.setAttribute("cy", String(tail.y));
  knot.setAttribute("r", String(g.cell * 0.13));
  group.appendChild(knot);

  // Arrowhead triangle pointing in the travel direction.
  const hw = g.cell * 0.24; // half width
  const perp = { x: -dr, y: dc }; // perpendicular unit-ish (dr/dc are 0/±1)
  const p1 = `${tip.x},${tip.y}`;
  const p2 = `${base.x + perp.x * hw},${base.y + perp.y * hw}`;
  const p3 = `${base.x - perp.x * hw},${base.y - perp.y * hw}`;
  const tri = document.createElementNS(SVG_NS, "polygon");
  tri.setAttribute("class", "arrow-head");
  tri.setAttribute("points", `${p1} ${p2} ${p3}`);
  group.appendChild(tri);

  const press = () => { if (!arrow.removed) group.classList.add("press"); };
  const release = () => group.classList.remove("press");
  group.addEventListener("pointerdown", press);
  group.addEventListener("pointerup", release);
  group.addEventListener("pointerleave", release);
  group.addEventListener("pointercancel", release);

  group.addEventListener("click", () => {
    release();
    handleClick(arrow, group);
  });
  return group;
}

// An arrow is removable if no other present arrow occupies a cell on the
// straight ray extending from its head in its travel direction.
function isRemovable(arrow) {
  const head = arrow.cells[arrow.cells.length - 1];
  const { dr, dc } = DIRS[arrow.dir];
  for (const other of state.arrows) {
    if (other === arrow || other.removed) continue;
    for (const [r, c] of other.cells) {
      if (dr !== 0) {
        if (c === head[1] && (dr < 0 ? r < head[0] : r > head[0])) return false;
      } else {
        if (r === head[0] && (dc < 0 ? c < head[1] : c > head[1])) return false;
      }
    }
  }
  return true;
}

// Send the arrow off like a train pulling out: every part of the cord rides
// forward along the cord's own track — its cells, then a straight extension
// off the board in its travel direction (the lane its head already proved is
// clear). Each point of the shape just advances along that track by the same
// arc-length, so the rigid cord shape is preserved and it can never swing
// across another cord's line.
function animateLeave(arrow, group, onDone) {
  const g = state.geom;
  const { dr, dc } = DIRS[arrow.dir];

  const cellPts = arrow.cells.map(([r, c]) => cellToXY(r, c));
  const head = cellPts[cellPts.length - 1];
  const headBack = cellPts.length > 1
    ? cellPts[cellPts.length - 2]
    : { x: head.x - dc * g.cell * TAIL_OFFSET, y: head.y - dr * g.cell * TAIL_OFFSET };
  const bodyPts = cellPts.length > 1 ? cellPts : [headBack, head];
  const n = bodyPts.length;

  // Cumulative arc length along the cord, tail to head.
  const cum = [0];
  for (let i = 1; i < n; i++) {
    cum.push(cum[i - 1] + Math.hypot(bodyPts[i].x - bodyPts[i - 1].x, bodyPts[i].y - bodyPts[i - 1].y));
  }
  const bodyLen = cum[n - 1];
  const exitDist = Math.max(g.width, g.height) * 1.25;
  const extLen = bodyLen + exitDist;
  const far = { x: head.x + dc * extLen, y: head.y + dr * extLen };
  const track = bodyPts.concat([far]);
  const trackCum = cum.concat([bodyLen + extLen]);
  const totalLen = trackCum[trackCum.length - 1];
  const maxShift = bodyLen + exitDist;

  function pointAt(s) {
    s = Math.max(0, Math.min(totalLen, s));
    for (let i = 1; i < trackCum.length; i++) {
      if (s <= trackCum[i] || i === trackCum.length - 1) {
        const segLen = trackCum[i] - trackCum[i - 1];
        const f = segLen > 0 ? (s - trackCum[i - 1]) / segLen : 0;
        const a = track[i - 1], b = track[i];
        return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
      }
    }
    return track[track.length - 1];
  }

  const hit = group.querySelector(".arrow-hit");
  const stroke = group.querySelector(".arrow-stroke");
  const knot = group.querySelector(".arrow-knot");
  const tri = group.querySelector(".arrow-head");
  const hw = g.cell * 0.24;
  const tipLen = g.cell * 0.36;
  const baseLen = g.cell * 0.16;
  const EPS = Math.max(0.01, g.cell * 0.01);

  const finish = once(onDone);
  const start = performance.now();
  const duration = Math.min(620, 380 + arrow.cells.length * 24);

  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = t * t * t; // ease-in: slow start, picks up speed leaving
    const shift = eased * maxShift;

    const newPts = bodyPts.map((_, i) => pointAt(cum[i] + shift));
    const newHead = newPts[n - 1];
    const headArc = Math.min(cum[n - 1] + shift, totalLen);
    const p1 = pointAt(Math.max(0, headArc - EPS));
    const p2 = pointAt(Math.min(totalLen, headArc + EPS));
    let tx = p2.x - p1.x, ty = p2.y - p1.y;
    const tlen = Math.hypot(tx, ty) || 1;
    tx /= tlen; ty /= tlen;

    const tip = { x: newHead.x + tx * tipLen, y: newHead.y + ty * tipLen };
    const base = { x: newHead.x - tx * baseLen, y: newHead.y - ty * baseLen };
    const perp = { x: -ty, y: tx };

    const linePts = newPts.slice(0, -1).concat([base]);
    stroke.setAttribute("points", linePts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" "));
    hit.setAttribute("points", newPts.concat([tip]).map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" "));
    knot.setAttribute("cx", newPts[0].x.toFixed(2));
    knot.setAttribute("cy", newPts[0].y.toFixed(2));
    tri.setAttribute("points", [
      `${tip.x.toFixed(2)},${tip.y.toFixed(2)}`,
      `${(base.x + perp.x * hw).toFixed(2)},${(base.y + perp.y * hw).toFixed(2)}`,
      `${(base.x - perp.x * hw).toFixed(2)},${(base.y - perp.y * hw).toFixed(2)}`,
    ].join(" "));

    group.style.opacity = t < 0.55 ? "1" : String(Math.max(0, 1 - (t - 0.55) / 0.45));

    if (t < 1) requestAnimationFrame(frame);
    else finish();
  }
  requestAnimationFrame(frame);
}

// Wrap a callback so it can only ever fire once.
function once(fn) {
  let called = false;
  return () => {
    if (called) return;
    called = true;
    fn();
  };
}

function handleClick(arrow, group) {
  if (arrow.removed) return;

  if (!isRemovable(arrow)) {
    loseHeart();
    playTone(180, 0.15, "square");
    vibrate(60);
    group.classList.add("blocked");
    setTimeout(() => group.classList.remove("blocked"), 380);
    return;
  }

  arrow.removed = true;
  state.history.push(arrow);
  state.moveCount += 1;
  updateUndoButton();
  playWhoosh();
  vibrate(12);
  group.classList.remove("hint");
  group.classList.add("leaving");
  animateLeave(arrow, group, () => {
    group.remove();
    if (state.arrows.every((a) => a.removed)) onWin();
  });
}

// ---------- Undo & hint ----------

function updateUndoButton() {
  el.btnUndo.disabled = state.history.length === 0;
}

// Bring back the most recently removed cord. Cheap and forgiving — it only
// reverses successful removals, so the board stays consistent.
function undoMove() {
  if (!state.history.length) return;
  const arrow = state.history.pop();
  arrow.removed = false;
  state.moveCount = Math.max(0, state.moveCount - 1);

  const groupEl = buildArrowEl(arrow);
  groupEl.classList.add("enter");
  groupEl.addEventListener("animationend", function done() {
    groupEl.classList.remove("enter");
    groupEl.removeEventListener("animationend", done);
  });
  el.board.appendChild(groupEl);

  updateUndoButton();
  playTone(440, 0.06);
  vibrate(15);
  el.btnUndo.classList.add("flash");
  setTimeout(() => el.btnUndo.classList.remove("flash"), 400);
}

// Pulse a cord that can be safely removed right now, to nudge a stuck player.
function showHint() {
  const candidates = state.arrows.filter((a) => !a.removed && a.el && isRemovable(a));
  if (!candidates.length) return;
  const arrow = candidates[Math.floor(Math.random() * candidates.length)];
  const groupEl = arrow.el;
  el.board.appendChild(groupEl); // raise above neighbours so the glow shows
  groupEl.classList.add("hint");
  setTimeout(() => groupEl.classList.remove("hint"), 2100);
  playTone(620, 0.07);
  el.btnHint.classList.add("flash");
  setTimeout(() => el.btnHint.classList.remove("flash"), 400);
}

function loseHeart() {
  state.hearts = Math.max(0, state.hearts - 1);
  const heartEls = el.hearts.querySelectorAll(".heart");
  const idx = state.hearts; // the heart that just emptied
  if (heartEls[idx]) {
    heartEls[idx].classList.add("empty", "pop");
    setTimeout(() => heartEls[idx].classList.remove("pop"), 400);
  }
  if (state.hearts === 0) {
    if (state.gameClockInterval) {
      clearInterval(state.gameClockInterval);
      state.gameClockInterval = null;
    }
    setTimeout(() => {
      if (state.arrows.every((a) => a.removed)) return; // won before the timeout fired
      const canRevive = Ads.canReward();
      el.btnWatchAd.classList.toggle("hidden", !canRevive);
      if (canRevive) {
        el.btnWatchAd.disabled = false;
        el.btnWatchAd.textContent = t("watch_ad_continue", { n: REVIVE_HEARTS });
      }
      el.loseOverlay.classList.remove("hidden");
    }, 450);
  }
}

function onWin() {
  if (state.mode === "daily") {
    onDailyWin();
    return;
  }
  const cleared = state.level + 1;
  const earned = starsForHearts(state.hearts);
  if (earned > state.stars[state.level]) {
    state.stars[state.level] = earned;
    saveStars();
  }

  // Record best time / fewest moves for this level.
  const timeMs = performance.now() - state.levelStart;
  const moves = state.moveCount;
  const prev = state.records[state.level];
  const newTimeBest = !prev || timeMs < prev.timeMs;
  state.records[state.level] = {
    timeMs: prev ? Math.min(prev.timeMs, timeMs) : timeMs,
    moves: prev ? Math.min(prev.moves, moves) : moves,
  };
  saveRecords();

  el.winTitle.textContent = t("level_complete");
  el.winStats.textContent = t("escaped_level", { n: cleared });
  el.winRecordTime.textContent = "⏱ " + formatClock(timeMs);
  el.winRecordTime.classList.toggle("best", newTimeBest && !!prev);
  el.winRecordMoves.textContent = "👆 " + t("moves_suffix", { n: moves });
  el.winRecords.classList.remove("hidden");
  el.winDailyInfo.classList.add("hidden");
  el.btnNext.textContent = t("continue");
  showWinStars(earned);
  if (state.level < LEVELS.length - 1) {
    state.level += 1;
    saveProgress();
  }
  playWinChime();
  launchConfetti();
  el.winOverlay.classList.remove("hidden");
}

function showWinStars(earned) {
  el.winStars.classList.remove("hidden");
  el.winStars.querySelectorAll(".star").forEach((star, i) => {
    star.classList.toggle("filled", i < earned);
  });
}

function onDailyWin() {
  if (state.gameClockInterval) {
    clearInterval(state.gameClockInterval);
    state.gameClockInterval = null;
  }
  const timeMs = performance.now() - state.dailyStart;
  const heartsLeft = state.hearts;
  const score = Math.max(0, Math.round(10000 - timeMs / 100)) + heartsLeft * 250;

  const prev = loadDailyRecord();
  const isBest = !prev || score > prev.score;
  const record = isBest
    ? { date: dateKey(), score, timeMs, hearts: heartsLeft, completed: true }
    : prev;
  saveDailyRecord(record);

  if (Leaderboard.isConfigured()) {
    if (!Leaderboard.getPlayerName()) {
      el.nameInput.value = "";
      el.nameOverlay.classList.remove("hidden");
    }
    Leaderboard.submitDailyScore(dateKey(), score, timeMs, heartsLeft).then(() =>
      refreshLeaderboard()
    );
  }

  el.winStars.classList.add("hidden");
  el.winRecords.classList.add("hidden");
  el.winTitle.textContent = t("daily_complete");
  el.winStats.textContent = t("daily_stats", { time: formatClock(timeMs), hearts: heartsLeft });
  el.winDailyScore.textContent = isBest
    ? t("score_new_best", { score })
    : t("score_prev_best", { score, prev: prev.score });
  el.winDailyNext.textContent = t("new_challenge_in_suffix", { time: formatHMS(msUntilNextMidnight()) });
  el.winDailyInfo.classList.remove("hidden");
  el.btnNext.textContent = t("ok");
  playWinChime();
  launchConfetti();
  el.winOverlay.classList.remove("hidden");
}

// ---------- Tutorial ----------

const TUTORIAL_STEPS = [
  { emoji: "🪢", titleKey: "tut1_title", textKey: "tut1_text" },
  { emoji: "👆", titleKey: "tut2_title", textKey: "tut2_text" },
  { emoji: "🚫", titleKey: "tut3_title", textKey: "tut3_text" },
  { emoji: "💡", titleKey: "tut4_title", textKey: "tut4_text" },
];

let tutorialStep = 0;

function renderTutorialStep() {
  const s = TUTORIAL_STEPS[tutorialStep];
  el.tutorialEmoji.textContent = s.emoji;
  el.tutorialTitle.textContent = t(s.titleKey);
  el.tutorialText.textContent = t(s.textKey);
  el.tutorialDots.innerHTML = "";
  TUTORIAL_STEPS.forEach((_, i) => {
    const dot = document.createElement("span");
    dot.className = "dot" + (i === tutorialStep ? " active" : "");
    el.tutorialDots.appendChild(dot);
  });
  el.btnTutorialNext.textContent =
    tutorialStep === TUTORIAL_STEPS.length - 1 ? t("start") : t("continue");
}

function showTutorial() {
  tutorialStep = 0;
  renderTutorialStep();
  el.tutorialOverlay.classList.remove("hidden");
}

function closeTutorial() {
  el.tutorialOverlay.classList.add("hidden");
  localStorage.setItem(TUTORIAL_KEY, "1");
}

function maybeShowTutorial() {
  if (localStorage.getItem(TUTORIAL_KEY)) return;
  showTutorial();
}

el.btnTutorialNext.addEventListener("click", () => {
  playClick();
  if (tutorialStep < TUTORIAL_STEPS.length - 1) {
    tutorialStep += 1;
    renderTutorialStep();
  } else {
    closeTutorial();
    // Point out a first safe move so the player gets going.
    setTimeout(showHint, 400);
  }
});

function setupLanguage() {
  for (const lang of LANGUAGES) {
    const opt = document.createElement("option");
    opt.value = lang.code;
    opt.textContent = lang.name;
    el.langSelect.appendChild(opt);
  }
  el.langSelect.value = getLang();
  el.langSelect.addEventListener("change", () => {
    setLang(el.langSelect.value);
    applyAllTranslations();
    playClick();
  });
}

function applyAllTranslations() {
  applyStaticTranslations();
  el.splashLevel.textContent = t("level_label", { n: state.level + 1 });
  if (!el.game.classList.contains("hidden") && state.mode !== "daily") {
    el.levelTitle.textContent = t("level_label", { n: state.level + 1 });
  }
  updateDailyCard();
  renderCollection();
  renderAchievements();
  if (typeof Arcade !== "undefined") Arcade.renderGrid();
  if (!el.tutorialOverlay.classList.contains("hidden")) renderTutorialStep();
}

loadProgress();
loadSettings();
loadStars();
loadRecords();
applySettings();
setupLanguage();
applyStaticTranslations();
renderCollection();
renderAchievements();
// Add Knot Escape as the first card in the mini-games grid — clicking it
// launches the main game at the player's current level.
(window.ARCADE_GAMES = window.ARCADE_GAMES || []).unshift({
  id: "knot-escape",
  emoji: "🪢",
  nameKey: "game_knot_name",
  descKey: "game_knot_desc",
  accent: "var(--accent-deep)",
  launch: () => playLevel(state.level),
});
Arcade.renderGrid();
Ads.init();
updatePremiumUi();
setupBoardZoom();
showTab("home");

// ---------- Native back button (Android, via Capacitor) ----------

(function setupBackButton() {
  const CapApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (!CapApp || !CapApp.addListener) return;

  CapApp.addListener("backButton", () => {
    if (!el.nameOverlay.classList.contains("hidden")) {
      el.nameOverlay.classList.add("hidden");
    } else if (!el.tutorialOverlay.classList.contains("hidden")) {
      closeTutorial();
    } else if (!el.winOverlay.classList.contains("hidden")) {
      el.winOverlay.classList.add("hidden");
    } else if (!el.loseOverlay.classList.contains("hidden")) {
      el.loseOverlay.classList.add("hidden");
    } else if (Arcade.isOpen()) {
      playClick();
      Arcade.closeGame();
    } else if (!el.game.classList.contains("hidden")) {
      playClick();
      showTab(state.returnTab);
    } else if (state.tab !== "home") {
      playClick();
      showTab("home");
    } else {
      CapApp.exitApp();
    }
  });
})();
