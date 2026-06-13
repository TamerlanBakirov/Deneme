const SVG_NS = "http://www.w3.org/2000/svg";
const DIRS = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
};
const MAX_HEARTS = 5;
const STORAGE_KEY = "arrows-escape-progress";
const DAILY_KEY = "arrows-escape-daily";
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
};

const el = {
  splash: document.getElementById("splash-screen"),
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
};

document.getElementById("btn-play").addEventListener("click", () => playLevel(state.level));
document.getElementById("btn-back").addEventListener("click", showSplash);
document.getElementById("btn-restart").addEventListener("click", () => {
  if (state.mode === "daily") startDaily();
  else playLevel(state.level);
});
el.btnNext.addEventListener("click", () => {
  el.winOverlay.classList.add("hidden");
  if (state.mode !== "daily") {
    state.level = Math.min(state.level + 1, LEVELS.length - 1);
  }
  showSplash();
});
document.getElementById("btn-retry").addEventListener("click", () => {
  el.loseOverlay.classList.add("hidden");
  if (state.mode === "daily") startDaily();
  else playLevel(state.level);
});
el.btnDaily.addEventListener("click", startDaily);

function loadProgress() {
  const saved = parseInt(localStorage.getItem(STORAGE_KEY), 10);
  if (!isNaN(saved) && saved >= 0 && saved < LEVELS.length) state.level = saved;
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, String(state.level));
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
  const seed = hashSeed(`arrows-daily-${dateKey()}`);
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

  el.splash.classList.add("hidden");
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

function showSplash() {
  if (state.gameClockInterval) {
    clearInterval(state.gameClockInterval);
    state.gameClockInterval = null;
  }
  el.dailyClock.classList.add("hidden");
  el.splashNum.textContent = String(state.level + 1);
  el.game.classList.add("hidden");
  el.winOverlay.classList.add("hidden");
  el.loseOverlay.classList.add("hidden");
  el.splash.classList.remove("hidden");
  updateDailyCard();
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

  el.splash.classList.add("hidden");
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
    minR, minC, cell, pad,
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

  for (const arrow of state.arrows) {
    if (arrow.removed) continue;
    el.board.appendChild(buildArrowEl(arrow));
  }
}

function buildArrowEl(arrow) {
  const g = state.geom;
  const group = document.createElementNS(SVG_NS, "g");
  group.setAttribute("class", "arrow-group");

  const pts = arrow.cells.map(([r, c]) => cellToXY(r, c));
  const head = pts[pts.length - 1];
  const { dr, dc } = DIRS[arrow.dir];
  const headBack = pts.length > 1 ? pts[pts.length - 2] : { x: head.x - dc * g.cell, y: head.y - dr * g.cell };

  // Stroke stops short of the head tip so the triangle sits cleanly on the end.
  const tip = { x: head.x + dc * g.cell * 0.42, y: head.y + dr * g.cell * 0.42 };
  const base = { x: head.x - dc * g.cell * 0.12, y: head.y - dr * g.cell * 0.12 };

  const strokeW = g.cell * 0.2;
  const linePts = pts.slice(0, -1).concat([base]);
  if (pts.length === 1) linePts[0] = headBack;

  const poly = document.createElementNS(SVG_NS, "polyline");
  poly.setAttribute("class", "arrow-stroke");
  poly.setAttribute("points", linePts.map((p) => `${p.x},${p.y}`).join(" "));
  poly.setAttribute("stroke-width", String(strokeW));
  group.appendChild(poly);

  // Arrowhead triangle pointing in the travel direction.
  const hw = g.cell * 0.3; // half width
  const perp = { x: -dr, y: dc }; // perpendicular unit-ish (dr/dc are 0/±1)
  const p1 = `${tip.x},${tip.y}`;
  const p2 = `${base.x + perp.x * hw},${base.y + perp.y * hw}`;
  const p3 = `${base.x - perp.x * hw},${base.y - perp.y * hw}`;
  const tri = document.createElementNS(SVG_NS, "polygon");
  tri.setAttribute("class", "arrow-head");
  tri.setAttribute("points", `${p1} ${p2} ${p3}`);
  group.appendChild(tri);

  group.addEventListener("click", () => handleClick(arrow, group));
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

// Slither the arrow off the board: it eases forward along its travel
// direction while wiggling side to side like a snake, fading out near the edge.
function animateLeave(arrow, group, onDone) {
  const g = state.geom;
  const { dr, dc } = DIRS[arrow.dir];
  const dist = Math.max(g.width, g.height) * 1.2;
  const perpX = -dr;
  const perpY = dc;
  const amplitude = g.cell * 0.22;
  const cycles = Math.min(3, Math.max(1, Math.ceil(arrow.cells.length / 1.5)));
  const steps = 14;

  const keyframes = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const forward = dist * (t * t);
    const wiggle = Math.sin(t * Math.PI * cycles) * amplitude * (1 - t);
    const x = dc * forward + perpX * wiggle;
    const y = dr * forward + perpY * wiggle;
    const opacity = t < 0.7 ? 1 : Math.max(0, 1 - (t - 0.7) / 0.3);
    keyframes.push({ transform: `translate(${x}px, ${y}px)`, opacity });
  }

  const anim = group.animate(keyframes, { duration: 520, easing: "linear", fill: "forwards" });
  anim.onfinish = onDone;
}

function handleClick(arrow, group) {
  if (arrow.removed) return;

  if (!isRemovable(arrow)) {
    loseHeart();
    group.classList.add("blocked");
    setTimeout(() => group.classList.remove("blocked"), 380);
    return;
  }

  arrow.removed = true;
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
  el.winTitle.textContent = "Level Complete!";
  el.winStats.textContent = `You escaped level ${cleared}.`;
  el.winDailyInfo.classList.add("hidden");
  el.btnNext.textContent = "Continue";
  if (state.level < LEVELS.length - 1) {
    state.level += 1;
    saveProgress();
  }
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
  el.winOverlay.classList.remove("hidden");
}

loadProgress();
showSplash();
