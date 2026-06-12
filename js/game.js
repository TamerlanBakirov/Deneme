const DIRS = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
};

const STORAGE_KEY = "arrows-puzzle-progress";

const state = {
  levelIndex: 0,
  arrows: [],
  history: [],
  moveCount: 0,
};

const menuScreen = document.getElementById("menu-screen");
const gameScreen = document.getElementById("game-screen");
const levelGrid = document.getElementById("level-grid");
const board = document.getElementById("board");
const levelNumberEl = document.getElementById("level-number");
const moveCountEl = document.getElementById("move-count");
const winOverlay = document.getElementById("win-overlay");
const winStats = document.getElementById("win-stats");

document.getElementById("btn-menu").addEventListener("click", showMenu);
document.getElementById("btn-restart").addEventListener("click", resetLevel);
document.getElementById("btn-undo").addEventListener("click", undoMove);
document.getElementById("btn-hint").addEventListener("click", showHint);
document.getElementById("btn-replay").addEventListener("click", () => {
  winOverlay.classList.add("hidden");
  resetLevel();
});
document.getElementById("btn-next").addEventListener("click", () => {
  winOverlay.classList.add("hidden");
  const next = state.levelIndex + 1;
  if (next < LEVELS.length) {
    startLevel(next);
  } else {
    showMenu();
  }
});

function getProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function markCompleted(levelIndex) {
  const progress = getProgress();
  progress[levelIndex] = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function showMenu() {
  renderMenu();
  gameScreen.classList.add("hidden");
  menuScreen.classList.remove("hidden");
}

function renderMenu() {
  const progress = getProgress();
  levelGrid.innerHTML = "";
  LEVELS.forEach((_, i) => {
    const btn = document.createElement("button");
    btn.className = "level-btn";
    btn.textContent = String(i + 1);
    if (progress[i]) btn.classList.add("completed");
    btn.addEventListener("click", () => startLevel(i));
    levelGrid.appendChild(btn);
  });
}

function startLevel(index) {
  state.levelIndex = index;
  levelNumberEl.textContent = String(index + 1);
  menuScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  resetLevel();
}

function resetLevel() {
  const level = LEVELS[state.levelIndex];
  state.arrows = level.arrows.map((a) => ({ ...a }));
  state.history = [];
  state.moveCount = 0;
  moveCountEl.textContent = "0";
  winOverlay.classList.add("hidden");
  renderBoard();
}

function pathToEdge(r, c, dir, rows, cols) {
  const { dr, dc } = DIRS[dir];
  const cells = [];
  let cr = r + dr;
  let cc = c + dc;
  while (cr >= 0 && cr < rows && cc >= 0 && cc < cols) {
    cells.push({ r: cr, c: cc });
    cr += dr;
    cc += dc;
  }
  return cells;
}

function isRemovable(arrow) {
  const level = LEVELS[state.levelIndex];
  const path = pathToEdge(arrow.r, arrow.c, arrow.dir, level.rows, level.cols);
  return !path.some((cell) =>
    state.arrows.some((other) => other !== arrow && other.r === cell.r && other.c === cell.c)
  );
}

function renderBoard() {
  const level = LEVELS[state.levelIndex];
  board.style.gridTemplateColumns = `repeat(${level.cols}, 1fr)`;
  board.style.gridTemplateRows = `repeat(${level.rows}, 1fr)`;
  board.innerHTML = "";

  const cellMap = {};
  for (let r = 0; r < level.rows; r++) {
    for (let c = 0; c < level.cols; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      board.appendChild(cell);
      cellMap[`${r},${c}`] = cell;
    }
  }

  state.arrows.forEach((arrow) => {
    const wrap = document.createElement("div");
    wrap.className = "arrow-wrap";
    const inner = document.createElement("div");
    inner.className = `arrow dir-${arrow.dir}`;
    wrap.appendChild(inner);
    wrap.addEventListener("click", () => handleArrowClick(arrow, wrap));
    cellMap[`${arrow.r},${arrow.c}`].appendChild(wrap);
  });
}

function handleArrowClick(arrow, wrapEl) {
  if (!isRemovable(arrow)) {
    wrapEl.classList.remove("shake");
    // restart animation
    requestAnimationFrame(() => wrapEl.classList.add("shake"));
    setTimeout(() => wrapEl.classList.remove("shake"), 350);
    return;
  }

  state.history.push(state.arrows.map((a) => ({ ...a })));

  wrapEl.classList.add(`exit-${arrow.dir}`);

  setTimeout(() => {
    state.arrows = state.arrows.filter((a) => a !== arrow);
    state.moveCount++;
    moveCountEl.textContent = String(state.moveCount);
    renderBoard();

    if (state.arrows.length === 0) {
      onLevelComplete();
    }
  }, 250);
}

function undoMove() {
  if (state.history.length === 0) return;
  state.arrows = state.history.pop();
  state.moveCount = Math.max(0, state.moveCount - 1);
  moveCountEl.textContent = String(state.moveCount);
  renderBoard();
}

function showHint() {
  const target = state.arrows.find((a) => isRemovable(a));
  if (!target) return;
  const wraps = board.querySelectorAll(".arrow-wrap");
  state.arrows.forEach((arrow, i) => {
    if (arrow === target) {
      wraps[i].classList.add("hint");
      setTimeout(() => wraps[i].classList.remove("hint"), 1500);
    }
  });
}

function onLevelComplete() {
  markCompleted(state.levelIndex);
  renderMenu();
  winStats.textContent = `Solved in ${state.moveCount} moves.`;
  winOverlay.classList.remove("hidden");
}

renderMenu();
