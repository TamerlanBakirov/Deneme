// Block Blast — drag polyomino pieces onto an 8x8 grid; fill rows/columns to
// clear them. Self-contained arcade module; see js/arcade.js for the host
// contract.
window.ARCADE_GAMES = window.ARCADE_GAMES || [];
(function () {
  const SIZE = 8;
  const TRAY = 3;
  const STYLE_ID = "blocks-game-style";

  // Local fallback strings (i18n.js can't be edited). English default + Turkish.
  const LOCAL = {
    en: { hint: "Drag pieces to fill rows & columns" },
    tr: { hint: "Parçaları sürükle, satır ve sütunları doldur" },
  };
  function lang() {
    const l = (document.documentElement.lang || "en").slice(0, 2);
    return LOCAL[l] ? l : "en";
  }
  function lt(key) {
    return (LOCAL[lang()] || LOCAL.en)[key] || LOCAL.en[key] || key;
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
      .game-blocks { align-items:center; justify-content:flex-start; gap:14px;
        padding:14px; box-sizing:border-box; }
      .blocks-wrap { display:flex; flex-direction:column; align-items:center; gap:14px;
        width:100%; max-width:340px; position:relative; }
      .blocks-bar { display:flex; align-items:center; justify-content:space-between;
        width:100%; gap:10px; }
      .blocks-hint { color:var(--muted); font-size:12.5px; line-height:1.3; flex:1; }
      .blocks-new { border:none; cursor:pointer; border-radius:12px; padding:9px 14px;
        font-size:14px; font-weight:600; color:#fff; background:var(--accent-deep);
        box-shadow:0 3px 8px rgba(60,45,20,.18); transition:transform .12s var(--ease-out);
        white-space:nowrap; }
      .blocks-new:active { transform:scale(.94); }
      .blocks-board { position:relative; width:100%; aspect-ratio:1; border-radius:16px;
        background:var(--panel); padding:8px; box-sizing:border-box; touch-action:none;
        box-shadow:inset 0 2px 8px rgba(60,45,20,.10); user-select:none;
        -webkit-user-select:none; display:grid; gap:3px; }
      .blocks-cell { border-radius:6px; background:var(--divider); opacity:.45;
        box-sizing:border-box; transition:background .12s var(--ease-out); }
      .blocks-cell.filled { opacity:1; box-shadow:inset 0 -2px 4px rgba(0,0,0,.18),
        inset 0 2px 3px rgba(255,255,255,.22); }
      .blocks-cell.preview-ok { opacity:.9; }
      .blocks-cell.preview-bad { opacity:.85; background:#d94f4f !important; }
      .blocks-cell.clearing { animation:blocks-clear .28s var(--ease-out); }
      @keyframes blocks-clear { 0% { transform:scale(1); }
        45% { transform:scale(1.18); filter:brightness(1.5); }
        100% { transform:scale(0); opacity:0; } }
      .blocks-tray { display:flex; align-items:flex-end; justify-content:space-around;
        width:100%; min-height:84px; gap:8px; touch-action:none; }
      .blocks-slot { flex:1; display:flex; align-items:center; justify-content:center;
        min-height:80px; }
      .blocks-piece { display:grid; gap:3px; cursor:grab; touch-action:none;
        transition:transform .14s var(--ease-spring), opacity .14s var(--ease-out); }
      .blocks-piece.empty { opacity:0; pointer-events:none; }
      .blocks-piece.dragging { opacity:0; }
      .blocks-pcell { border-radius:5px; box-shadow:inset 0 -2px 4px rgba(0,0,0,.18),
        inset 0 2px 3px rgba(255,255,255,.22); box-sizing:border-box; }
      .blocks-drag { position:fixed; z-index:50; pointer-events:none; display:grid;
        gap:3px; left:0; top:0; will-change:transform; }
      .blocks-drag .blocks-pcell { box-shadow:inset 0 -2px 4px rgba(0,0,0,.2),
        inset 0 2px 3px rgba(255,255,255,.25), 0 4px 10px rgba(0,0,0,.25); }
      .blocks-overlay { position:absolute; inset:0; border-radius:16px; display:flex;
        flex-direction:column; align-items:center; justify-content:center; gap:12px;
        text-align:center; padding:18px; box-sizing:border-box;
        background:rgba(28,24,18,.80); color:#fff; z-index:60;
        animation:blocks-fade .25s var(--ease-out); }
      .blocks-overlay h3 { font-size:24px; font-weight:800; margin:0; }
      .blocks-overlay p { font-size:15px; margin:0; opacity:.92; }
      .blocks-overlay .blocks-new { background:var(--accent); }
      @keyframes blocks-fade { from { opacity:0; } to { opacity:1; } }
      .blocks-combo { position:absolute; left:50%; top:30%; transform:translate(-50%,-50%);
        font-size:30px; font-weight:900; color:var(--accent-deep); pointer-events:none;
        z-index:20; text-shadow:0 2px 8px rgba(0,0,0,.3);
        animation:blocks-combo 0.8s var(--ease-out) forwards; }
      @keyframes blocks-combo { 0% { opacity:0; transform:translate(-50%,-50%) scale(.4); }
        25% { opacity:1; transform:translate(-50%,-50%) scale(1.1); }
        70% { opacity:1; }
        100% { opacity:0; transform:translate(-50%,-70%) scale(1); } }
    `;
    document.head.appendChild(s);
  }

  let api = null;
  let root = null;
  let wrap = null;
  let board = null;        // grid container element
  let cellEls = [];        // SIZE*SIZE cell elements (row-major)
  let trayEl = null;       // tray container
  let slotEls = [];        // TRAY slot elements
  let grid = [];           // SIZE x SIZE booleans (filled)
  let tray = [];           // TRAY entries: { shape, color } or null
  let score = 0;
  let over = false;
  let raf = 0;

  // drag state
  let drag = null;         // { slot, shape, color, ghost, cellPx, gap, lastValid }
  let pmHandler = null;
  let puHandler = null;

  function updateHeader() {
    const best = api.best();
    const bestVal = best == null ? 0 : best;
    api.setScore(
      `${api.t("score_label")}: ${score} • ${api.t("best_score", { score: bestVal })}`
    );
  }

  // ----- board geometry -----
  function cellMetrics() {
    const pad = 8;
    const gap = 3;
    const w = board.clientWidth - pad * 2;
    const cell = (w - gap * (SIZE - 1)) / SIZE;
    return { pad, gap, cell };
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
      const piece = makePieceEl(entry, false);
      piece.dataset.slot = i;
      piece.addEventListener("pointerdown", onPiecePointerDown);
      slot.appendChild(piece);
    }
  }

  // Tray piece sized to fit a small slot.
  function makePieceEl(entry, big) {
    const { shape, color } = entry;
    const b = shapeBounds(shape);
    const el = document.createElement("div");
    el.className = "blocks-piece";
    el.style.gridTemplateColumns = `repeat(${b.cols}, 1fr)`;
    el.style.gridTemplateRows = `repeat(${b.rows}, 1fr)`;
    const px = big ? bigCellPx() : trayCellPx(b);
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

  function trayCellPx(b) {
    const maxDim = Math.max(b.rows, b.cols);
    // slot ~ 100px wide on 340px board; keep tray pieces compact
    if (maxDim >= 4) return 15;
    if (maxDim === 3) return 17;
    return 20;
  }

  function bigCellPx() {
    const m = cellMetrics();
    return m.cell;
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
    for (const [dr, dc] of shape) {
      grid[r0 + dr][c0 + dc] = color;
      cellsPlaced++;
    }
    tray[slotIdx] = null;
    score += cellsPlaced;

    api.playClick();
    api.vibrate(8);
    if (api.soundOn()) api.tone(420, 0.05, "sine");

    renderGrid();

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
    api.saveBest(score);

    // game over check
    if (!anyMoveLeft()) {
      gameOver();
    }
    return true;
  }

  function clearLines(rows, cols, totalLines) {
    // bonus: cleared_lines * 10 * combo multiplier
    const combo = totalLines;
    const bonus = totalLines * 10 * combo;
    score += bonus;

    // mark clearing animation
    const marked = new Set();
    for (const r of rows)
      for (let c = 0; c < SIZE; c++) marked.add(r * SIZE + c);
    for (const c of cols)
      for (let r = 0; r < SIZE; r++) marked.add(r * SIZE + c);
    for (const idx of marked) cellEls[idx].classList.add("clearing");

    api.vibrate(totalLines > 1 ? [20, 40, 20] : 18);
    if (api.soundOn()) {
      api.tone(620, 0.08, "triangle");
      if (totalLines > 1) setTimeout(() => api.tone(820, 0.12, "triangle"), 90);
    }

    if (totalLines > 1) {
      const combEl = document.createElement("div");
      combEl.className = "blocks-combo";
      combEl.textContent = totalLines + "x!";
      wrap.appendChild(combEl);
      setTimeout(() => { if (combEl.parentNode) combEl.parentNode.removeChild(combEl); }, 800);
    }

    // after animation, remove cells from data and re-render
    raf = requestAnimationFrame(() => {
      setTimeout(() => {
        for (const r of rows)
          for (let c = 0; c < SIZE; c++) grid[r][c] = null;
        for (const c of cols)
          for (let r = 0; r < SIZE; r++) grid[r][c] = null;
        for (const idx of marked) cellEls[idx].classList.remove("clearing");
        renderGrid();
        updateHeader();
      }, 260);
    });
  }

  function gameOver() {
    over = true;
    const best = api.saveBest(score);
    api.vibrate([30, 60, 30]);
    if (api.soundOn()) {
      api.tone(330, 0.14, "sawtooth");
      setTimeout(() => api.tone(196, 0.22, "sawtooth"), 130);
    }
    const ov = document.createElement("div");
    ov.className = "blocks-overlay";
    const h = document.createElement("h3");
    h.textContent = api.t("game_over");
    const p1 = document.createElement("p");
    p1.textContent = `${api.t("score_label")}: ${score}`;
    const p2 = document.createElement("p");
    p2.textContent = api.t("best_score", { score: best == null ? score : best });
    const btn = document.createElement("button");
    btn.className = "blocks-new";
    btn.textContent = api.t("new_game");
    btn.addEventListener("click", () => {
      api.playClick();
      newGame();
    });
    ov.appendChild(h);
    ov.appendChild(p1);
    ov.appendChild(p2);
    ov.appendChild(btn);
    wrap.appendChild(ov);
  }

  function newGame() {
    over = false;
    score = 0;
    grid = [];
    for (let r = 0; r < SIZE; r++) {
      const row = [];
      for (let c = 0; c < SIZE; c++) row.push(null);
      grid.push(row);
    }
    refillTray();
    // remove any overlay
    const ov = wrap.querySelector(".blocks-overlay");
    if (ov) ov.parentNode.removeChild(ov);
    renderGrid();
    renderTray();
    updateHeader();
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

      wrap = document.createElement("div");
      wrap.className = "blocks-wrap";

      const bar = document.createElement("div");
      bar.className = "blocks-bar";
      const hint = document.createElement("div");
      hint.className = "blocks-hint";
      hint.textContent = lt("hint");
      const newBtn = document.createElement("button");
      newBtn.className = "blocks-new";
      newBtn.textContent = api.t("new_game");
      newBtn.addEventListener("click", () => {
        api.playClick();
        newGame();
      });
      bar.appendChild(hint);
      bar.appendChild(newBtn);

      board = document.createElement("div");
      board.className = "blocks-board";

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
      wrap.appendChild(board);
      wrap.appendChild(trayEl);
      root.appendChild(wrap);

      raf = requestAnimationFrame(() => {
        buildBoard();
        newGame();
      });
    },
    unmount() {
      teardownDrag();
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      board = null;
      trayEl = null;
      slotEls = [];
      cellEls = [];
      wrap = null;
      root = null;
      api = null;
      over = false;
    },
  });
})();
