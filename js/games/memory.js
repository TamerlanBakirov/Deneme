// Memory Match — flip cards to find all the pairs. Self-contained arcade
// module; see js/arcade.js for the host contract.
//
// Knot-Escape-style level system: 8 levels of increasing grid size (more
// pairs = more cards). Stars are earned based on how few move-pairs it took
// to clear the board. A combo streak rewards consecutive correct matches.
window.ARCADE_GAMES = window.ARCADE_GAMES || [];
(function () {
  const TOTAL_LEVELS = 8;
  const LEVEL_PAIRS = [3, 6, 8, 10, 12, 15, 18, 18];
  // cols x rows for each level (cols*2*rows == pairs*2 for every entry).
  const LEVEL_COLS = [2, 3, 4, 4, 4, 5, 6, 6];
  const LEVEL_ROWS = [3, 4, 4, 5, 6, 6, 6, 6];

  const FACES = [
    "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯",
    "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🦄",
  ];

  // Local fallback strings (i18n.js can't be edited). English default + Turkish.
  const STRINGS = {
    en: { get_ready: "Get ready!", memorize: "Memorize the cards…", streak: "🔥 x{n}" },
    tr: { get_ready: "Hazır ol!", memorize: "Kartları ezberle…", streak: "🔥 x{n}" },
  };
  function tt(key, vars) {
    const lang = (document.documentElement.lang || "en").slice(0, 2);
    const dict = STRINGS[lang] || STRINGS.en;
    let s = dict[key] || STRINGS.en[key] || key;
    if (vars) for (const k in vars) s = s.replace("{" + k + "}", vars[k]);
    return s;
  }

  const STYLE_ID = "memory-game-style";
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `
      .game-memory { display:flex; flex-direction:column; min-height:0; flex:1; padding:14px; box-sizing:border-box; }
      .mem-wrap { display:flex; flex-direction:column; min-height:0; width:100%; height:100%; gap:10px; }
      .mem-bar { display:flex; align-items:center; justify-content:space-between; width:100%; gap:10px; flex-wrap:wrap; }
      .mem-info { display:flex; flex-direction:column; gap:2px; }
      .mem-level-label { font-size:16px; font-weight:800; color:var(--accent-deep); }
      .mem-streak { color:var(--accent); font-size:13px; font-weight:700; min-height:16px; }
      .mem-hint { color:var(--muted); font-size:14px; min-height:18px; text-align:center; transition:opacity .3s ease; }
      .mem-grid { display:grid; gap:10px; perspective:800px; box-sizing:border-box; }
      .mem-card { aspect-ratio:1; border:none; border-radius:16px; background:transparent;
        padding:0; cursor:pointer; position:relative; }
      .mem-card:active .mem-flip { transform: scale(.94) rotateY(var(--mem-rot, 0deg)); }
      .mem-flip { position:relative; width:100%; height:100%; transform-style:preserve-3d;
        transition:transform .35s var(--ease-spring); transform: rotateY(0deg); --mem-rot: 0deg; }
      .mem-card.flipped .mem-flip, .mem-card.matched .mem-flip { --mem-rot: 180deg; transform: rotateY(180deg); }
      .mem-face { position:absolute; inset:0; border-radius:16px; display:flex; align-items:center;
        justify-content:center; font-size:30px; line-height:1; backface-visibility:hidden;
        box-shadow:0 4px 12px rgba(60,45,20,.08); }
      .mem-face-back { background:var(--panel); color:var(--muted); font-size:22px; transform: rotateY(0deg); }
      .mem-face-front { background:var(--accent-soft); transform: rotateY(180deg); }
      .mem-card.matched .mem-face-front { background:var(--accent-soft); }
      .mem-card.matched .mem-flip { animation: mem-pulse .5s var(--ease-out); }
      .mem-card.mismatch .mem-flip { animation: mem-shake .4s var(--ease-out); }
      @keyframes mem-pulse {
        0% { box-shadow: 0 0 0 0 var(--accent); }
        50% { transform: rotateY(180deg) scale(1.08); box-shadow: 0 0 18px 4px var(--accent); }
        100% { transform: rotateY(180deg) scale(1); box-shadow: 0 0 0 0 transparent; }
      }
      @keyframes mem-shake {
        0%, 100% { transform: rotateY(0deg) translateX(0); }
        20% { transform: rotateY(0deg) translateX(-6px); }
        40% { transform: rotateY(0deg) translateX(6px); }
        60% { transform: rotateY(0deg) translateX(-4px); }
        80% { transform: rotateY(0deg) translateX(4px); }
      }
      .mem-card.matched { opacity:.65; }
      .mem-card.peeking .mem-flip { transform: rotateY(180deg); --mem-rot: 180deg; }

      .mem-fonts-1 .mem-face { font-size:34px; }
      .mem-fonts-2 .mem-face { font-size:26px; }
      .mem-fonts-3 .mem-face { font-size:20px; }

      .mem-overlay { position:absolute; inset:0; border-radius:16px; display:flex;
        flex-direction:column; align-items:center; justify-content:center; gap:10px; text-align:center;
        padding:18px; box-sizing:border-box; background:rgba(28,24,18,.78); color:#fff;
        animation:mem-fade .25s var(--ease-out); z-index:8; }
      .mem-overlay h3 { font-size:24px; font-weight:800; margin:0; }
      .mem-overlay p { font-size:15px; margin:0; opacity:.9; }
      .mem-overlay .star-row { color:rgba(255,255,255,.3); }
      @keyframes mem-fade { from { opacity:0; } to { opacity:1; } }

      .mem-confetti { position:absolute; inset:0; pointer-events:none; overflow:hidden; border-radius:20px; z-index:9; }
      .mem-confetti span { position:absolute; top:-10%; font-size:18px; opacity:0;
        animation: mem-confetti-fall 1.1s ease-out forwards; }
      @keyframes mem-confetti-fall {
        0% { opacity:0; transform: translateY(-20px) rotate(0deg) scale(.6); }
        15% { opacity:1; }
        100% { opacity:0; transform: translateY(160px) rotate(280deg) scale(1.1); }
      }
    `;
    document.head.appendChild(s);
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  let api = null;
  let root = null;
  let view = "select"; // "select" | "play"
  let level = 0;       // current level index (0-based)

  let board = null;     // .mem-grid element
  let boardArea = null; // .arcade-board-area wrapper
  let streakEl = null;  // live combo-streak label

  let timer = null;
  let startTime = 0;
  let moves = 0;
  let matched = 0;
  let pairs = 8;
  let streak = 0;
  let busy = false;
  let first = null;
  let timeouts = [];
  let resizeHandler = null;

  function setTO(fn, ms) {
    const id = setTimeout(() => {
      timeouts = timeouts.filter((t) => t !== id);
      fn();
    }, ms);
    timeouts.push(id);
    return id;
  }

  function clearAllTimeouts() {
    timeouts.forEach((id) => clearTimeout(id));
    timeouts = [];
  }

  function fmtTime(secs) {
    const mm = String(Math.floor(secs / 60)).padStart(1, "0");
    const ss = String(secs % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  function updateHeader() {
    const secs = Math.floor((Date.now() - startTime) / 1000);
    api.setScore(`${api.t("moves_label")}: ${moves} • ${fmtTime(secs)}`);
  }

  function updateStreak() {
    if (!streakEl) return;
    streakEl.textContent = streak >= 2 ? tt("streak", { n: streak }) : "";
  }

  function totalStars() {
    const progress = ArcadeUI.loadProgress("memory", TOTAL_LEVELS);
    return progress.stars.reduce((a, b) => a + b, 0);
  }

  function computeStars(lvl, mvs) {
    const p = LEVEL_PAIRS[lvl];
    if (lvl === TOTAL_LEVELS - 1) {
      // L8 reuses L7's grid but demands a tighter solve to feel like the
      // toughest level.
      if (mvs <= Math.ceil(p * 1.3)) return 3;
      if (mvs <= p * 1.8) return 2;
      return 1;
    }
    if (mvs <= Math.ceil(p * 1.5)) return 3;
    if (mvs <= p * 2) return 2;
    return 1;
  }

  // ---- Game setup ----
  function newGame() {
    moves = 0;
    matched = 0;
    streak = 0;
    busy = true; // blocked during peek
    first = null;
    if (timer) clearInterval(timer);
    clearAllTimeouts();

    pairs = LEVEL_PAIRS[level];
    const cols = LEVEL_COLS[level];
    const rows = LEVEL_ROWS[level];
    const faces = shuffle(FACES.slice()).slice(0, pairs);
    const deck = shuffle(faces.concat(faces));

    board.innerHTML = "";
    board.className = "mem-grid";
    if (cols >= 6) board.classList.add("mem-fonts-3");
    else if (cols >= 5) board.classList.add("mem-fonts-2");
    else if (cols <= 2) board.classList.add("mem-fonts-1");
    board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    board.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    deck.forEach((face) => {
      const card = document.createElement("button");
      card.className = "mem-card peeking";
      card.dataset.face = face;
      card.innerHTML = `
        <div class="mem-flip">
          <div class="mem-face mem-face-back">❓</div>
          <div class="mem-face mem-face-front">${face}</div>
        </div>
      `;
      card.addEventListener("click", () => onFlip(card));
      board.appendChild(card);
    });

    if (boardArea) ArcadeUI.fitGrid(boardArea, board, cols, rows, 10);
    updateStreak();

    // Peek: show all faces briefly, then flip down and start the clock.
    setTO(() => {
      board.querySelectorAll(".mem-card").forEach((c) => c.classList.remove("peeking"));
      setTO(() => {
        busy = false;
        startTime = Date.now();
        timer = setInterval(updateHeader, 1000);
        updateHeader();
      }, 320);
    }, 1000);

    api.setScore(`${api.t("moves_label")}: 0 • 0:00`);
  }

  function onFlip(card) {
    if (busy || card.classList.contains("flipped") || card.classList.contains("matched")) return;
    api.playClick();
    api.vibrate(8);
    card.classList.add("flipped");

    if (!first) {
      first = card;
      return;
    }
    moves += 1;
    updateHeader();

    if (first.dataset.face === card.dataset.face) {
      first.classList.add("matched");
      card.classList.add("matched");
      first = null;
      matched += 1;
      streak += 1;
      updateStreak();
      // Pitch climbs with the combo streak for a satisfying escalation.
      if (api.soundOn()) api.tone(520 + Math.min(streak - 1, 6) * 70, 0.09, "triangle");
      if (matched === pairs) win();
    } else {
      streak = 0;
      updateStreak();
      if (api.soundOn()) api.tone(180, 0.12, "sine");
      busy = true;
      const a = first;
      const b = card;
      first = null;
      a.classList.add("mismatch");
      b.classList.add("mismatch");
      setTO(() => {
        a.classList.remove("flipped", "mismatch");
        b.classList.remove("flipped", "mismatch");
        busy = false;
      }, 720);
    }
  }

  function spawnConfetti(container) {
    const emojis = ["🎉", "✨", "⭐", "🎊", "💫"];
    const layer = document.createElement("div");
    layer.className = "mem-confetti";
    for (let i = 0; i < 14; i++) {
      const span = document.createElement("span");
      span.textContent = emojis[i % emojis.length];
      span.style.left = `${Math.random() * 100}%`;
      span.style.animationDelay = `${(Math.random() * 0.4).toFixed(2)}s`;
      span.style.fontSize = `${14 + Math.round(Math.random() * 14)}px`;
      layer.appendChild(span);
    }
    container.appendChild(layer);
  }

  function win() {
    if (timer) { clearInterval(timer); timer = null; }
    api.vibrate([20, 40, 20]);
    if (api.soundOn()) {
      api.tone(660, 0.12);
      setTO(() => api.tone(880, 0.18), 110);
    }
    const secs = Math.floor((Date.now() - startTime) / 1000);
    const stars = computeStars(level, moves);
    ArcadeUI.recordResult("memory", TOTAL_LEVELS, level, stars);
    api.saveBest(totalStars());

    setTO(() => {
      showResult(stars, secs);
    }, 700);
  }

  function showResult(stars, secs) {
    if (!boardArea) return;
    const ov = document.createElement("div");
    ov.className = "mem-overlay";

    const h = document.createElement("h3");
    h.textContent = stars > 0 ? ArcadeUI.t("level_complete") : ArcadeUI.t("level_failed");

    const starRow = document.createElement("div");
    ArcadeUI.renderStars(starRow, stars, { api });

    const p1 = document.createElement("p");
    p1.textContent = `${api.t("moves_label")}: ${moves} • ${fmtTime(secs)}`;

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
    boardArea.appendChild(ov);

    if (stars > 0) spawnConfetti(ov);
  }

  // Re-fit the board to the current area (orientation / size change).
  function reflow() {
    if (!board || !boardArea || view !== "play") return;
    ArcadeUI.fitGrid(boardArea, board, LEVEL_COLS[level], LEVEL_ROWS[level], 10);
  }

  // ---- Level select ----
  function showLevelSelect() {
    view = "select";
    if (timer) { clearInterval(timer); timer = null; }
    clearAllTimeouts();
    busy = true;
    board = null;
    boardArea = null;
    streakEl = null;
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

    const progress = ArcadeUI.loadProgress("memory", TOTAL_LEVELS);
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
    wrap.className = "mem-wrap";

    const bar = document.createElement("div");
    bar.className = "mem-bar";

    const info = document.createElement("div");
    info.className = "mem-info";
    const levelLabel = document.createElement("div");
    levelLabel.className = "mem-level-label";
    levelLabel.textContent = ArcadeUI.t("level_n", { n: level + 1 });
    streakEl = document.createElement("div");
    streakEl.className = "mem-streak";
    info.appendChild(levelLabel);
    info.appendChild(streakEl);

    const levelsBtn = document.createElement("button");
    levelsBtn.className = "arcade-levels-btn";
    levelsBtn.textContent = ArcadeUI.t("levels");
    levelsBtn.addEventListener("click", () => { api.playClick(); showLevelSelect(); });

    bar.appendChild(info);
    bar.appendChild(levelsBtn);

    const hint = document.createElement("div");
    hint.className = "mem-hint";
    hint.textContent = tt("memorize");
    setTO(() => { hint.style.opacity = "0"; }, 1000);
    setTO(() => { if (hint.parentNode) hint.remove(); }, 1320);

    boardArea = document.createElement("div");
    boardArea.className = "arcade-board-area";

    board = document.createElement("div");
    board.className = "mem-grid";
    boardArea.appendChild(board);

    wrap.appendChild(bar);
    wrap.appendChild(hint);
    wrap.appendChild(boardArea);
    root.appendChild(wrap);
  }

  window.ARCADE_GAMES.push({
    id: "memory",
    emoji: "🧠",
    nameKey: "game_memory_name",
    descKey: "game_memory_desc",
    accent: "#9b6dd0",
    mount(rootEl, a) {
      injectStyle();
      api = a;
      root = rootEl;
      root.innerHTML = "";
      view = "select";

      resizeHandler = () => { if (view === "play") reflow(); };
      window.addEventListener("resize", resizeHandler);

      showLevelSelect();
    },
    unmount() {
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      resizeHandler = null;
      if (timer) clearInterval(timer);
      timer = null;
      clearAllTimeouts();
      board = null;
      boardArea = null;
      streakEl = null;
      root = null;
      api = null;
      view = "select";
      level = 0;
      first = null;
      busy = false;
    },
  });
})();
