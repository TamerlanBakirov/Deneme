const SVG_NS = "http://www.w3.org/2000/svg";
const DIRS = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
};
const MAX_HEARTS = 5;
const STORAGE_KEY = "arrows-escape-progress";

const state = {
  level: 0,
  arrows: [], // { cells:[[r,c]...], dir, removed }
  hearts: MAX_HEARTS,
  geom: null, // layout info for the current board
};

const el = {
  splash: document.getElementById("splash-screen"),
  game: document.getElementById("game-screen"),
  splashNum: document.getElementById("splash-level-num"),
  gameNum: document.getElementById("game-level-num"),
  hearts: document.getElementById("hearts"),
  board: document.getElementById("board"),
  winOverlay: document.getElementById("win-overlay"),
  winStats: document.getElementById("win-stats"),
  loseOverlay: document.getElementById("lose-overlay"),
};

document.getElementById("btn-play").addEventListener("click", () => playLevel(state.level));
document.getElementById("btn-back").addEventListener("click", showSplash);
document.getElementById("btn-restart").addEventListener("click", () => playLevel(state.level));
document.getElementById("btn-next").addEventListener("click", () => {
  el.winOverlay.classList.add("hidden");
  state.level = Math.min(state.level + 1, LEVELS.length - 1);
  showSplash();
});
document.getElementById("btn-retry").addEventListener("click", () => {
  el.loseOverlay.classList.add("hidden");
  playLevel(state.level);
});

function loadProgress() {
  const saved = parseInt(localStorage.getItem(STORAGE_KEY), 10);
  if (!isNaN(saved) && saved >= 0 && saved < LEVELS.length) state.level = saved;
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, String(state.level));
}

function showSplash() {
  el.splashNum.textContent = String(state.level + 1);
  el.game.classList.add("hidden");
  el.winOverlay.classList.add("hidden");
  el.loseOverlay.classList.add("hidden");
  el.splash.classList.remove("hidden");
}

function playLevel(index) {
  state.level = index;
  saveProgress();
  const level = LEVELS[index];
  state.arrows = level.arrows.map((a) => ({
    cells: a.cells.map((c) => [...c]),
    dir: a.dir,
    removed: false,
  }));
  state.hearts = MAX_HEARTS;

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

function handleClick(arrow, group) {
  if (arrow.removed) return;

  if (!isRemovable(arrow)) {
    loseHeart();
    group.classList.add("blocked");
    setTimeout(() => group.classList.remove("blocked"), 380);
    return;
  }

  arrow.removed = true;
  const g = state.geom;
  const { dr, dc } = DIRS[arrow.dir];
  const dist = Math.max(g.width, g.height) * 1.2;
  group.classList.add("leaving");
  group.style.transform = `translate(${dc * dist}px, ${dr * dist}px)`;

  setTimeout(() => {
    group.remove();
    if (state.arrows.every((a) => a.removed)) onWin();
  }, 320);
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
    setTimeout(() => el.loseOverlay.classList.remove("hidden"), 450);
  }
}

function onWin() {
  const cleared = state.level + 1;
  el.winStats.textContent = `You escaped level ${cleared}.`;
  if (state.level < LEVELS.length - 1) {
    state.level += 1;
    saveProgress();
  }
  el.winOverlay.classList.remove("hidden");
}

loadProgress();
showSplash();
