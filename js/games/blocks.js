// Block Blast — drag polyomino pieces onto an 8x8 grid; fill rows/columns to
// clear them. Knot-Escape-style level system: each level is a target-score
// challenge with a placement-move limit. Self-contained arcade module; see
// js/arcade.js for the host contract.
window.ARCADE_GAMES = window.ARCADE_GAMES || [];
(function () {
  const SIZE = 8;
  const TRAY = 3;
  const STYLE_ID = "blocks-game-style";
  const TOTAL_LEVELS = 8;
  const MOVE_LIMIT = 20; // placements allowed per level attempt
  // Target score per level (0-indexed). Tuned so a greedy-but-imperfect
  // playtest (see /tmp/blocks-playtest.js) lands ~1-2 stars on level 1.
  const TARGET_SCORE = [150, 300, 450, 600, 750, 900, 1050, 1200];

  // Local fallback strings (i18n.js can't be edited). English default + Turkish.
  const LOCAL = {
    en: { combo: "Combo x{n}!", target_hint: "Target: {n}" },
    tr: { combo: "Kombo x{n}!", target_hint: "Hedef: {n}" },
  };
  function lang() {
    const l = (document.documentElement.lang || "en").slice(0, 2);
    return LOCAL[l] ? l : "en";
  }
  function lt(key, vars) {
    let s = (LOCAL[lang()] || LOCAL.en)[key] || LOCAL.en[key] || key;
    if (vars) for (const k in vars) s = s.replace("{" + k + "}", vars[k]);
    return s;
  }

  // Pleasant fixed piece colors.
  const COLORS = [
    "#9b6dd0", // purple
    "#e0843a", // orange
    "#4eb89a", // teal
    "#e05c7e", // pink
    "#5b8fe0", // blue
    "#e0b53a", // gold
    "#7bbf4e", // green
  ];

  // Polyomino shapes as lists of [r,c] offsets (normalized to top-left 0,0).
  const SHAPES = [
    [[0, 0]],                                   // 1x1
    [[0, 0], [0, 1]],                           // 1x2
    [[0, 0], [1, 0]],                           // 2x1
    [[0, 0], [0, 1], [0, 2]],                   // 1x3
    [[0, 0], [1, 0], [2, 0]],                   // 3x1
    [[0, 0], [0, 1], [0, 2], [0, 3]],           // 1x4
    [[0, 0], [1, 0], [2, 0], [3, 0]],           // 4x1
    [[0, 0], [0, 1], [1, 0], [1, 1]],           // 2x2
    [[0, 0], [1, 0], [1, 1]],                   // L-tromino (4 rotations)
    [[0, 0], [0, 1], [1, 0]],
    [[0, 1], [1, 0], [1, 1]],
    [[0, 0], [0, 1], [1, 1]],
    [[0, 1], [0, 2], [1, 0], [1, 1]],           // S
    [[0, 0], [0, 1], [1, 1], [1, 2]],           // Z
    [[0, 0], [0, 1], [0, 2], [1, 1]],           // T (4 rotations)
    [[0, 1], [1, 0], [1, 1], [2, 1]],
    [[0, 1], [1, 0], [1, 1], [1, 2]],
    [[0, 0], [1, 0], [1, 1], [2, 0]],
    [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]], // 3x2
    [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]], // 2x3
    [[0, 0], [0, 1], [1, 0], [2, 0]],           // big-L
    [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]],
  ];

  function shapeBounds(cells) {
    let maxR = 0, maxC = 0;
    for (const [r, c] of cells) {
      if (r > maxR) maxR = r;
      if (c > maxC) maxC = c;
    }
    return { rows: maxR + 1, cols: maxC + 1 };
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `
      .game-blocks { padding:0; box-sizing:border-box; }
      .blocks-wrap { display:flex; flex-direction:column; min-height:0; width:100%; height:100%;
        gap:10px; padding:14px; box-sizing:border-box; position:relative; }
      .blocks-bar { display:flex; align-items:center; justify-content:space-between;
        width:100%; gap:10px; flex-wrap:wrap; }
      .blocks-info { display:flex; flex-direction:column; gap:2px; }
      .blocks-level-label { font-size:16px; font-weight:800; color:var(--accent-deep); }
      .blocks-target { color:var(--muted); font-size:12px; }
      .blocks-moves { color:var(--muted); font-size:12px; font-variant-numeric:tabular-nums; }
      .blocks-moves strong { color:var(--ink); font-weight:800; }
      .blocks-board { position:relative; border-radius:16px;
        background:var(--panel); padding:8px; box-sizing:border-box; touch-action:none;
        box-shadow:inset 0 2px 8px rgba(60,45,20,.10); user-select:none;
        -webkit-user-select:none; display:grid; gap:3px; }
      .blocks-cell { border-radius:6px; background:var(--divider); opacity:.45;
        box-sizing:border-box; transition:background .12s var(--ease-out); }
      .blocks-cell.filled { opacity:1; box-shadow:inset 0 -2px 4px rgba(0,0,0,.18),
        inset 0 2px 3px rgba(255,255,255,.22); }
      .blocks-cell.preview-ok { opacity:.9; }
      .blocks-cell.preview-bad { opacity:.85; background:#d94f4f !important; }
      .blocks-cell.clearing { animation:blocks-clear .38s var(--ease-out) both; }
      @keyframes blocks-clear { 0% { transform:scale(1); filter:none; }
        35% { transform:scale(1.16); filter:brightness(1.6) saturate(.4); background:#fff !important; }
        100% { transform:scale(0); opacity:0; filter:brightness(1) saturate(1); } }
      .blocks-cell.placed { animation:blocks-place .22s var(--ease-spring) both; }
      @keyframes blocks-place { 0% { transform:scale(.55); }
        60% { transform:scale(1.12); }
        100% { transform:scale(1); } }
      .blocks-tray { display:flex; align-items:flex-end; justify-content:space-around;
        margin:0 auto; gap:8px; touch-action:none; flex-shrink:0; }
      .blocks-slot { flex:1; display:flex; align-items:center; justify-content:center;
        min-height:46px; }
      .blocks-piece { display:grid; gap:3px; cursor:grab; touch-action:none;
        transition:transform .14s var(--ease-spring), opacity .14s var(--ease-out); }
      .blocks-piece.empty { opacity:0; pointer-events:none; }
      .blocks-piece.dragging { opacity:0; }
      .blocks-piece.unplayable { opacity:.32; }
      .blocks-pcell { border-radius:5px; box-shadow:inset 0 -2px 4px rgba(0,0,0,.18),
        inset 0 2px 3px rgba(255,255,255,.22); box-sizing:border-box; }
      .blocks-drag { position:fixed; z-index:50; pointer-events:none; display:grid;
        gap:3px; left:0; top:0; will-change:transform; }
      .blocks-drag .blocks-pcell { box-shadow:inset 0 -2px 4px rgba(0,0,0,.2),
        inset 0 2px 3px rgba(255,255,255,.25), 0 4px 10px rgba(0,0,0,.25); }
      .blocks-level-overlay { position:absolute; inset:0; border-radius:16px; display:flex;
        flex-direction:column; align-items:center; justify-content:center; gap:10px;
        text-align:center; padding:18px; box-sizing:border-box;
        background:rgba(28,24,18,.80); color:#fff; z-index:60;
        animation:blocks-fade .25s var(--ease-out); }
      .blocks-level-overlay h3 { font-size:24px; font-weight:800; margin:0; }
      .blocks-level-overlay p { font-size:15px; margin:0; opacity:.92; }
      .blocks-level-overlay .star-row { color:rgba(255,255,255,.3); }
      @keyframes blocks-fade { from { opacity:0; } to { opacity:1; } }
      .blocks-combo { position:absolute; left:50%; top:30%; transform:translate(-50%,-50%);
        font-size:30px; font-weight:900; color:var(--accent-deep); pointer-events:none;
        z-index:20; text-shadow:0 2px 8px rgba(0,0,0,.3);
        animation:blocks-combo 0.8s var(--ease-out) forwards; }
      @keyframes blocks-combo { 0% { opacity:0; transform:translate(-50%,-50%) scale(.4); }
        25% { opacity:1; transform:translate(-50%,-50%) scale(1.1); }
        70% { opacity:1; }
        100% { opacity:0; transform:translate(-50%,-70%) scale(1); } }
      .blocks-popup { position:absolute; transform:translate(-50%,-50%);
        font-size:15px; font-weight:800; color:var(--accent-deep); pointer-events:none;
        z-index:25; text-shadow:0 1px 4px rgba(0,0,0,.25);
        animation:blocks-popup .8s var(--ease-out) forwards; white-space:nowrap; }
      @keyframes blocks-popup { 0% { opacity:0; transform:translate(-50%,-40%) scale(.7); }
        15% { opacity:1; transform:translate(-50%,-60%) scale(1.05); }
        100% { opacity:0; transform:translate(-50%,-160%) scale(1); } }
    `;
    document.head.appendChild(s);
  }

  let api = null;
  let root = null;
  let wrap = null;
  let board = null;        // grid container element
  let boardArea = null;    // flex area the board is sized to fill
  let trayEl = null;       // tray container
  let cellEls = [];        // SIZE*SIZE cell elements (row-major)
  let slotEls = [];        // TRAY slot elements
  let grid = [];           // SIZE x SIZE booleans (filled)
  let tray = [];           // TRAY entries: { shape, color } or null
  let score = 0;
  let over = false;
  let raf = 0;
  let combo = 0;          // consecutive clear streak
  let timers = [];        // tracked setTimeout ids for cleanup on unmount

  // level-system state
  let view = "select";    // "select" | "play"
  let level = 0;           // current level index (0-based)
  let movesLeft = MOVE_LIMIT;
  let levelEnded = false;  // guard against double-ending a level
  let movesLabel = null;   // span showing the live "moves left" count
  let resizeHandler = null;

  // drag state
  let drag = null;         // { slot, shape, color, ghost, cellPx, gap, lastValid }
  let pmHandler = null;
  let puHandler = null;

  function levelTarget() {
    return TARGET_SCORE[level] != null ? TARGET_SCORE[level] : TARGET_SCORE[TARGET_SCORE.length - 1];
  }

  function computeStars(finalScore, target) {
    if (finalScore >= target * 1.5) return 3;
    if (finalScore >= target) return 2;
    if (finalScore >= target * 0.6) return 1;
    return 0;
  }

  function updateHeader() {
    api.setScore(`${api.t("score_label")}: ${score}`);
  }

  function updateMoves() {
    if (movesLabel) movesLabel.innerHTML = `${ArcadeUI.t("moves_left")}: <strong>${movesLeft}</strong>`;
  }

  // ----- board geometry -----
  function cellMetrics() {
    const pad = 8;
    const gap = 3;
    const w = board.clientWidth - pad * 2;
    const cell = (w - gap * (SIZE - 1)) / SIZE;
    return { pad, gap, cell };
  }

  function trackTimeout(fn, ms) {
    const id = setTimeout(() => {
      timers = timers.filter((t) => t !== id);
      fn();
    }, ms);
    timers.push(id);
    return id;
  }

  function clearTimers() {
    for (const id of timers) clearTimeout(id);
    timers = [];
  }

  // Spawn a floating "+N" popup positioned over a board cell (row/col grid coords).
  function spawnPopup(text, r, c) {
    if (!board) return;
    const m = cellMetrics();
    const x = m.pad + c * (m.cell + m.gap) + m.cell / 2;
    const y = m.pad + r * (m.cell + m.gap) + m.cell / 2;
    const el = document.createElement("div");
    el.className = "blocks-popup";
    el.textContent = text;
    el.style.left = x + "px";
    el.style.top = y + "px";
    board.appendChild(el);
    trackTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 850);
  }

  // ----- piece placement logic -----
  function canPlace(shape, r0, c0) {
    for (const [dr, dc] of shape) {
      const r = r0 + dr;
      const c = c0 + dc;
      if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return false;
      if (grid[r][c]) return false;
    }
    return true;
  }

  function canPlaceAnywhere(shape) {
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) if (canPlace(shape, r, c)) return true;
    return false;
  }

  function anyMoveLeft() {
    for (const t of tray) {
      if (t && canPlaceAnywhere(t.shape)) return true;
    }
    return false;
  }

  function randomPiece() {
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    return { shape, color };
  }

  function refillTray() {
    tray = [randomPiece(), randomPiece(), randomPiece()];
  }

  // ----- rendering -----
  function buildBoard() {
    board.innerHTML = "";
    cellEls = [];
    board.style.gridTemplateColumns = `repeat(${SIZE}, 1fr)`;
    board.style.gridTemplateRows = `repeat(${SIZE}, 1fr)`;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const el = document.createElement("div");
        el.className = "blocks-cell";
        el.dataset.r = r;
        el.dataset.c = c;
        board.appendChild(el);
        cellEls.push(el);
      }
    }
  }

  function cellAt(r, c) {
    return cellEls[r * SIZE + c];
  }

  function renderGrid() {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const el = cellAt(r, c);
        const v = grid[r][c];
        el.classList.toggle("filled", !!v);
        el.classList.remove("preview-ok", "preview-bad");
        if (v) {
          el.style.background = v;
        } else {
          el.style.background = "";
        }
      }
    }
  }

  function renderTray() {
    for (let i = 0; i < TRAY; i++) {
      const slot = slotEls[i];
      slot.innerHTML = "";
      const entry = tray[i];
      if (!entry) continue;
      const piece = makePieceEl(entry);
      piece.dataset.slot = i;
      if (!canPlaceAnywhere(entry.shape)) piece.classList.add("unplayable");
      piece.addEventListener("pointerdown", onPiecePointerDown);
      slot.appendChild(piece);
    }
  }

  // Tray piece sized proportionally to the current board cell size.
  function makePieceEl(entry) {
    const { shape, color } = entry;
    const b = shapeBounds(shape);
    const el = document.createElement("div");
    el.className = "blocks-piece";
    el.style.gridTemplateColumns = `repeat(${b.cols}, 1fr)`;
    el.style.gridTemplateRows = `repeat(${b.rows}, 1fr)`;
    const px = trayCellPx(b);
    el.style.gap = "3px";
    const occ = {};
    for (const [r, c] of shape) occ[r + "," + c] = true;
    for (let r = 0; r < b.rows; r++) {
      for (let c = 0; c < b.cols; c++) {
        const cell = document.createElement("div");
        if (occ[r + "," + c]) {
          cell.className = "blocks-pcell";
          cell.style.background = color;
        } else {
          cell.style.visibility = "hidden";
        }
        cell.style.width = px + "px";
        cell.style.height = px + "px";
        el.appendChild(cell);
      }
    }
    return el;
  }

  // Scales tray piece cells relative to the live board cell size, so the
  // tray stays visually proportional whether the board is small or fills
  // the whole screen.
  function trayCellPx(b) {
    const maxDim = Math.max(b.rows, b.cols);
    const cell = board ? cellMetrics().cell : 38;
    let factor;
    if (maxDim >= 4) factor = 0.4;
    else if (maxDim === 3) factor = 0.46;
    else factor = 0.55;
    return Math.max(10, Math.round(cell * factor));
  }

  // ----- drag handling -----
  function onPiecePointerDown(e) {
    if (over || drag) return;
    const slotIdx = parseInt(e.currentTarget.dataset.slot, 10);
    const entry = tray[slotIdx];
    if (!entry) return;
    e.preventDefault();

    const pieceEl = e.currentTarget;
    pieceEl.classList.add("dragging");

    const m = cellMetrics();
    const b = shapeBounds(entry.shape);

    // Build a ghost sized to actual board cells.
    const ghost = document.createElement("div");
    ghost.className = "blocks-drag";
    ghost.style.gridTemplateColumns = `repeat(${b.cols}, ${m.cell}px)`;
    ghost.style.gridTemplateRows = `repeat(${b.rows}, ${m.cell}px)`;
    const occ = {};
    for (const [r, c] of entry.shape) occ[r + "," + c] = true;
    for (let r = 0; r < b.rows; r++) {
      for (let c = 0; c < b.cols; c++) {
        const cell = document.createElement("div");
        cell.style.width = m.cell + "px";
        cell.style.height = m.cell + "px";
        if (occ[r + "," + c]) {
          cell.className = "blocks-pcell";
          cell.style.background = entry.color;
        } else {
          cell.style.visibility = "hidden";
        }
        ghost.appendChild(cell);
      }
    }
    document.body.appendChild(ghost);

    drag = {
      slot: slotIdx,
      shape: entry.shape,
      color: entry.color,
      ghost,
      cell: m.cell,
      gap: m.gap,
      pad: m.pad,
      bounds: b,
      pointerId: e.pointerId,
      lastValid: null,
      pieceEl,
    };

    moveGhost(e.clientX, e.clientY);

    pmHandler = onPointerMove;
    puHandler = onPointerUp;
    document.addEventListener("pointermove", pmHandler, { passive: false });
    document.addEventListener("pointerup", puHandler);
    document.addEventListener("pointercancel", puHandler);
  }

  // Convert pointer to grid origin (top-left cell of piece). The piece is
  // offset above the finger so it isn't hidden.
  function pointerToOrigin(clientX, clientY) {
    const rect = board.getBoundingClientRect();
    const m = drag.cell + drag.gap;
    // anchor: top-left of piece sits above finger
    const offsetY = drag.cell * 1.6;
    const pieceLeft = clientX - (drag.bounds.cols * (drag.cell + drag.gap)) / 2 + drag.gap / 2;
    const pieceTop = clientY - offsetY;
    const localX = pieceLeft - rect.left - drag.pad;
    const localY = pieceTop - rect.top - drag.pad;
    const c0 = Math.round(localX / m);
    const r0 = Math.round(localY / m);
    return { r0, c0, pieceLeft, pieceTop };
  }

  function moveGhost(clientX, clientY) {
    const { pieceLeft, pieceTop } = pointerToOrigin(clientX, clientY);
    drag.ghost.style.transform = `translate(${pieceLeft}px, ${pieceTop}px)`;
  }

  function clearPreview() {
    for (const el of cellEls) el.classList.remove("preview-ok", "preview-bad");
  }

  function showPreview(r0, c0) {
    clearPreview();
    drag.lastValid = null;
    const ok = canPlace(drag.shape, r0, c0);
    for (const [dr, dc] of drag.shape) {
      const r = r0 + dr;
      const c = c0 + dc;
      if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) continue;
      const el = cellAt(r, c);
      if (ok) {
        el.classList.add("preview-ok");
        el.style.background = drag.color;
      } else {
        el.classList.add("preview-bad");
      }
    }
    if (ok) drag.lastValid = { r0, c0 };
  }

  function onPointerMove(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.preventDefault();
    moveGhost(e.clientX, e.clientY);
    const { r0, c0 } = pointerToOrigin(e.clientX, e.clientY);
    // refresh background of non-preview cells then show preview
    renderGrid();
    showPreview(r0, c0);
  }

  function onPointerUp(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const d = drag;
    teardownDrag();

    let placed = false;
    if (d.lastValid) {
      placed = placePiece(d.slot, d.shape, d.color, d.lastValid.r0, d.lastValid.c0);
    }
    if (!placed) {
      if (d.pieceEl) d.pieceEl.classList.remove("dragging");
      renderGrid();
    }
  }

  function teardownDrag() {
    if (!drag) return;
    if (drag.ghost && drag.ghost.parentNode) {
      drag.ghost.parentNode.removeChild(drag.ghost);
    }
    clearPreview();
    if (pmHandler) document.removeEventListener("pointermove", pmHandler);
    if (puHandler) {
      document.removeEventListener("pointerup", puHandler);
      document.removeEventListener("pointercancel", puHandler);
    }
    pmHandler = null;
    puHandler = null;
    drag = null;
  }

  // ----- placement + scoring -----
  function placePiece(slotIdx, shape, color, r0, c0) {
    if (!canPlace(shape, r0, c0)) return false;
    let cellsPlaced = 0;
    let sumR = 0, sumC = 0;
    for (const [dr, dc] of shape) {
      grid[r0 + dr][c0 + dc] = color;
      cellsPlaced++;
      sumR += r0 + dr;
      sumC += c0 + dc;
    }
    const anchorR = sumR / cellsPlaced;
    const anchorC = sumC / cellsPlaced;
    tray[slotIdx] = null;
    score += cellsPlaced;
    movesLeft = Math.max(0, movesLeft - 1);
    updateMoves();

    api.playClick();
    api.vibrate(8);
    if (api.soundOn()) api.tone(420, 0.05, "sine");

    renderGrid();

    // Quick scale-pop on newly placed cells.
    for (const [dr, dc] of shape) {
      const el = cellAt(r0 + dr, c0 + dc);
      el.classList.remove("placed");
      // restart animation
      void el.offsetWidth;
      el.classList.add("placed");
    }
    trackTimeout(() => {
      for (const [dr, dc] of shape) {
        const el = cellAt(r0 + dr, c0 + dc);
        if (el) el.classList.remove("placed");
      }
    }, 240);

    // Floating "+N" popup near the placed piece.
    spawnPopup("+" + cellsPlaced, anchorR, anchorC);

    // Determine full rows/columns.
    const fullRows = [];
    const fullCols = [];
    for (let r = 0; r < SIZE; r++) {
      let full = true;
      for (let c = 0; c < SIZE; c++) if (!grid[r][c]) { full = false; break; }
      if (full) fullRows.push(r);
    }
    for (let c = 0; c < SIZE; c++) {
      let full = true;
      for (let r = 0; r < SIZE; r++) if (!grid[r][c]) { full = false; break; }
      if (full) fullCols.push(c);
    }

    const totalLines = fullRows.length + fullCols.length;
    if (totalLines > 0) {
      clearLines(fullRows, fullCols, totalLines);
    } else {
      combo = 0;
      renderTray();
    }

    // refill tray when empty
    if (tray.every((t) => t === null)) {
      refillTray();
      renderTray();
    } else {
      renderTray();
    }

    updateHeader();

    // level-end checks: out of moves, or no placement possible for any tray piece
    if (movesLeft <= 0 || !anyMoveLeft()) {
      endLevel();
    }
    return true;
  }

  function clearLines(rows, cols, totalLines) {
    // combo streak builds across consecutive placements that clear lines
    combo += 1;
    const comboMultiplier = combo;
    const bonus = totalLines * 10 * comboMultiplier;
    score += bonus;

    // mark clearing animation, staggered per-cell for a sweep effect
    const marked = new Set();
    for (const r of rows)
      for (let c = 0; c < SIZE; c++) marked.add(r * SIZE + c);
    for (const c of cols)
      for (let r = 0; r < SIZE; r++) marked.add(r * SIZE + c);

    for (const idx of marked) {
      const r = Math.floor(idx / SIZE);
      const c = idx % SIZE;
      const delay = (r + c) * 12; // diagonal sweep
      const el = cellEls[idx];
      el.style.animationDelay = delay + "ms";
      el.classList.add("clearing");
    }

    api.vibrate(totalLines > 1 ? [20, 40, 20] : 18);
    if (api.soundOn()) {
      // Pitch climbs with the combo streak; multi-line clears add a sparkle.
      const basePitch = 560 + Math.min(combo - 1, 6) * 60;
      api.tone(basePitch, 0.08, "triangle");
      if (totalLines > 1) trackTimeout(() => api.tone(basePitch + 220, 0.12, "triangle"), 90);
    }

    // Score popup for the line-clear bonus, centered over the cleared area.
    let sumR = 0, sumC = 0, n = 0;
    for (const idx of marked) {
      sumR += Math.floor(idx / SIZE);
      sumC += idx % SIZE;
      n++;
    }
    if (n > 0) spawnPopup("+" + bonus, sumR / n, sumC / n);

    // Combo banner when 2+ lines clear at once, or a consecutive-clear streak builds.
    if (totalLines > 1 || combo > 1) {
      const n2 = totalLines > 1 ? totalLines : combo;
      const combEl = document.createElement("div");
      combEl.className = "blocks-combo";
      combEl.textContent = lt("combo", { n: n2 });
      wrap.appendChild(combEl);
      trackTimeout(() => { if (combEl.parentNode) combEl.parentNode.removeChild(combEl); }, 800);
    }

    // after animation, remove cells from data and re-render
    raf = requestAnimationFrame(() => {
      trackTimeout(() => {
        for (const r of rows)
          for (let c = 0; c < SIZE; c++) grid[r][c] = null;
        for (const c of cols)
          for (let r = 0; r < SIZE; r++) grid[r][c] = null;
        for (const idx of marked) {
          cellEls[idx].classList.remove("clearing");
          cellEls[idx].style.animationDelay = "";
        }
        renderGrid();
        renderTray();
        updateHeader();
        // a line clear can reduce the board enough to free up a move that
        // didn't exist before this clear; only end the level here if we're
        // also out of moves (the out-of-placements case is already handled
        // by placePiece's check before the clear animation started).
        if (movesLeft <= 0 && !levelEnded) endLevel();
      }, 260 + (SIZE * 2 - 2) * 12);
    });
  }

  // ----- level lifecycle -----
  function endLevel() {
    if (levelEnded) return;
    levelEnded = true;
    over = true;

    const target = levelTarget();
    const stars = computeStars(score, target);

    api.vibrate([30, 60, 30]);
    if (api.soundOn()) {
      if (stars > 0) {
        // Rising win chime when the target was reached.
        api.tone(523, 0.12, "triangle");
        setTimeout(() => api.tone(784, 0.2, "triangle"), 120);
      } else {
        // Gentle descending tone when the level was failed.
        api.tone(330, 0.14, "sawtooth");
        setTimeout(() => api.tone(196, 0.22, "sawtooth"), 130);
      }
    }
    const progress = ArcadeUI.recordResult("blocks", TOTAL_LEVELS, level, stars);
    const totalStars = progress.stars.reduce((a, b) => a + b, 0);
    api.saveBest(totalStars);

    const ov = document.createElement("div");
    ov.className = "blocks-level-overlay";

    const h = document.createElement("h3");
    h.textContent = stars > 0 ? ArcadeUI.t("level_complete") : ArcadeUI.t("level_failed");

    const starRow = document.createElement("div");
    ArcadeUI.renderStars(starRow, stars, { api });

    const p1 = document.createElement("p");
    p1.textContent = `${api.t("score_label")}: ${score} / ${target}`;

    const actions = document.createElement("div");
    actions.className = "arcade-result-actions";

    const retryBtn = document.createElement("button");
    retryBtn.className = "arcade-btn";
    retryBtn.textContent = ArcadeUI.t("retry");
    retryBtn.addEventListener("click", () => { api.playClick(); startLevel(level); });
    actions.appendChild(retryBtn);

    if (stars > 0 && level < TOTAL_LEVELS - 1) {
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
    ov.appendChild(actions);
    root.appendChild(ov);
  }

  function newGame() {
    over = false;
    levelEnded = false;
    score = 0;
    combo = 0;
    movesLeft = MOVE_LIMIT;
    clearTimers();
    // remove any stray popups/combo banners/overlays from a previous game
    if (wrap) {
      wrap.querySelectorAll(".blocks-combo, .blocks-popup").forEach((el) => el.remove());
    }
    if (root) {
      root.querySelectorAll(".blocks-level-overlay").forEach((el) => el.remove());
    }
    grid = [];
    for (let r = 0; r < SIZE; r++) {
      const row = [];
      for (let c = 0; c < SIZE; c++) row.push(null);
      grid.push(row);
    }
    refillTray();
    renderGrid();
    renderTray();
    updateHeader();
    updateMoves();
  }

  // ----- level select -----
  function showLevelSelect() {
    view = "select";
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    teardownDrag();
    clearTimers();
    board = null;
    boardArea = null;
    trayEl = null;
    slotEls = [];
    cellEls = [];
    movesLabel = null;
    wrap = null;
    root.innerHTML = "";

    const sel = document.createElement("div");
    sel.className = "arcade-level-select";

    const hint = document.createElement("p");
    hint.className = "arcade-level-hint";
    hint.textContent = ArcadeUI.t("tap_to_play");
    sel.appendChild(hint);

    const gridHost = document.createElement("div");
    sel.appendChild(gridHost);
    root.appendChild(sel);

    const progress = ArcadeUI.loadProgress("blocks", TOTAL_LEVELS);
    ArcadeUI.renderLevelGrid(gridHost, {
      total: TOTAL_LEVELS,
      progress,
      onSelect: (i) => startLevel(i),
    });

    api.setScore("");
  }

  // ----- play view -----
  function startLevel(i) {
    level = Math.max(0, Math.min(i, TOTAL_LEVELS - 1));
    view = "play";
    buildPlayUI();
  }

  function buildPlayUI() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    teardownDrag();
    root.innerHTML = "";

    wrap = document.createElement("div");
    wrap.className = "blocks-wrap";

    const bar = document.createElement("div");
    bar.className = "blocks-bar";

    const info = document.createElement("div");
    info.className = "blocks-info";
    const levelLabel = document.createElement("div");
    levelLabel.className = "blocks-level-label";
    levelLabel.textContent = ArcadeUI.t("level_n", { n: level + 1 });
    const targetLabel = document.createElement("div");
    targetLabel.className = "blocks-target";
    targetLabel.textContent = lt("target_hint", { n: levelTarget() });
    movesLabel = document.createElement("div");
    movesLabel.className = "blocks-moves";
    info.appendChild(levelLabel);
    info.appendChild(targetLabel);
    info.appendChild(movesLabel);

    const levelsBtn = document.createElement("button");
    levelsBtn.className = "arcade-levels-btn";
    levelsBtn.textContent = ArcadeUI.t("levels");
    levelsBtn.addEventListener("click", () => { api.playClick(); showLevelSelect(); });

    bar.appendChild(info);
    bar.appendChild(levelsBtn);

    boardArea = document.createElement("div");
    boardArea.className = "arcade-board-area";

    board = document.createElement("div");
    board.className = "blocks-board";
    boardArea.appendChild(board);

    trayEl = document.createElement("div");
    trayEl.className = "blocks-tray";
    slotEls = [];
    for (let i = 0; i < TRAY; i++) {
      const slot = document.createElement("div");
      slot.className = "blocks-slot";
      trayEl.appendChild(slot);
      slotEls.push(slot);
    }

    wrap.appendChild(bar);
    wrap.appendChild(boardArea);
    wrap.appendChild(trayEl);
    root.appendChild(wrap);

    raf = requestAnimationFrame(() => {
      raf = 0;
      buildBoard();
      fitBoard();
      newGame();
    });
  }

  // Size the board to fill .arcade-board-area, then size the tray to match
  // the board's width so it sits proportionally beneath it.
  function fitBoard() {
    if (!board || !boardArea) return;
    const size = ArcadeUI.fitSquare(boardArea, board);
    if (trayEl && size) trayEl.style.width = size + "px";
    if (board.children.length) renderTray(); // re-scale tray piece cells
  }

  window.ARCADE_GAMES.push({
    id: "blocks",
    emoji: "🧱",
    nameKey: "game_blocks_name",
    descKey: "game_blocks_desc",
    accent: "#9b6dd0",
    mount(rootEl, a) {
      injectStyle();
      api = a;
      root = rootEl;
      root.innerHTML = "";
      view = "select";

      resizeHandler = () => { if (view === "play") fitBoard(); };
      window.addEventListener("resize", resizeHandler);

      showLevelSelect();
    },
    unmount() {
      teardownDrag();
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      clearTimers();
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      resizeHandler = null;
      board = null;
      boardArea = null;
      trayEl = null;
      slotEls = [];
      cellEls = [];
      movesLabel = null;
      wrap = null;
      root = null;
      api = null;
      over = false;
      levelEnded = false;
      combo = 0;
      view = "select";
      level = 0;
    },
  });
})();
