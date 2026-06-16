// 2048 — slide and merge tiles on a 4x4 grid to reach 2048. Self-contained
// arcade module; see js/arcade.js for the host contract.
//
// Tiles are persistent DOM elements that animate (slide/merge/spawn) between
// moves rather than being re-created each frame, for a professional game feel.
// Levels (via ArcadeUI) define a target tile value; reaching it earns stars
// once the run ends (no more moves).
window.ARCADE_GAMES = window.ARCADE_GAMES || [];
(function () {
  const SIZE = 4;
  const STYLE_ID = "g2048-game-style";
  const VEC = { left: [0, -1], right: [0, 1], up: [-1, 0], down: [1, 0] };
  const SLIDE_MS = 130; // keep in sync with the CSS transition below
  const TOTAL_LEVELS = 8;
  const LEVEL_TARGETS = [64, 128, 256, 512, 1024, 2048, 4096, 8192];

  // Local fallback strings (i18n.js can't be edited). English default + Turkish.
  const LOCAL = {
    en: { reached: "Target reached!", keep_going: "Keep going for more stars!", target_hint: "Reach {n} to pass" },
    tr: { reached: "Hedefe ulaştın!", keep_going: "Daha çok yıldız için devam et!", target_hint: "Geçmek için {n}'e ulaş" },
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

  // Tile color ramp tuned for the warm cream/orange theme with readable text.
  const RAMP = {
    2:    { bg: "#efe3d0", fg: "#5b4a33" },
    4:    { bg: "#ecd9b6", fg: "#5b4a33" },
    8:    { bg: "#f0b27a", fg: "#3a2a16" },
    16:   { bg: "#ec9a5a", fg: "#2a1c0c" },
    32:   { bg: "#e88044", fg: "#ffffff" },
    64:   { bg: "#e06632", fg: "#ffffff" },
    128:  { bg: "#e7b84d", fg: "#ffffff" },
    256:  { bg: "#e6ad32", fg: "#ffffff" },
    512:  { bg: "#e3a017", fg: "#ffffff" },
    1024: { bg: "#d98e08", fg: "#ffffff" },
    2048: { bg: "#d97706", fg: "#ffffff" },
  };
  const SUPER = { bg: "#b45309", fg: "#ffffff" };

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `
      .game-2048 { display:flex; flex-direction:column; min-height:0; flex:1; padding:14px; box-sizing:border-box; }
      .g2048-wrap { display:flex; flex-direction:column; min-height:0; width:100%; height:100%; gap:10px; }
      .g2048-bar { display:flex; align-items:center; justify-content:space-between; width:100%; gap:10px; flex-wrap:wrap; }
      .g2048-info { display:flex; flex-direction:column; gap:2px; }
      .g2048-level-label { font-size:16px; font-weight:800; color:var(--accent-deep); }
      .g2048-target { color:var(--muted); font-size:12px; }
      .g2048-actions { display:flex; align-items:center; gap:8px; }
      .g2048-actions .arcade-btn { padding:8px 13px; font-size:16px; line-height:1; }
      .g2048-actions .arcade-btn:disabled { opacity:.4; }
      .g2048-board { position:relative; border-radius:16px;
        background:var(--panel); padding:10px; box-sizing:border-box; touch-action:none;
        box-shadow:inset 0 2px 8px rgba(60,45,20,.10); user-select:none; -webkit-user-select:none; }
      .g2048-cell { position:absolute; border-radius:11px; background:var(--divider); opacity:.5; }
      .g2048-tile { position:absolute; border-radius:11px; display:flex; align-items:center;
        justify-content:center; font-weight:800; line-height:1; box-sizing:border-box;
        box-shadow:0 2px 6px rgba(60,45,20,.16); will-change:left,top,transform;
        transition:left ${SLIDE_MS}ms var(--ease-out), top ${SLIDE_MS}ms var(--ease-out); }
      .g2048-board.no-anim .g2048-tile { transition:none; }
      .g2048-tile.g2048-new-tile { animation:g2048-pop .18s var(--ease-spring); }
      .g2048-tile.g2048-merged { animation:g2048-bump .2s var(--ease-spring); z-index:2; }
      @keyframes g2048-pop { 0% { transform:scale(.1); opacity:0; } 100% { transform:scale(1); opacity:1; } }
      @keyframes g2048-bump { 0% { transform:scale(1); } 42% { transform:scale(1.18); } 100% { transform:scale(1); } }
      .g2048-gain { position:absolute; z-index:6; font-weight:800; font-size:18px; color:var(--accent-deep);
        pointer-events:none; text-shadow:0 1px 2px rgba(255,255,255,.6);
        animation:g2048-gain 0.7s var(--ease-out) forwards; }
      @keyframes g2048-gain {
        0% { opacity:0; transform:translate(-50%,-20%) scale(.7); }
        25% { opacity:1; transform:translate(-50%,-60%) scale(1); }
        100% { opacity:0; transform:translate(-50%,-150%) scale(1); }
      }
      .g2048-overlay { position:absolute; inset:0; border-radius:16px; display:flex;
        flex-direction:column; align-items:center; justify-content:center; gap:10px; text-align:center;
        padding:18px; box-sizing:border-box; background:rgba(28,24,18,.78); color:#fff;
        animation:g2048-fade .25s var(--ease-out); z-index:8; }
      .g2048-overlay h3 { font-size:24px; font-weight:800; margin:0; }
      .g2048-overlay p { font-size:15px; margin:0; opacity:.9; }
      .g2048-overlay .star-row { color:rgba(255,255,255,.3); }
      @keyframes g2048-fade { from { opacity:0; } to { opacity:1; } }
      .g2048-toast { position:absolute; left:50%; top:14px; transform:translateX(-50%);
        background:var(--accent-deep); color:#fff; font-size:13px; font-weight:600;
        padding:8px 14px; border-radius:999px; box-shadow:0 4px 12px rgba(60,45,20,.25);
        animation:g2048-toast 2.2s var(--ease-out) forwards; pointer-events:none; z-index:7; }
      @keyframes g2048-toast {
        0% { opacity:0; transform:translateX(-50%) translateY(-6px); }
        12% { opacity:1; transform:translateX(-50%) translateY(0); }
        80% { opacity:1; transform:translateX(-50%) translateY(0); }
        100% { opacity:0; transform:translateX(-50%) translateY(-6px); }
      }
    `;
    document.head.appendChild(s);
  }

  let api = null;
  let root = null;
  let view = "select";   // "select" | "play"
  let level = 0;         // current level index (0-based)
  let board = null;       // grid container
  let boardArea = null;   // flex area that the board is sized to fill
  let undoBtn = null;
  let grid = [];          // 4x4 of tile|null
  let tiles = [];         // all live tile objects { value, r, c, el, mergedThis }
  let score = 0;
  let levelMaxTile = 2;   // highest tile value reached this attempt
  let targetReached = false; // already celebrated this attempt's target
  let undoSnap = null;    // one-step undo snapshot
  let over = false;
  let animating = false;  // input lock during a slide
  let keyHandler = null;
  let finalizeTimer = 0;
  let resizeHandler = null;
  // pointer state
  let ptrId = null;
  let startX = 0;
  let startY = 0;

  function levelTarget() {
    return LEVEL_TARGETS[level] || LEVEL_TARGETS[LEVEL_TARGETS.length - 1];
  }

  function computeStars(maxVal, target) {
    if (maxVal >= target * 4) return 3;
    if (maxVal >= target * 2) return 2;
    if (maxVal >= target) return 1;
    return 0;
  }

  function updateHeader() {
    const best = api.best();
    const bestVal = best == null ? 0 : best;
    api.setScore(
      `${api.t("score_label")}: ${score} • ${api.t("best_score", { score: bestVal })}`
    );
  }

  // Layout helpers: 4 cells with padding=10 and gap spacing inside board.
  function geometry() {
    const pad = 10;
    const w = board.clientWidth - pad * 2;
    const gap = 8;
    const cell = (w - gap * (SIZE - 1)) / SIZE;
    return { pad, gap, cell };
  }
  function posLeft(c) {
    const g = geometry();
    return g.pad + c * (g.cell + g.gap);
  }
  function posTop(r) {
    const g = geometry();
    return g.pad + r * (g.cell + g.gap);
  }

  function fontFor(value, cell) {
    const digits = String(value).length;
    let f = cell * 0.42;
    if (digits >= 4) f = cell * 0.3;
    else if (digits === 3) f = cell * 0.36;
    return Math.max(12, f) + "px";
  }

  function styleTile(t) {
    const g = geometry();
    const colors = RAMP[t.value] || SUPER;
    t.el.style.width = g.cell + "px";
    t.el.style.height = g.cell + "px";
    t.el.style.background = colors.bg;
    t.el.style.color = colors.fg;
    t.el.style.fontSize = fontFor(t.value, g.cell);
    t.el.textContent = t.value;
  }

  function placeEl(t) {
    t.el.style.left = posLeft(t.c) + "px";
    t.el.style.top = posTop(t.r) + "px";
  }

  function drawCells() {
    // background cells (drawn once per layout)
    const g = geometry();
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cellEl = document.createElement("div");
        cellEl.className = "g2048-cell";
        cellEl.style.width = g.cell + "px";
        cellEl.style.height = g.cell + "px";
        cellEl.style.left = posLeft(c) + "px";
        cellEl.style.top = posTop(r) + "px";
        board.appendChild(cellEl);
      }
    }
  }

  function makeTile(r, c, value, isNew) {
    const t = { value, r, c, el: document.createElement("div"), mergedThis: false };
    t.el.className = "g2048-tile";
    styleTile(t);
    placeEl(t);                // set final position BEFORE attaching → no slide
    if (isNew) {
      t.el.classList.add("g2048-new-tile");
      setTimeout(() => t.el && t.el.classList.remove("g2048-new-tile"), 200);
    }
    board.appendChild(t.el);
    grid[r][c] = t;
    tiles.push(t);
    return t;
  }

  function emptyCells() {
    const out = [];
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) if (!grid[r][c]) out.push([r, c]);
    return out;
  }

  function spawnTile() {
    const cells = emptyCells();
    if (!cells.length) return null;
    const [r, c] = cells[Math.floor(Math.random() * cells.length)];
    return makeTile(r, c, Math.random() < 0.9 ? 2 : 4, true);
  }

  function newGame() {
    if (finalizeTimer) { clearTimeout(finalizeTimer); finalizeTimer = 0; }
    score = 0;
    levelMaxTile = 2;
    targetReached = false;
    undoSnap = null;
    if (undoBtn) undoBtn.disabled = true;
    over = false;
    animating = false;
    grid = [];
    for (let r = 0; r < SIZE; r++) grid.push([null, null, null, null]);
    tiles = [];
    board.innerHTML = "";
    drawCells();
    spawnTile();
    spawnTile();
    updateHeader();
  }

  function traversalOrder(dir) {
    const idx = [0, 1, 2, 3];
    const rows = dir === "down" ? idx.slice().reverse() : idx.slice();
    const cols = dir === "right" ? idx.slice().reverse() : idx.slice();
    return { rows, cols };
  }

  function gainPopup(r, c, amount) {
    const g = geometry();
    const pop = document.createElement("div");
    pop.className = "g2048-gain";
    pop.textContent = "+" + amount;
    pop.style.left = posLeft(c) + g.cell / 2 + "px";
    pop.style.top = posTop(r) + "px";
    board.appendChild(pop);
    setTimeout(() => { if (pop.parentNode) pop.parentNode.removeChild(pop); }, 720);
  }

  // ---- One-step undo: snapshot is plain values, board is rebuilt on restore ----
  function snapshotState() {
    const vals = [];
    for (let r = 0; r < SIZE; r++) {
      const row = [];
      for (let c = 0; c < SIZE; c++) row.push(grid[r][c] ? grid[r][c].value : null);
      vals.push(row);
    }
    return { vals, score, levelMaxTile, targetReached };
  }

  function restoreSnapshot(snap) {
    if (finalizeTimer) { clearTimeout(finalizeTimer); finalizeTimer = 0; }
    animating = false;
    over = false;
    score = snap.score;
    levelMaxTile = snap.levelMaxTile;
    targetReached = snap.targetReached;
    grid = [];
    for (let r = 0; r < SIZE; r++) grid.push([null, null, null, null]);
    tiles = [];
    board.innerHTML = "";
    drawCells();
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const v = snap.vals[r][c];
        if (v) makeTile(r, c, v, false);
      }
    }
    updateHeader();
  }

  function doUndo() {
    if (!undoSnap || animating || view !== "play") return;
    restoreSnapshot(undoSnap);
    undoSnap = null;
    if (undoBtn) undoBtn.disabled = true;
  }

  // dir: 'left','right','up','down'
  function move(dir) {
    if (over || animating) return;
    const preSnap = snapshotState();
    const vec = VEC[dir];
    const order = traversalOrder(dir);
    let moved = false;
    let gained = 0;
    const merges = []; // { survivor, victim, value }

    for (const t of tiles) t.mergedThis = false;

    for (const r of order.rows) {
      for (const c of order.cols) {
        const tile = grid[r][c];
        if (!tile) continue;
        // slide as far as possible into empty cells
        let nr = r, nc = c;
        while (true) {
          const tr = nr + vec[0], tc = nc + vec[1];
          if (tr < 0 || tr >= SIZE || tc < 0 || tc >= SIZE) break;
          if (grid[tr][tc] === null) { nr = tr; nc = tc; }
          else break;
        }
        // look one beyond for a merge target
        const br = nr + vec[0], bc = nc + vec[1];
        let mergedHere = false;
        if (br >= 0 && br < SIZE && bc >= 0 && bc < SIZE) {
          const other = grid[br][bc];
          if (other && other.value === tile.value && !other.mergedThis) {
            grid[r][c] = null;
            tile.r = br; tile.c = bc;       // slide visually onto the survivor
            other.mergedThis = true;
            merges.push({ survivor: other, victim: tile, value: tile.value * 2 });
            gained += tile.value * 2;
            moved = true;
            mergedHere = true;
          }
        }
        if (!mergedHere && (nr !== r || nc !== c)) {
          grid[r][c] = null;
          grid[nr][nc] = tile;
          tile.r = nr; tile.c = nc;
          moved = true;
        }
      }
    }

    if (!moved) return;

    undoSnap = preSnap;
    if (undoBtn) undoBtn.disabled = false;

    // animate every tile toward its new logical position
    animating = true;
    for (const t of tiles) placeEl(t);

    if (gained > 0) {
      api.playClick();
      api.vibrate(10);
      // Brighter note for bigger merges (pitch tracks the largest tile made).
      if (api.soundOn()) {
        let maxMerge = 0;
        for (const m of merges) if (m.value > maxMerge) maxMerge = m.value;
        const pitch = 300 + Math.min(Math.log2(maxMerge || 4), 12) * 42;
        api.tone(pitch, 0.07, "triangle");
      }
    } else {
      api.vibrate(6);
    }

    finalizeTimer = setTimeout(() => {
      finalizeTimer = 0;
      // resolve merges: drop the victim, level up the survivor
      for (const m of merges) {
        if (m.victim.el && m.victim.el.parentNode) m.victim.el.parentNode.removeChild(m.victim.el);
        const vi = tiles.indexOf(m.victim);
        if (vi >= 0) tiles.splice(vi, 1);
        m.survivor.value = m.value;
        styleTile(m.survivor);
        m.survivor.el.classList.remove("g2048-merged");
        void m.survivor.el.offsetWidth; // reflow so the bump replays
        m.survivor.el.classList.add("g2048-merged");
        gainPopup(m.survivor.r, m.survivor.c, m.value);
        if (m.value > levelMaxTile) levelMaxTile = m.value;
      }

      score += gained;
      if (gained > 0) api.saveBest(score);
      spawnTile();
      updateHeader();

      if (!targetReached && levelMaxTile >= levelTarget()) {
        targetReached = true;
        celebrate();
      }

      animating = false;
      if (!hasMoves()) gameOver();
    }, SLIDE_MS + 10);
  }

  function hasMoves() {
    if (emptyCells().length) return true;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const v = grid[r][c] && grid[r][c].value;
        if (c + 1 < SIZE && grid[r][c + 1] && grid[r][c + 1].value === v) return true;
        if (r + 1 < SIZE && grid[r + 1][c] && grid[r + 1][c].value === v) return true;
      }
    }
    return false;
  }

  function celebrate() {
    api.vibrate([20, 40, 20]);
    if (api.soundOn()) {
      api.tone(660, 0.12, "triangle");
      setTimeout(() => api.tone(880, 0.18, "triangle"), 120);
    }
    const toast = document.createElement("div");
    toast.className = "g2048-toast";
    toast.textContent = lt("reached") + " " + lt("keep_going");
    board.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 2300);
  }

  function gameOver() {
    over = true;
    const best = api.saveBest(score);
    api.vibrate([30, 60, 30]);
    if (api.soundOn()) {
      api.tone(330, 0.14, "sawtooth");
      setTimeout(() => api.tone(196, 0.22, "sawtooth"), 130);
    }

    const target = levelTarget();
    const stars = computeStars(levelMaxTile, target);
    ArcadeUI.recordResult("2048", TOTAL_LEVELS, level, stars);

    const ov = document.createElement("div");
    ov.className = "g2048-overlay";

    const h = document.createElement("h3");
    h.textContent = stars > 0 ? ArcadeUI.t("level_complete") : ArcadeUI.t("level_failed");

    const starRow = document.createElement("div");
    ArcadeUI.renderStars(starRow, stars, { api });

    const p1 = document.createElement("p");
    p1.textContent = `${api.t("score_label")}: ${score}`;
    const p2 = document.createElement("p");
    p2.textContent = api.t("best_score", { score: best == null ? score : best });

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
    ov.appendChild(p2);
    ov.appendChild(actions);
    board.appendChild(ov);
  }

  function handleSwipe(dx, dy) {
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    const MIN = 24;
    if (ax < MIN && ay < MIN) return;
    if (ax > ay) move(dx > 0 ? "right" : "left");
    else move(dy > 0 ? "down" : "up");
  }

  function onPointerDown(e) {
    if (ptrId !== null) return;
    ptrId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
  }
  function onPointerUp(e) {
    if (e.pointerId !== ptrId) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    ptrId = null;
    handleSwipe(dx, dy);
  }
  function onPointerCancel(e) {
    if (e.pointerId === ptrId) ptrId = null;
  }

  function onKey(e) {
    if (view !== "play") return;
    let dir = null;
    if (e.key === "ArrowLeft") dir = "left";
    else if (e.key === "ArrowRight") dir = "right";
    else if (e.key === "ArrowUp") dir = "up";
    else if (e.key === "ArrowDown") dir = "down";
    if (!dir) return;
    e.preventDefault();
    move(dir);
  }

  // Reposition all tiles without animating (orientation / size change).
  function reflow() {
    if (!board || !boardArea) return;
    ArcadeUI.fitSquare(boardArea, board);
    board.classList.add("no-anim");
    const g = geometry();
    board.querySelectorAll(".g2048-cell").forEach((cellEl, i) => {
      const r = Math.floor(i / SIZE), c = i % SIZE;
      cellEl.style.width = g.cell + "px";
      cellEl.style.height = g.cell + "px";
      cellEl.style.left = posLeft(c) + "px";
      cellEl.style.top = posTop(r) + "px";
    });
    for (const t of tiles) { styleTile(t); placeEl(t); }
    // re-enable transitions on the next frame
    requestAnimationFrame(() => board && board.classList.remove("no-anim"));
  }

  // ---- Level select ----
  function showLevelSelect() {
    view = "select";
    if (finalizeTimer) { clearTimeout(finalizeTimer); finalizeTimer = 0; }
    animating = false;
    board = null;
    boardArea = null;
    undoBtn = null;
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

    const progress = ArcadeUI.loadProgress("2048", TOTAL_LEVELS);
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
    newGame();
  }

  function buildPlayUI() {
    root.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "g2048-wrap";

    const bar = document.createElement("div");
    bar.className = "g2048-bar";

    const info = document.createElement("div");
    info.className = "g2048-info";
    const levelLabel = document.createElement("div");
    levelLabel.className = "g2048-level-label";
    levelLabel.textContent = ArcadeUI.t("level_n", { n: level + 1 });
    const targetLabel = document.createElement("div");
    targetLabel.className = "g2048-target";
    targetLabel.textContent = lt("target_hint", { n: levelTarget() });
    info.appendChild(levelLabel);
    info.appendChild(targetLabel);

    const actions = document.createElement("div");
    actions.className = "g2048-actions";

    undoBtn = document.createElement("button");
    undoBtn.className = "arcade-btn";
    undoBtn.textContent = "↺";
    undoBtn.title = "Undo";
    undoBtn.disabled = true;
    undoBtn.addEventListener("click", () => { api.playClick(); doUndo(); });

    const levelsBtn = document.createElement("button");
    levelsBtn.className = "arcade-levels-btn";
    levelsBtn.textContent = ArcadeUI.t("levels");
    levelsBtn.addEventListener("click", () => { api.playClick(); showLevelSelect(); });

    actions.appendChild(undoBtn);
    actions.appendChild(levelsBtn);

    bar.appendChild(info);
    bar.appendChild(actions);

    boardArea = document.createElement("div");
    boardArea.className = "arcade-board-area";

    board = document.createElement("div");
    board.className = "g2048-board";
    board.addEventListener("pointerdown", onPointerDown);
    board.addEventListener("pointerup", onPointerUp);
    board.addEventListener("pointercancel", onPointerCancel);

    boardArea.appendChild(board);
    wrap.appendChild(bar);
    wrap.appendChild(boardArea);
    root.appendChild(wrap);

    ArcadeUI.fitSquare(boardArea, board);
  }

  window.ARCADE_GAMES.push({
    id: "2048",
    emoji: "🔢",
    nameKey: "game_2048_name",
    descKey: "game_2048_desc",
    accent: "#e0843a",
    mount(rootEl, a) {
      injectStyle();
      api = a;
      root = rootEl;
      root.innerHTML = "";
      view = "select";

      keyHandler = onKey;
      document.addEventListener("keydown", keyHandler);
      resizeHandler = () => { if (view === "play") reflow(); };
      window.addEventListener("resize", resizeHandler);

      showLevelSelect();
    },
    unmount() {
      if (keyHandler) document.removeEventListener("keydown", keyHandler);
      keyHandler = null;
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      resizeHandler = null;
      if (finalizeTimer) { clearTimeout(finalizeTimer); finalizeTimer = 0; }
      if (board) {
        board.removeEventListener("pointerdown", onPointerDown);
        board.removeEventListener("pointerup", onPointerUp);
        board.removeEventListener("pointercancel", onPointerCancel);
      }
      ptrId = null;
      board = null;
      boardArea = null;
      undoBtn = null;
      root = null;
      api = null;
      grid = [];
      tiles = [];
      view = "select";
      level = 0;
      undoSnap = null;
    },
  });
})();
