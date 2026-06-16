// Color Connect (Flow Free style) — drag between matching dots to draw pipes;
// fill every cell and connect every pair to solve. Self-contained arcade module;
// see js/arcade.js for the host contract.
//
// Knot-Escape-style level system: 8 levels (square grids, sizes 5-8), level
// select grid with stars/locks (via ArcadeUI), and a per-level result overlay.
// Star rating rewards clean solves: redrawing a color's path (restarting it
// from an endpoint after it was already complete or partially drawn) costs
// stars — 3★ for a flawless run with zero redraws, 2★ for up to two, 1★
// otherwise.
window.ARCADE_GAMES = window.ARCADE_GAMES || [];
(function () {
  const TOTAL_LEVELS = 8;
  const STYLE_ID = "flow-game-style";

  // --- Local i18n fallback (English + Turkish; cannot edit i18n.js) ---
  const STR = {
    en: {
      connect: "Connect all pairs and fill every cell",
      reset: "Reset",
      redraws: "Redraws",
      flawless: "Flawless solve — every path drawn once!",
      all_levels_done: "All levels complete — nice work!",
    },
    tr: {
      connect: "Tüm çiftleri bağla ve her hücreyi doldur",
      reset: "Sıfırla",
      redraws: "Yeniden çizim",
      flawless: "Kusursuz çözüm — her yol tek seferde çizildi!",
      all_levels_done: "Tüm seviyeler tamam — harika iş!",
    },
  };
  function lang() {
    const l = (document.documentElement.lang || navigator.language || "en")
      .slice(0, 2)
      .toLowerCase();
    return STR[l] ? l : "en";
  }
  function L(k) {
    return (STR[lang()] && STR[lang()][k]) || STR.en[k] || k;
  }

  // --- Vivid pipe palette (index = color id within a puzzle) ---
  const PALETTE = [
    "#e2362f", // red
    "#27a844", // green
    "#2b6ef0", // blue
    "#f2c014", // yellow
    "#ef7d18", // orange
    "#16c2c2", // cyan
    "#c145d6", // magenta
    "#8d5a2b", // brown
  ];

  // --- Solver-verified, KNOWN-SOLVABLE puzzles (full fill + all pairs connected) ---
  // endpoints: array of {a:[r,c], b:[r,c]}; color id = array index.
  const PUZZLES = [
    { size: 5, endpoints: [
      { a: [2, 0], b: [0, 1] }, { a: [0, 2], b: [1, 1] }, { a: [2, 1], b: [4, 4] },
      { a: [4, 3], b: [4, 1] }, { a: [4, 0], b: [3, 1] },
    ] },
    { size: 5, endpoints: [
      { a: [4, 2], b: [4, 4] }, { a: [3, 4], b: [0, 3] }, { a: [0, 2], b: [0, 0] },
      { a: [1, 0], b: [4, 0] }, { a: [4, 1], b: [3, 3] }, { a: [2, 3], b: [1, 1] },
    ] },
    { size: 6, endpoints: [
      { a: [4, 5], b: [2, 0] }, { a: [1, 0], b: [0, 5] }, { a: [1, 5], b: [4, 3] },
      { a: [3, 3], b: [2, 1] }, { a: [1, 1], b: [2, 3] }, { a: [1, 3], b: [2, 4] },
    ] },
    { size: 6, endpoints: [
      { a: [2, 0], b: [3, 1] }, { a: [3, 0], b: [4, 2] }, { a: [5, 2], b: [1, 5] },
      { a: [0, 5], b: [2, 2] }, { a: [2, 3], b: [0, 3] }, { a: [0, 2], b: [1, 2] },
    ] },
    { size: 7, endpoints: [
      { a: [6, 0], b: [0, 0] }, { a: [0, 1], b: [4, 6] }, { a: [5, 6], b: [6, 1] },
      { a: [5, 1], b: [3, 2] }, { a: [4, 2], b: [3, 3] }, { a: [2, 3], b: [2, 5] },
      { a: [2, 4], b: [3, 5] },
    ] },
    { size: 7, endpoints: [
      { a: [0, 0], b: [4, 0] }, { a: [5, 0], b: [2, 1] }, { a: [1, 1], b: [3, 6] },
      { a: [4, 6], b: [3, 2] }, { a: [2, 2], b: [1, 4] }, { a: [1, 5], b: [2, 3] },
      { a: [3, 3], b: [5, 3] },
    ] },
    { size: 7, endpoints: [
      { a: [2, 6], b: [5, 6] }, { a: [6, 6], b: [5, 2] }, { a: [5, 3], b: [4, 2] },
      { a: [4, 1], b: [1, 0] }, { a: [0, 0], b: [2, 1] }, { a: [3, 1], b: [0, 2] },
      { a: [0, 3], b: [1, 6] }, { a: [1, 5], b: [3, 5] },
    ] },
    { size: 8, endpoints: [
      { a: [1, 7], b: [3, 7] }, { a: [4, 7], b: [3, 6] }, { a: [3, 5], b: [7, 1] },
      { a: [7, 0], b: [2, 0] }, { a: [1, 0], b: [5, 1] }, { a: [6, 1], b: [0, 2] },
      { a: [0, 3], b: [1, 5] }, { a: [1, 4], b: [0, 5] },
    ] },
  ];

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `
      .flow-wrap { display:flex; flex-direction:column; min-height:0; flex:1; width:100%;
        height:100%; gap:10px; padding:14px; box-sizing:border-box; }
      .flow-bar { display:flex; align-items:center; justify-content:space-between; width:100%;
        gap:10px; flex-wrap:wrap; }
      .flow-info { display:flex; flex-direction:column; gap:2px; }
      .flow-level-label { font-size:16px; font-weight:800; color:var(--accent-deep); }
      .flow-hint { color:var(--muted); font-size:12px; line-height:1.3; max-width:320px; }
      .flow-board { position:relative; background:var(--panel); border-radius:16px;
        box-shadow:0 6px 18px rgba(40,30,15,.12); padding:8px; box-sizing:border-box;
        touch-action:none; }
      .flow-grid { position:absolute; inset:8px; display:grid; }
      .flow-cell { position:relative; box-sizing:border-box; border:1px solid var(--divider); }
      .flow-svg { position:absolute; inset:8px; width:calc(100% - 16px); height:calc(100% - 16px);
        pointer-events:none; }
      .flow-dot { position:absolute; border-radius:50%; transform:translate(-50%,-50%);
        z-index:3; pointer-events:none; box-shadow:0 1px 3px rgba(0,0,0,.3); }
      .flow-dot.done { box-shadow:0 0 0 3px rgba(255,255,255,.55), 0 1px 4px rgba(0,0,0,.35); }
      .flow-progress { color:var(--muted); font-size:12px; font-variant-numeric:tabular-nums; }
      .flow-level-overlay { position:absolute; inset:0; border-radius:16px; display:flex;
        flex-direction:column; align-items:center; justify-content:center; gap:10px; text-align:center;
        padding:18px; box-sizing:border-box; background:rgba(28,24,18,.78); color:#fff;
        animation:flow-fade .25s var(--ease-out); z-index:8; }
      .flow-level-overlay h3 { font-size:24px; font-weight:800; margin:0; }
      .flow-level-overlay p { font-size:15px; margin:0; opacity:.9; }
      .flow-level-overlay .star-row { color:rgba(255,255,255,.3); }
      @keyframes flow-fade { from { opacity:0; } to { opacity:1; } }
    `;
    document.head.appendChild(s);
  }

  // --- module state ---
  let api = null;
  let root = null;
  let view = "select"; // "select" | "play"
  let level = 0;        // current level index (0-based)
  let puzzleIndex = 0;
  let size = 5;
  let endpoints = [];
  // cellOwner[r][c] = color id or -1 ; part of a path
  let cellOwner = [];
  // paths[color] = ordered array of [r,c] from endpoint a outward (may be partial)
  let paths = [];
  let boardArea = null;
  let boardEl = null;
  let gridEl = null;
  let svgEl = null;
  let dotsLayer = null;
  let progressEl = null;
  let resizeHandler = null;

  // drag state
  let dragColor = -1;
  let dragging = false;
  let pointerId = null;
  let cellPx = 0; // computed pixel size of a cell
  let redraws = 0; // path redraws this attempt (used for star rating)
  let solved = false;

  function key(r, c) { return r + "," + c; }

  function buildEndpointMap() {
    const m = {};
    endpoints.forEach((e, ci) => {
      m[key(e.a[0], e.a[1])] = ci;
      m[key(e.b[0], e.b[1])] = ci;
    });
    return m;
  }
  let endpointMap = {};

  function isEndpoint(r, c) {
    return Object.prototype.hasOwnProperty.call(endpointMap, key(r, c));
  }
  function endpointColor(r, c) {
    return endpointMap[key(r, c)];
  }
  function isEndpointOfColor(r, c, ci) {
    const e = endpoints[ci];
    return (e.a[0] === r && e.a[1] === c) || (e.b[0] === r && e.b[1] === c);
  }

  function loadPuzzle(idx) {
    puzzleIndex = idx;
    const p = PUZZLES[idx];
    size = p.size;
    endpoints = p.endpoints.map((e) => ({ a: e.a.slice(), b: e.b.slice() }));
    endpointMap = buildEndpointMap();
    cellOwner = Array.from({ length: size }, () => Array(size).fill(-1));
    paths = endpoints.map(() => []);
    redraws = 0;
    solved = false;
    // endpoints occupy their cells
    endpoints.forEach((e, ci) => {
      cellOwner[e.a[0]][e.a[1]] = ci;
      cellOwner[e.b[0]][e.b[1]] = ci;
    });
    renderBoard();
    updateHeader();
  }

  function updateHeader() {
    api.setScore(L("redraws") + ": " + redraws);
  }

  // ---- Level select ----
  function showLevelSelect() {
    view = "select";
    removeDocListeners();
    dragging = false;
    pointerId = null;
    boardArea = null;
    boardEl = gridEl = svgEl = dotsLayer = progressEl = null;
    root.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "arcade-level-select";

    const hint = document.createElement("p");
    hint.className = "arcade-level-hint";
    hint.textContent = ArcadeUI.t("tap_to_play");
    wrap.appendChild(hint);

    const gridHost = document.createElement("div");
    wrap.appendChild(gridHost);
    root.appendChild(wrap);

    const progress = ArcadeUI.loadProgress("flow", TOTAL_LEVELS);
    ArcadeUI.renderLevelGrid(gridHost, {
      total: TOTAL_LEVELS,
      progress,
      onSelect: (i) => startLevel(i),
    });

    api.setScore("");
  }

  // ---- Play view ----
  function startLevel(i) {
    level = Math.max(0, Math.min(i, TOTAL_LEVELS - 1));
    view = "play";
    buildPlayUI();
    loadPuzzle(level);
  }

  function buildPlayUI() {
    root.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "flow-wrap";

    const bar = document.createElement("div");
    bar.className = "flow-bar";

    const info = document.createElement("div");
    info.className = "flow-info";
    const levelLabel = document.createElement("div");
    levelLabel.className = "flow-level-label";
    levelLabel.textContent = ArcadeUI.t("level_n", { n: level + 1 });
    const hintLabel = document.createElement("div");
    hintLabel.className = "flow-hint";
    hintLabel.textContent = L("connect");
    info.appendChild(levelLabel);
    info.appendChild(hintLabel);

    const actions = document.createElement("div");
    actions.className = "g2048-actions";
    actions.style.display = "flex";
    actions.style.alignItems = "center";
    actions.style.gap = "8px";

    const resetBtn = document.createElement("button");
    resetBtn.className = "arcade-btn";
    resetBtn.textContent = L("reset");
    resetBtn.addEventListener("click", () => {
      api.playClick();
      loadPuzzle(puzzleIndex);
    });

    const levelsBtn = document.createElement("button");
    levelsBtn.className = "arcade-levels-btn";
    levelsBtn.textContent = ArcadeUI.t("levels");
    levelsBtn.addEventListener("click", () => { api.playClick(); showLevelSelect(); });

    actions.appendChild(resetBtn);
    actions.appendChild(levelsBtn);

    bar.appendChild(info);
    bar.appendChild(actions);

    boardArea = document.createElement("div");
    boardArea.className = "arcade-board-area";

    boardEl = document.createElement("div");
    boardEl.className = "flow-board";

    gridEl = document.createElement("div");
    gridEl.className = "flow-grid";

    svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgEl.setAttribute("class", "flow-svg");
    svgEl.setAttribute("preserveAspectRatio", "none");
    boardEl.appendChild(gridEl);
    boardEl.appendChild(svgEl);

    dotsLayer = document.createElement("div");
    dotsLayer.style.position = "absolute";
    dotsLayer.style.inset = "8px";
    dotsLayer.style.pointerEvents = "none";
    boardEl.appendChild(dotsLayer);

    boardEl.addEventListener("pointerdown", onPointerDown);

    boardArea.appendChild(boardEl);

    const progressRow = document.createElement("div");
    progressEl = document.createElement("span");
    progressEl.className = "flow-progress";
    progressRow.appendChild(progressEl);

    wrap.appendChild(bar);
    wrap.appendChild(boardArea);
    wrap.appendChild(progressRow);
    root.appendChild(wrap);

    ArcadeUI.fitSquare(boardArea, boardEl);
  }

  // Rebuild the grid cells + size the board for the current puzzle, then draw.
  function renderBoard() {
    if (!boardEl) return;
    gridEl.innerHTML = "";
    gridEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    gridEl.style.gridTemplateRows = `repeat(${size}, 1fr)`;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = document.createElement("div");
        cell.className = "flow-cell";
        cell.dataset.r = r;
        cell.dataset.c = c;
        gridEl.appendChild(cell);
      }
    }

    ArcadeUI.fitSquare(boardArea, boardEl);

    // layout-dependent draw after a frame so sizes are known
    requestAnimationFrame(() => {
      drawDots();
      redrawPaths();
      updateProgress();
    });
  }

  function boardMetrics() {
    // svg / grid inset region is 8px inside board; use svg client rect
    const rect = svgEl.getBoundingClientRect();
    cellPx = rect.width / size;
    return rect;
  }

  function cellCenter(r, c) {
    // center in svg local coordinates (svg uses pixel viewBox via getBoundingClientRect width)
    return { x: (c + 0.5) * cellPx, y: (r + 0.5) * cellPx };
  }

  function drawDots() {
    boardMetrics();
    const rect = svgEl.getBoundingClientRect();
    svgEl.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
    dotsLayer.innerHTML = "";
    const dotSize = Math.max(14, cellPx * 0.56);
    endpoints.forEach((e, ci) => {
      [e.a, e.b].forEach((cell) => {
        const d = document.createElement("div");
        d.className = "flow-dot";
        const ctr = cellCenter(cell[0], cell[1]);
        d.style.width = dotSize + "px";
        d.style.height = dotSize + "px";
        d.style.left = ctr.x + "px";
        d.style.top = ctr.y + "px";
        d.style.background = PALETTE[ci % PALETTE.length];
        d.dataset.color = ci;
        dotsLayer.appendChild(d);
      });
    });
  }

  function redrawPaths() {
    if (!svgEl) return;
    while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
    const lw = Math.max(8, cellPx * 0.34);
    paths.forEach((path, ci) => {
      if (path.length < 2) return;
      let dStr = "";
      path.forEach((cell, i) => {
        const ctr = cellCenter(cell[0], cell[1]);
        dStr += (i === 0 ? "M" : "L") + ctr.x + " " + ctr.y + " ";
      });
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", dStr.trim());
      p.setAttribute("fill", "none");
      p.setAttribute("stroke", PALETTE[ci % PALETTE.length]);
      p.setAttribute("stroke-width", lw);
      p.setAttribute("stroke-linecap", "round");
      p.setAttribute("stroke-linejoin", "round");
      p.setAttribute("opacity", "0.95");
      svgEl.appendChild(p);
    });
    // mark completed endpoint dots
    if (dotsLayer) {
      Array.prototype.forEach.call(dotsLayer.children, (d) => {
        const ci = parseInt(d.dataset.color, 10);
        if (isColorComplete(ci)) d.classList.add("done");
        else d.classList.remove("done");
      });
    }
  }

  function isColorComplete(ci) {
    // a color is connected when a path links both its endpoints
    const path = paths[ci];
    if (path.length < 2) return false;
    const e = endpoints[ci];
    const first = path[0], last = path[path.length - 1];
    const isA = (cell) => cell[0] === e.a[0] && cell[1] === e.a[1];
    const isB = (cell) => cell[0] === e.b[0] && cell[1] === e.b[1];
    return (isA(first) && isB(last)) || (isB(first) && isA(last));
  }

  function updateProgress() {
    let connected = 0;
    for (let i = 0; i < endpoints.length; i++) if (isColorComplete(i)) connected++;
    let filled = 0;
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (cellOwner[r][c] !== -1) filled++;
    if (progressEl) progressEl.textContent = `${connected}/${endpoints.length} • ${filled}/${size * size}`;
  }

  // --- pointer / drag logic ---
  function cellFromPoint(clientX, clientY) {
    const rect = svgEl.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;
    const c = Math.floor(x / cellPx);
    const r = Math.floor(y / cellPx);
    if (r < 0 || r >= size || c < 0 || c >= size) return null;
    return [r, c];
  }

  // remove a color's entire path, clearing owners (but keep endpoint cells owned)
  function clearColor(ci) {
    const path = paths[ci];
    path.forEach((cell) => {
      if (!isEndpointOfColor(cell[0], cell[1], ci)) {
        cellOwner[cell[0]][cell[1]] = -1;
      }
    });
    // re-assert endpoint ownership
    const e = endpoints[ci];
    cellOwner[e.a[0]][e.a[1]] = ci;
    cellOwner[e.b[0]][e.b[1]] = ci;
    paths[ci] = [];
  }

  function onPointerDown(ev) {
    if (view !== "play" || solved) return;
    boardMetrics();
    const cell = cellFromPoint(ev.clientX, ev.clientY);
    if (!cell) return;
    const [r, c] = cell;
    let startColor = -1;

    if (isEndpoint(r, c)) {
      startColor = endpointColor(r, c);
      // Starting fresh from an endpoint resets that color's path entirely.
      // If the path already had length (complete or partially drawn), the
      // player is redrawing this color's connection — count it.
      if (paths[startColor].length > 1) {
        redraws++;
        updateHeader();
      }
      clearColor(startColor);
      paths[startColor] = [[r, c]];
    } else if (cellOwner[r][c] !== -1) {
      // grabbing mid-path: start that color and truncate path up to this cell
      startColor = cellOwner[r][c];
      const path = paths[startColor];
      const idx = path.findIndex((p) => p[0] === r && p[1] === c);
      if (idx >= 0) {
        // clear owners after idx
        for (let i = idx + 1; i < path.length; i++) {
          const cl = path[i];
          if (!isEndpointOfColor(cl[0], cl[1], startColor)) cellOwner[cl[0]][cl[1]] = -1;
        }
        paths[startColor] = path.slice(0, idx + 1);
        // re-assert endpoints
        const e = endpoints[startColor];
        cellOwner[e.a[0]][e.a[1]] = startColor;
        cellOwner[e.b[0]][e.b[1]] = startColor;
      } else {
        return;
      }
    } else {
      return;
    }

    dragColor = startColor;
    dragging = true;
    pointerId = ev.pointerId;
    try { boardEl.setPointerCapture(pointerId); } catch (e) {}
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);
    api.vibrate(6);
    redrawPaths();
    updateProgress();
    ev.preventDefault();
  }

  function adjacent(a, b) {
    return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
  }

  function tryExtend(r, c) {
    const path = paths[dragColor];
    if (path.length === 0) return;
    const head = path[path.length - 1];
    if (head[0] === r && head[1] === c) return;

    // backtrack: if cell is the second-to-last, retreat
    if (path.length >= 2) {
      const prev = path[path.length - 2];
      if (prev[0] === r && prev[1] === c) {
        // remove head
        if (!isEndpointOfColor(head[0], head[1], dragColor)) cellOwner[head[0]][head[1]] = -1;
        path.pop();
        // re-assert endpoints in case
        const e = endpoints[dragColor];
        cellOwner[e.a[0]][e.a[1]] = dragColor;
        cellOwner[e.b[0]][e.b[1]] = dragColor;
        return;
      }
    }
    // if already in our own path (loop back), retreat to that point
    const ownIdx = path.findIndex((p) => p[0] === r && p[1] === c);
    if (ownIdx >= 0) {
      for (let i = ownIdx + 1; i < path.length; i++) {
        const cl = path[i];
        if (!isEndpointOfColor(cl[0], cl[1], dragColor)) cellOwner[cl[0]][cl[1]] = -1;
      }
      paths[dragColor] = path.slice(0, ownIdx + 1);
      const e = endpoints[dragColor];
      cellOwner[e.a[0]][e.a[1]] = dragColor;
      cellOwner[e.b[0]][e.b[1]] = dragColor;
      return;
    }

    if (!adjacent(head, [r, c])) return;

    const owner = cellOwner[r][c];
    // cannot pass through endpoint of a different color
    if (isEndpoint(r, c) && endpointColor(r, c) !== dragColor) return;
    // occupied by another color: blocked
    if (owner !== -1 && owner !== dragColor) return;
    // extend
    cellOwner[r][c] = dragColor;
    path.push([r, c]);
    api.vibrate(4);
  }

  function onPointerMove(ev) {
    if (!dragging) return;
    const cell = cellFromPoint(ev.clientX, ev.clientY);
    if (!cell) return;
    tryExtend(cell[0], cell[1]);
    redrawPaths();
    updateProgress();
    ev.preventDefault();
  }

  function removeDocListeners() {
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("pointercancel", onPointerUp);
  }

  function onPointerUp(ev) {
    if (!dragging) return;
    dragging = false;
    try { if (pointerId != null) boardEl.releasePointerCapture(pointerId); } catch (e) {}
    pointerId = null;
    removeDocListeners();
    redrawPaths();
    updateProgress();
    checkSolved();
  }

  function checkSolved() {
    // all colors connected
    for (let i = 0; i < endpoints.length; i++) if (!isColorComplete(i)) return;
    // all cells filled
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (cellOwner[r][c] === -1) return;
    onPuzzleSolved();
  }

  function computeStars() {
    if (redraws === 0) return 3;
    if (redraws <= 2) return 2;
    return 1;
  }

  function onPuzzleSolved() {
    if (solved) return;
    solved = true;
    api.vibrate([20, 40, 20]);
    if (api.soundOn()) {
      api.tone(660, 0.1);
      setTimeout(() => api.tone(880, 0.12), 100);
      setTimeout(() => api.tone(990, 0.16), 220);
    }

    const stars = computeStars();
    const progress = ArcadeUI.recordResult("flow", TOTAL_LEVELS, level, stars);
    const totalStars = progress.stars.reduce((a, b) => a + b, 0);
    api.saveBest(totalStars);

    setTimeout(() => showResult(stars), 350);
  }

  function showResult(stars) {
    if (!boardArea) return;
    const ov = document.createElement("div");
    ov.className = "flow-level-overlay";

    const h = document.createElement("h3");
    h.textContent = ArcadeUI.t("level_complete");

    const starRow = document.createElement("div");
    ArcadeUI.renderStars(starRow, stars);

    const p1 = document.createElement("p");
    p1.textContent = `${L("redraws")}: ${redraws}`;

    const p2 = document.createElement("p");
    if (redraws === 0) p2.textContent = L("flawless");
    else if (level === TOTAL_LEVELS - 1) p2.textContent = L("all_levels_done");
    else p2.textContent = "";

    const actions = document.createElement("div");
    actions.className = "arcade-result-actions";

    const retryBtn = document.createElement("button");
    retryBtn.className = "arcade-btn";
    retryBtn.textContent = ArcadeUI.t("retry");
    retryBtn.addEventListener("click", () => { api.playClick(); startLevel(level); });
    actions.appendChild(retryBtn);

    if (level < TOTAL_LEVELS - 1) {
      const nextBtn = document.createElement("button");
      nextBtn.className = "arcade-btn primary";
      nextBtn.textContent = ArcadeUI.t("next_level");
      nextBtn.addEventListener("click", () => { api.playClick(); startLevel(level + 1); });
      actions.appendChild(nextBtn);
    }

    const levelsBtn = document.createElement("button");
    levelsBtn.className = "arcade-btn";
    levelsBtn.textContent = ArcadeUI.t("levels");
    levelsBtn.addEventListener("click", () => { api.playClick(); showLevelSelect(); });
    actions.appendChild(levelsBtn);

    ov.appendChild(h);
    ov.appendChild(starRow);
    ov.appendChild(p1);
    if (p2.textContent) ov.appendChild(p2);
    ov.appendChild(actions);
    boardArea.appendChild(ov);
  }

  // Reposition the board without losing drawn paths (orientation / size change).
  function reflow() {
    if (!boardEl || !boardArea) return;
    ArcadeUI.fitSquare(boardArea, boardEl);
    requestAnimationFrame(() => {
      drawDots();
      redrawPaths();
      updateProgress();
    });
  }

  window.ARCADE_GAMES.push({
    id: "flow",
    emoji: "🎨",
    nameKey: "game_flow_name",
    descKey: "game_flow_desc",
    accent: "#4caf6e",
    mount(rootEl, a) {
      injectStyle();
      api = a;
      root = rootEl;
      view = "select";
      level = 0;
      puzzleIndex = 0;
      solved = false;
      redraws = 0;

      resizeHandler = () => { if (view === "play") reflow(); };
      window.addEventListener("resize", resizeHandler);

      showLevelSelect();
    },
    unmount() {
      removeDocListeners();
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      resizeHandler = null;
      if (boardEl) {
        try { boardEl.removeEventListener("pointerdown", onPointerDown); } catch (e) {}
      }
      dragging = false;
      pointerId = null;
      api = null;
      root = null;
      view = "select";
      level = 0;
      boardArea = null;
      boardEl = gridEl = svgEl = dotsLayer = progressEl = null;
    },
  });
})();
