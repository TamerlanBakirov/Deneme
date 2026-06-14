// 2048 — slide and merge tiles on a 4x4 grid to reach 2048. Self-contained
// arcade module; see js/arcade.js for the host contract.
window.ARCADE_GAMES = window.ARCADE_GAMES || [];
(function () {
  const SIZE = 4;
  const STYLE_ID = "g2048-game-style";

  // Local fallback strings (i18n.js can't be edited). English default + Turkish.
  const LOCAL = {
    en: { keep_going: "Keep going!", reached: "You made 2048!" },
    tr: { keep_going: "Devam et!", reached: "2048'e ulaştın!" },
  };
  function lang() {
    const l = (document.documentElement.lang || "en").slice(0, 2);
    return LOCAL[l] ? l : "en";
  }
  function lt(key) {
    return (LOCAL[lang()] || LOCAL.en)[key] || LOCAL.en[key] || key;
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
      .game-2048 { align-items:center; justify-content:center; gap:16px; padding:16px; box-sizing:border-box; }
      .g2048-wrap { display:flex; flex-direction:column; align-items:center; gap:14px; width:100%; max-width:340px; }
      .g2048-bar { display:flex; align-items:center; justify-content:space-between; width:100%; gap:10px; }
      .g2048-hint { color:var(--muted); font-size:13px; line-height:1.3; }
      .g2048-new { border:none; cursor:pointer; border-radius:12px; padding:9px 14px;
        font-size:14px; font-weight:600; color:#fff; background:var(--accent-deep);
        box-shadow:0 3px 8px rgba(60,45,20,.18); transition:transform .12s var(--ease-out); }
      .g2048-new:active { transform:scale(.94); }
      .g2048-board { position:relative; width:100%; aspect-ratio:1; border-radius:16px;
        background:var(--panel); padding:10px; box-sizing:border-box; touch-action:none;
        box-shadow:inset 0 2px 8px rgba(60,45,20,.10); user-select:none; -webkit-user-select:none; }
      .g2048-cell { position:absolute; border-radius:11px; background:var(--divider); opacity:.5; }
      .g2048-tile { position:absolute; border-radius:11px; display:flex; align-items:center;
        justify-content:center; font-weight:800; line-height:1; box-sizing:border-box;
        box-shadow:0 2px 6px rgba(60,45,20,.16);
        transition:left .12s var(--ease-out), top .12s var(--ease-out); }
      .g2048-tile.g2048-new-tile { animation:g2048-pop .16s var(--ease-spring); }
      .g2048-tile.g2048-merged { animation:g2048-bump .18s var(--ease-spring); }
      @keyframes g2048-pop { 0% { transform:scale(.2); opacity:0; } 100% { transform:scale(1); opacity:1; } }
      @keyframes g2048-bump { 0% { transform:scale(1); } 45% { transform:scale(1.16); } 100% { transform:scale(1); } }
      .g2048-overlay { position:absolute; inset:0; border-radius:16px; display:flex;
        flex-direction:column; align-items:center; justify-content:center; gap:12px; text-align:center;
        padding:18px; box-sizing:border-box; background:rgba(28,24,18,.78); color:#fff;
        animation:g2048-fade .25s var(--ease-out); }
      .g2048-overlay h3 { font-size:24px; font-weight:800; margin:0; }
      .g2048-overlay p { font-size:15px; margin:0; opacity:.9; }
      .g2048-overlay .g2048-new { background:var(--accent); }
      @keyframes g2048-fade { from { opacity:0; } to { opacity:1; } }
      .g2048-toast { position:absolute; left:50%; top:14px; transform:translateX(-50%);
        background:var(--accent-deep); color:#fff; font-size:13px; font-weight:600;
        padding:8px 14px; border-radius:999px; box-shadow:0 4px 12px rgba(60,45,20,.25);
        animation:g2048-toast 2.2s var(--ease-out) forwards; pointer-events:none; z-index:5; }
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
  let board = null;       // grid container
  let grid = [];          // 4x4 of {value} or null
  let score = 0;
  let won = false;        // already celebrated 2048
  let over = false;
  let keyHandler = null;
  let raf = 0;
  // pointer state
  let ptrId = null;
  let startX = 0;
  let startY = 0;

  function updateHeader() {
    const best = api.best();
    const bestVal = best == null ? 0 : best;
    api.setScore(
      `${api.t("score_label")}: ${score} • ${api.t("best_score", { score: bestVal })}`
    );
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
    grid[r][c] = { value: Math.random() < 0.9 ? 2 : 4, isNew: true };
    return [r, c];
  }

  function newGame() {
    score = 0;
    won = false;
    over = false;
    grid = [];
    for (let r = 0; r < SIZE; r++) grid.push([null, null, null, null]);
    spawnTile();
    spawnTile();
    render();
    updateHeader();
  }

  // Layout helpers: 4 cells with padding=10 and gap-ish spacing inside board.
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

  function render() {
    if (!board) return;
    const g = geometry();
    board.innerHTML = "";
    // background cells
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
    // tiles
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const t = grid[r][c];
        if (!t) continue;
        const el = document.createElement("div");
        el.className = "g2048-tile";
        if (t.isNew) el.classList.add("g2048-new-tile");
        if (t.merged) el.classList.add("g2048-merged");
        const colors = RAMP[t.value] || SUPER;
        el.style.width = g.cell + "px";
        el.style.height = g.cell + "px";
        el.style.left = posLeft(c) + "px";
        el.style.top = posTop(r) + "px";
        el.style.background = colors.bg;
        el.style.color = colors.fg;
        el.style.fontSize = fontFor(t.value, g.cell);
        el.textContent = t.value;
        board.appendChild(el);
        // clear one-shot flags after attaching
        t.isNew = false;
        t.merged = false;
      }
    }
  }

  // Slide+merge a single line (array of cell objects or null). Returns
  // { line, gained, moved }. Mutates nothing of the original.
  function collapseLine(line) {
    const vals = line.filter((x) => x).map((x) => x.value);
    const result = [];
    let gained = 0;
    let i = 0;
    while (i < vals.length) {
      if (i + 1 < vals.length && vals[i] === vals[i + 1]) {
        const merged = vals[i] * 2;
        result.push({ value: merged, merged: true });
        gained += merged;
        i += 2;
      } else {
        result.push({ value: vals[i] });
        i += 1;
      }
    }
    while (result.length < SIZE) result.push(null);
    return { line: result, gained };
  }

  // dir: 'left','right','up','down'
  function move(dir) {
    if (over) return;
    let moved = false;
    let gained = 0;
    let reached2048 = false;

    const lines = [];
    for (let i = 0; i < SIZE; i++) {
      let line;
      if (dir === "left" || dir === "right") {
        line = grid[i].slice();
        if (dir === "right") line.reverse();
      } else {
        line = [grid[0][i], grid[1][i], grid[2][i], grid[3][i]];
        if (dir === "down") line.reverse();
      }
      lines.push(line);
    }

    const newLines = lines.map((line) => {
      const res = collapseLine(line);
      gained += res.gained;
      return res.line;
    });

    // detect movement by comparing value sequences (orientation-consistent)
    for (let i = 0; i < SIZE; i++) {
      const before = lines[i].map((x) => (x ? x.value : 0));
      const after = newLines[i].map((x) => (x ? x.value : 0));
      for (let j = 0; j < SIZE; j++) {
        if (before[j] !== after[j]) { moved = true; break; }
      }
    }

    if (!moved) return;

    // write back
    for (let i = 0; i < SIZE; i++) {
      let line = newLines[i];
      if (dir === "right" || dir === "down") line = line.slice().reverse();
      for (let j = 0; j < SIZE; j++) {
        const cell = line[j];
        if (dir === "left" || dir === "right") {
          grid[i][j] = cell;
        } else {
          grid[j][i] = cell;
        }
        if (cell && cell.value === 2048 && cell.merged) reached2048 = true;
      }
    }

    score += gained;

    if (gained > 0) {
      api.playClick();
      api.vibrate(10);
      if (api.soundOn()) api.tone(440, 0.05, "sine");
    } else {
      api.vibrate(6);
    }

    spawnTile();
    render();
    updateHeader();

    if (gained > 0) api.saveBest(score);

    if (reached2048 && !won) {
      won = true;
      celebrate();
    }

    if (!hasMoves()) gameOver();
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
    const ov = document.createElement("div");
    ov.className = "g2048-overlay";
    const h = document.createElement("h3");
    h.textContent = api.t("game_over");
    const p1 = document.createElement("p");
    p1.textContent = `${api.t("score_label")}: ${score}`;
    const p2 = document.createElement("p");
    p2.textContent = api.t("best_score", { score: best == null ? score : best });
    const btn = document.createElement("button");
    btn.className = "g2048-new";
    btn.textContent = api.t("new_game");
    btn.addEventListener("click", () => {
      api.playClick();
      newGame();
    });
    ov.appendChild(h);
    ov.appendChild(p1);
    ov.appendChild(p2);
    ov.appendChild(btn);
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
    let dir = null;
    if (e.key === "ArrowLeft") dir = "left";
    else if (e.key === "ArrowRight") dir = "right";
    else if (e.key === "ArrowUp") dir = "up";
    else if (e.key === "ArrowDown") dir = "down";
    if (!dir) return;
    e.preventDefault();
    move(dir);
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

      const wrap = document.createElement("div");
      wrap.className = "g2048-wrap";

      const bar = document.createElement("div");
      bar.className = "g2048-bar";
      const hint = document.createElement("div");
      hint.className = "g2048-hint";
      hint.textContent = api.t("game_2048_desc");
      const newBtn = document.createElement("button");
      newBtn.className = "g2048-new";
      newBtn.textContent = api.t("new_game");
      newBtn.addEventListener("click", () => {
        api.playClick();
        newGame();
      });
      bar.appendChild(hint);
      bar.appendChild(newBtn);

      board = document.createElement("div");
      board.className = "g2048-board";
      board.addEventListener("pointerdown", onPointerDown);
      board.addEventListener("pointerup", onPointerUp);
      board.addEventListener("pointercancel", onPointerCancel);

      wrap.appendChild(bar);
      wrap.appendChild(board);
      root.appendChild(wrap);

      keyHandler = onKey;
      document.addEventListener("keydown", keyHandler);

      // Render once layout is measurable, and re-render on resize.
      raf = requestAnimationFrame(() => {
        newGame();
      });
    },
    unmount() {
      if (keyHandler) document.removeEventListener("keydown", keyHandler);
      keyHandler = null;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (board) {
        board.removeEventListener("pointerdown", onPointerDown);
        board.removeEventListener("pointerup", onPointerUp);
        board.removeEventListener("pointercancel", onPointerCancel);
      }
      ptrId = null;
      board = null;
      root = null;
      api = null;
    },
  });
})();
