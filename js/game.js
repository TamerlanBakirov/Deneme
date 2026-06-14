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
const DAILY_CONFIG = { rows: 8, cols: 8, fillTarget: 0.68, maxLen: 5 };

const state = {
  level: 0,
  arrows: [], // { cells:[[r,c]...], dir, removed }
  hearts: MAX_HEARTS,
  geom: null, // layout info for the current board
  mode: "level", // "level" | "daily"
  dailyStart: 0,
  gameClockInterval: null,
  dailyCountdownInterval: null,
  tab: "home", // "home" | "challenge" | "collection" | "settings"
  returnTab: "home",
  settings: { sound: true, vibration: true, dark: false },
};

const el = {
  home: document.getElementById("home-screen"),
  challenge: document.getElementById("challenge-screen"),
  collection: document.getElementById("collection-screen"),
  settings: document.getElementById("settings-screen"),
  game: document.getElementById("game-screen"),
  splashNum: document.getElementById("splash-level-num"),
  gameNum: document.getElementById("game-level-num"),
  levelTitle: document.getElementById("level-title"),
  dailyTitle: document.getElementById("daily-title"),
  dailyClock: document.getElementById("daily-clock"),
  hearts: document.getElementById("hearts"),
  board: document.getElementById("board"),
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
  bottomNav: document.getElementById("bottom-nav"),
  navBtns: document.querySelectorAll(".nav-btn"),
  levelGrid: document.getElementById("level-grid"),
  app: document.querySelector(".app"),
  toggleSound: document.getElementById("toggle-sound"),
  toggleVibration: document.getElementById("toggle-vibration"),
  toggleDark: document.getElementById("toggle-dark"),
  btnResetProgress: document.getElementById("btn-reset-progress"),
};

document.getElementById("btn-play").addEventListener("click", () => playLevel(state.level));
document.getElementById("btn-back").addEventListener("click", () => showTab(state.returnTab));
document.getElementById("btn-restart").addEventListener("click", () => {
  if (state.mode === "daily") startDaily();
  else playLevel(state.level);
});
el.btnNext.addEventListener("click", () => {
  el.winOverlay.classList.add("hidden");
  if (state.mode !== "daily") {
    state.level = Math.min(state.level + 1, LEVELS.length - 1);
  }
  showTab(state.returnTab);
});
document.getElementById("btn-retry").addEventListener("click", () => {
  el.loseOverlay.classList.add("hidden");
  if (state.mode === "daily") startDaily();
  else playLevel(state.level);
});
el.btnDaily.addEventListener("click", startDaily);

el.navBtns.forEach((btn) => {
  btn.addEventListener("click", () => showTab(btn.dataset.tab));
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

el.btnResetProgress.addEventListener("click", () => {
  if (!confirm("Tüm seviye ilerlemen sıfırlanacak. Emin misin?")) return;
  state.level = 0;
  saveProgress();
  el.splashNum.textContent = "1";
  renderCollection();
});

function loadProgress() {
  const saved = parseInt(localStorage.getItem(STORAGE_KEY), 10);
  if (!isNaN(saved) && saved >= 0 && saved < LEVELS.length) state.level = saved;
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, String(state.level));
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
  el.toggleSound.classList.toggle("on", state.settings.sound);
  el.toggleSound.setAttribute("aria-checked", String(state.settings.sound));
  el.toggleVibration.classList.toggle("on", state.settings.vibration);
  el.toggleVibration.setAttribute("aria-checked", String(state.settings.vibration));
  el.toggleDark.classList.toggle("on", state.settings.dark);
  el.toggleDark.setAttribute("aria-checked", String(state.settings.dark));
}

// ---------- Sound & haptics ----------

let audioCtx = null;

function playTone(freq, duration, type) {
  if (!state.settings.sound) return;
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type || "sine";
  osc.frequency.value = freq;
  gain.gain.value = 0.12;
  osc.connect(gain).connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.start(now);
  osc.stop(now + duration);
}

function vibrate(pattern) {
  if (!state.settings.vibration) return;
  if (navigator.vibrate) navigator.vibrate(pattern);
}

function playWinChime() {
  playTone(660, 0.12);
  setTimeout(() => playTone(880, 0.18), 110);
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
  const { rows, cols, fillTarget, maxLen } = DAILY_CONFIG;
  return LevelGenerator.generateLevel(rows, cols, fillTarget, maxLen, seed);
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
    el.btnDaily.textContent = "Tekrar Oyna";
    el.dailyStatus.textContent = `Bugünkü en iyi skorun: ${record.score} puan • ${formatClock(record.timeMs)}`;
  } else {
    el.btnDaily.textContent = "Günlük Göreve Başla";
    el.dailyStatus.textContent = "Bugünün özel görevini çöz ve hızını ölç!";
  }

  if (state.dailyCountdownInterval) clearInterval(state.dailyCountdownInterval);
  const tick = () => {
    el.dailyTimer.textContent = "Yeni görev: " + formatHMS(msUntilNextMidnight());
  };
  tick();
  state.dailyCountdownInterval = setInterval(tick, 1000);
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
  el.dailyClock.classList.add("hidden");
  el.game.classList.add("hidden");
  el.winOverlay.classList.add("hidden");
  el.loseOverlay.classList.add("hidden");
  el.bottomNav.classList.remove("hidden");

  el.home.classList.toggle("hidden", tab !== "home");
  el.challenge.classList.toggle("hidden", tab !== "challenge");
  el.collection.classList.toggle("hidden", tab !== "collection");
  el.settings.classList.toggle("hidden", tab !== "settings");

  el.navBtns.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tab));

  el.splashNum.textContent = String(state.level + 1);
  updateDailyCard();
  if (tab === "collection") renderCollection();
}

function renderCollection() {
  el.levelGrid.innerHTML = "";
  for (let i = 0; i < LEVELS.length; i++) {
    const cell = document.createElement("button");
    cell.className = "level-cell";
    if (i < state.level) cell.classList.add("done");
    else if (i === state.level) cell.classList.add("current");
    else cell.classList.add("locked");
    cell.textContent = String(i + 1);
    cell.disabled = i > state.level;
    if (i <= state.level) cell.addEventListener("click", () => playLevel(i));
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
  const level = LEVELS[index];
  state.arrows = level.arrows.map((a) => ({
    cells: a.cells.map((c) => [...c]),
    dir: a.dir,
    removed: false,
  }));
  state.hearts = MAX_HEARTS;

  el.dailyTitle.classList.add("hidden");
  el.levelTitle.classList.remove("hidden");
  el.dailyClock.classList.add("hidden");
  el.gameNum.textContent = String(index + 1);

  state.returnTab = state.tab;
  hideTabScreens();
  el.winOverlay.classList.add("hidden");
  el.loseOverlay.classList.add("hidden");
  el.game.classList.remove("hidden");

  renderHearts();
  computeGeometry();
  renderBoard();
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
  group.setAttribute("class", "arrow-group");

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

// Drive the arrow off the board like a train leaving the station. The whole
// arrow — body, head and arrowhead — rides one shared path: its own bent shape
// (tail → head) extended straight off the board in the travel direction. Every
// vertex advances the same arc-length each frame, so the shape stays rigid (no
// stretching) while each body segment faithfully tracks the bends ahead of it.
// Because the head's lane is already clear, the train never touches another
// arrow.
function animateLeave(arrow, group, onDone) {
  const g = state.geom;
  const cell = g.cell;
  const { dr, dc } = DIRS[arrow.dir];
  const dir = { x: dc, y: dr };
  const perp = { x: -dr, y: dc };

  const pts = arrow.cells.map(([r, c]) => cellToXY(r, c));
  const n = pts.length;
  const head = pts[n - 1];
  const exitDist = Math.max(g.width, g.height) * 1.3;
  const exitPoint = { x: head.x + dir.x * exitDist, y: head.y + dir.y * exitDist };
  const waypoints = pts.concat([exitPoint]);

  // Cumulative arc length along the shared path.
  const seg = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i], b = waypoints[i + 1];
    seg.push(Math.hypot(b.x - a.x, b.y - a.y) || 1);
  }
  const cum = [0];
  for (let i = 0; i < seg.length; i++) cum.push(cum[i] + seg[i]);
  const totalArc = cum[cum.length - 1];

  // Position of a point at arc-length s, extrapolating past either end.
  function at(s) {
    if (s <= 0) {
      const a = waypoints[0], b = waypoints[1];
      const ux = (b.x - a.x) / seg[0], uy = (b.y - a.y) / seg[0];
      return { x: a.x + ux * s, y: a.y + uy * s };
    }
    for (let i = 0; i < seg.length; i++) {
      if (s <= cum[i + 1] || i === seg.length - 1) {
        const t = (s - cum[i]) / seg[i];
        const a = waypoints[i], b = waypoints[i + 1];
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      }
    }
    return waypoints[waypoints.length - 1];
  }

  const poly = group.querySelector(".arrow-stroke");
  const tri = group.querySelector(".arrow-head");
  const knot = group.querySelector(".arrow-knot");
  const hw = cell * 0.24;

  // The tail knot sits at the rope's starting point; for a single-cell arrow
  // that's a short way behind the head, off the front of the shared path.
  const tailArc = n > 1 ? 0 : -cell * TAIL_OFFSET;

  const headArc = cum[n - 1];
  // Polyline runs from the tail up to the arrowhead base.
  const bodyArcs = [];
  if (n === 1) bodyArcs.push(tailArc);
  for (let i = 0; i < n - 1; i++) bodyArcs.push(cum[i]);
  bodyArcs.push(headArc - cell * 0.16);
  const baseArc = headArc - cell * 0.16;
  const tipArc = headArc + cell * 0.36;

  const duration = Math.min(640, 360 + (n - 1) * 45);
  const start = performance.now();

  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    // Start moving immediately, then accelerate away.
    const eased = 0.2 * t + 0.8 * t * t;
    const d = totalArc * eased;

    const linePts = bodyArcs.map((s) => at(s + d));
    poly.setAttribute("points", linePts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" "));

    const c = at(baseArc + d);
    const tp = at(tipArc + d);
    const p2 = { x: c.x + perp.x * hw, y: c.y + perp.y * hw };
    const p3 = { x: c.x - perp.x * hw, y: c.y - perp.y * hw };
    tri.setAttribute("points",
      `${tp.x.toFixed(2)},${tp.y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)} ${p3.x.toFixed(2)},${p3.y.toFixed(2)}`);

    const tailPt = at(tailArc + d);
    knot.setAttribute("cx", tailPt.x.toFixed(2));
    knot.setAttribute("cy", tailPt.y.toFixed(2));

    group.style.opacity = t < 0.78 ? "1" : String(Math.max(0, 1 - (t - 0.78) / 0.22));

    if (t < 1) requestAnimationFrame(frame);
    else onDone();
  }
  requestAnimationFrame(frame);
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
  playTone(520, 0.08);
  group.classList.add("leaving");
  animateLeave(arrow, group, () => {
    group.remove();
    if (state.arrows.every((a) => a.removed)) onWin();
  });
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
  el.winTitle.textContent = "Seviye Tamamlandı!";
  el.winStats.textContent = `${cleared}. seviyeden kaçtın.`;
  el.winDailyInfo.classList.add("hidden");
  el.btnNext.textContent = "Devam";
  if (state.level < LEVELS.length - 1) {
    state.level += 1;
    saveProgress();
  }
  playWinChime();
  el.winOverlay.classList.remove("hidden");
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

  el.winTitle.textContent = "Günlük Görev Tamamlandı!";
  el.winStats.textContent = `Süre: ${formatClock(timeMs)} • Kalan can: ${heartsLeft}`;
  el.winDailyScore.textContent = isBest
    ? `Skor: ${score} (yeni en iyi!)`
    : `Skor: ${score} (en iyin: ${prev.score})`;
  el.winDailyNext.textContent = `Yeni görev ${formatHMS(msUntilNextMidnight())} sonra`;
  el.winDailyInfo.classList.remove("hidden");
  el.btnNext.textContent = "Tamam";
  playWinChime();
  el.winOverlay.classList.remove("hidden");
}

loadProgress();
loadSettings();
applySettings();
renderCollection();
showTab("home");
