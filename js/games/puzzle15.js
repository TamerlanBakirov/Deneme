// 15-Puzzle — slide tiles on a 4x4 grid to sort them 1-15 with blank bottom-right.
// Self-contained arcade module; see js/arcade.js for the host contract.
window.ARCADE_GAMES = window.ARCADE_GAMES || [];
(function () {
  const STYLE_ID = "puzzle15-game-style";
  const TOTAL_LEVELS = 8;
  const SHUFFLE_DEPTH = [12, 20, 30, 45, 60, 80, 100, 130];
  const PAR = [18, 30, 45, 65, 90, 115, 145, 185];
  const SLIDE_MS = 120;

  // Local tutorial strings
  const tutSteps = [
    {
      emoji: "🔢",
      title: { en: "Slide the Tiles", tr: "Kareleri Kaydır" },
      text: { en: "Tap a tile next to the blank to slide it into the empty space.", tr: "Boşluğun yanındaki kareye dokun, oraya kaydır." },
    },
    {
      emoji: "🎯",
      title: { en: "Sort 1 to 15", tr: "1'den 15'e Sırala" },
      text: { en: "Arrange all tiles in order — 1 to 15 — with the blank in the bottom right.", tr: "Tüm kareleri sırayla 1-15 diziliminde, boşluk sağ altta olacak şekilde yerleştir." },
    },
    {
      emoji: "⭐",
      title: { en: "Fewer Moves = More Stars", tr: "Az Hamle = Çok Yıldız" },
      text: { en: "Beat the par move count to earn 3 stars!", tr: "Par hamle sayısını geçersen 3 yıldız!" },
    },
  ];

  function lang() {
    const l = (document.documentElement.lang || "en").slice(0, 2);
    return (l === "tr") ? "tr" : "en";
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `
      .game-puzzle15 {
        display: flex;
        flex-direction: column;
        min-height: 0;
        flex: 1;
        padding: 14px;
        box-sizing: border-box;
      }
      .p15-wrap {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
      }
      .p15-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
        flex-shrink: 0;
      }
      .p15-bar-label {
        font-size: 16px;
        font-weight: 800;
        color: var(--accent-deep);
      }
      .p15-move-count {
        font-size: 14px;
        font-weight: 700;
        color: var(--muted);
        text-align: center;
        flex: 1;
      }
      .p15-board {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 4px;
        border-radius: 16px;
        padding: 10px;
        background: var(--panel);
        width: 100%;
        height: 100%;
        box-sizing: border-box;
      }
      .p15-tile {
        border-radius: 12px;
        background: var(--accent-soft);
        color: var(--accent-deep);
        font-size: clamp(14px, 5vw, 22px);
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        user-select: none;
        aspect-ratio: 1;
        position: relative;
        z-index: 1;
        will-change: transform;
        box-shadow: 0 2px 5px rgba(60,45,20,.12);
      }
      .p15-tile:not(.blank):hover {
        box-shadow: 0 3px 8px rgba(60,45,20,.20);
      }
      .p15-tile.blank {
        background: rgba(0,0,0,0.06);
        cursor: default;
        box-shadow: none;
      }
      .p15-overlay {
        position: absolute;
        inset: 0;
        z-index: 10;
        background: rgba(0,0,0,0.55);
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: inherit;
      }
      .p15-overlay-card {
        background: var(--bg);
        border-radius: 20px;
        padding: 28px 24px 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        min-width: 240px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      }
      .p15-overlay-card h3 {
        font-size: 22px;
        font-weight: 800;
        color: var(--ink);
        margin: 0;
        text-align: center;
      }
      .p15-overlay-card p {
        font-size: 14px;
        color: var(--muted);
        margin: 0;
        text-align: center;
      }
      .p15-overlay-card .arcade-result-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: center;
      }
    `;
    document.head.appendChild(s);
  }

  // ---- Board generation ----
  function getNeighbors(idx) {
    const row = Math.floor(idx / 4), col = idx % 4;
    const result = [];
    if (row > 0) result.push(idx - 4);
    if (row < 3) result.push(idx + 4);
    if (col > 0) result.push(idx - 1);
    if (col < 3) result.push(idx + 1);
    return result;
  }

  function generateBoardWithSolvePath(depth) {
    let tiles = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,0];
    let blankIdx = 15;
    let lastMoved = -1;
    const blankPositions = []; // blank position BEFORE each move

    for (let i = 0; i < depth; i++) {
      const neighbors = getNeighbors(blankIdx).filter(n => n !== lastMoved);
      const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
      blankPositions.push(blankIdx); // blank was here before this move
      tiles[blankIdx] = tiles[pick];
      tiles[pick] = 0;
      lastMoved = blankIdx;
      blankIdx = pick;
    }

    // To undo: for each shuffle step in reverse, click the old blank position
    // (that's where a tile ended up when the blank moved away from there)
    const solvePath = [...blankPositions].reverse();

    return { tiles, solvePath };
  }

  function calcStars(moves, lvl) {
    if (moves <= PAR[lvl]) return 3;
    if (moves <= Math.floor(PAR[lvl] * 1.5)) return 2;
    return 1;
  }

  // ---- Module state ----
  let view = "select"; // "select" | "play"
  let level = 0;
  let tiles = [];       // array of 16 numbers, 0=blank
  let blankIdx = 15;
  let moveCount = 0;
  let api = null;
  let root = null;
  let _keyHandler = null;
  let _resizeHandler = null;
  let _styleEl = null;
  let _solvePath = null;
  let tileEls = [];     // array of 16 div elements by grid position
  let sliding = false;  // debounce lock during animation

  // Pointer/swipe state
  let pointerStart = null;

  // ---- DOM helpers ----
  function getMoveCounterEl() {
    return root ? root.querySelector(".p15-move-count") : null;
  }

  function updateMoveCounter() {
    const el = getMoveCounterEl();
    if (el) el.textContent = "Moves: " + moveCount;
  }

  // ---- Board rendering ----
  function renderBoard() {
    const board = root ? root.querySelector(".p15-board") : null;
    if (!board) return;
    board.innerHTML = "";
    tileEls = [];
    for (let i = 0; i < 16; i++) {
      const div = document.createElement("div");
      div.className = "p15-tile" + (tiles[i] === 0 ? " blank" : "");
      div.textContent = tiles[i] === 0 ? "" : String(tiles[i]);
      if (tiles[i] !== 0) {
        div.addEventListener("pointerdown", function (e) { handleTileClick(i, e); });
        div.addEventListener("click", function (e) { handleTileClick(i, e); });
      }
      board.appendChild(div);
      tileEls.push(div);
    }
  }

  function handleTileClick(idx) {
    if (view !== "play") return;
    if (!getNeighbors(blankIdx).includes(idx)) return;
    doSlide(idx);
  }

  function doSlide(idx) {
    if (sliding) return;
    if (view !== "play") return;
    const tileEl = tileEls[idx];
    if (!tileEl || tileEl.classList.contains("blank")) return;
    if (!getNeighbors(blankIdx).includes(idx)) return;

    const blankEl = tileEls[blankIdx];
    if (!blankEl) return;

    const tileRect = tileEl.getBoundingClientRect();
    const blankRect = blankEl.getBoundingClientRect();
    const dx = blankRect.left - tileRect.left;
    const dy = blankRect.top - tileRect.top;

    sliding = true;

    tileEl.style.transition = "transform " + SLIDE_MS + "ms ease";
    tileEl.style.transform = "translate(" + dx + "px," + dy + "px)";
    tileEl.style.zIndex = "5";

    moveCount++;
    updateMoveCounter();

    setTimeout(function () {
      // Swap state
      tiles[blankIdx] = tiles[idx];
      tiles[idx] = 0;
      blankIdx = idx;
      renderBoard();
      sliding = false;
      checkWin();
    }, SLIDE_MS);
  }

  // ---- Keyboard ----
  function handleKey(e) {
    if (view !== "play") return;
    // Arrow key: direction the BLANK moves = direction the tile opposite moves INTO blank
    const moveMap = {
      ArrowUp: blankIdx + 4,    // blank moves up: tile BELOW blank slides up
      ArrowDown: blankIdx - 4,  // blank moves down: tile ABOVE blank slides down
      ArrowLeft: blankIdx + 1,  // blank moves left: tile RIGHT of blank slides left
      ArrowRight: blankIdx - 1, // blank moves right: tile LEFT of blank slides right
    };
    const tileToMove = moveMap[e.key];
    if (tileToMove === undefined) return;
    if (tileToMove < 0 || tileToMove > 15) return;
    if (!getNeighbors(blankIdx).includes(tileToMove)) return;
    e.preventDefault();
    doSlide(tileToMove);
  }

  // ---- Swipe ----
  function handleBoardPointerDown(e) {
    pointerStart = { x: e.clientX, y: e.clientY };
  }

  function handleBoardPointerUp(e) {
    if (!pointerStart) return;
    const dx = e.clientX - pointerStart.x;
    const dy = e.clientY - pointerStart.y;
    pointerStart = null;

    const absDx = Math.abs(dx), absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) < 20) return; // too small, treat as tap

    let tileToMove;
    if (absDx > absDy) {
      // horizontal swipe: swipe right = blank moves right = tile LEFT of blank slides right
      tileToMove = dx > 0 ? blankIdx - 1 : blankIdx + 1;
    } else {
      // vertical swipe: swipe down = blank moves down = tile ABOVE blank slides down
      tileToMove = dy > 0 ? blankIdx - 4 : blankIdx + 4;
    }

    if (tileToMove < 0 || tileToMove > 15) return;
    if (!getNeighbors(blankIdx).includes(tileToMove)) return;
    doSlide(tileToMove);
  }

  // ---- Win check ----
  function checkWin() {
    const solved = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,0];
    if (tiles.every(function (v, i) { return v === solved[i]; })) {
      onWin();
    }
  }

  function onWin() {
    const stars = calcStars(moveCount, level);
    ArcadeUI.recordResult("puzzle15", TOTAL_LEVELS, level, stars);
    if (api) {
      api.vibrate([20, 40, 20]);
      if (api.soundOn && api.soundOn()) {
        api.tone(523, 0.12, "triangle");
        setTimeout(function () { api.tone(659, 0.12, "triangle"); }, 140);
        setTimeout(function () { api.tone(784, 0.18, "triangle"); }, 280);
      }
    }
    showResultOverlay(stars);
  }

  function showResultOverlay(stars) {
    const boardArea = root ? root.querySelector(".arcade-board-area") : null;
    if (!boardArea) return;

    const ov = document.createElement("div");
    ov.className = "p15-overlay";

    const card = document.createElement("div");
    card.className = "p15-overlay-card";

    const h = document.createElement("h3");
    h.textContent = ArcadeUI.t("level_complete");

    const starRow = document.createElement("div");
    ArcadeUI.renderStars(starRow, stars, { api: api });

    const pMoves = document.createElement("p");
    pMoves.textContent = "Moves: " + moveCount + " (par: " + PAR[level] + ")";

    const actions = document.createElement("div");
    actions.className = "arcade-result-actions";

    const retryBtn = document.createElement("button");
    retryBtn.className = "arcade-btn";
    retryBtn.textContent = ArcadeUI.t("retry");
    retryBtn.addEventListener("click", function () {
      if (api && api.playClick) api.playClick();
      startLevel(level);
    });
    actions.appendChild(retryBtn);

    if (level < TOTAL_LEVELS - 1) {
      const nextBtn = document.createElement("button");
      nextBtn.className = "arcade-btn primary";
      nextBtn.textContent = ArcadeUI.t("next_level");
      nextBtn.addEventListener("click", function () {
        if (api && api.playClick) api.playClick();
        startLevel(level + 1);
      });
      actions.appendChild(nextBtn);
    }

    const levelsBtn = document.createElement("button");
    levelsBtn.className = "arcade-btn";
    levelsBtn.textContent = ArcadeUI.t("levels");
    levelsBtn.addEventListener("click", function () {
      if (api && api.playClick) api.playClick();
      showLevelSelect();
    });
    actions.appendChild(levelsBtn);

    card.appendChild(h);
    card.appendChild(starRow);
    card.appendChild(pMoves);
    card.appendChild(actions);
    ov.appendChild(card);
    boardArea.appendChild(ov);
  }

  // ---- Level select ----
  function showLevelSelect() {
    view = "select";
    sliding = false;
    if (!root) return;
    root.innerHTML = "";

    const steps = tutSteps.map(function (s) {
      const l = lang();
      return {
        emoji: s.emoji,
        title: s.title[l] || s.title.en,
        text: s.text[l] || s.text.en,
      };
    });

    ArcadeUI.showFirstRunTutorial(root, "puzzle15", steps, api, function () {
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

      const progress = ArcadeUI.loadProgress("puzzle15", TOTAL_LEVELS);
      ArcadeUI.renderLevelGrid(gridHost, {
        total: TOTAL_LEVELS,
        progress: progress,
        onSelect: function (i) {
          if (api && api.playClick) api.playClick();
          startLevel(i);
        },
      });

      if (api && api.setScore) api.setScore("");
    });
  }

  // ---- Play view ----
  function startLevel(i) {
    level = Math.max(0, Math.min(i, TOTAL_LEVELS - 1));
    view = "play";
    buildPlayUI();
    newGame();
  }

  function buildPlayUI() {
    if (!root) return;
    root.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "p15-wrap";

    const bar = document.createElement("div");
    bar.className = "p15-bar";

    const levelLabel = document.createElement("div");
    levelLabel.className = "p15-bar-label";
    levelLabel.textContent = ArcadeUI.t("level_n", { n: level + 1 });

    const moveEl = document.createElement("div");
    moveEl.className = "p15-move-count p15-moves";
    moveEl.textContent = "Moves: 0";

    const levelsBtn = document.createElement("button");
    levelsBtn.className = "arcade-levels-btn";
    levelsBtn.textContent = ArcadeUI.t("levels");
    levelsBtn.addEventListener("click", function () {
      if (api && api.playClick) api.playClick();
      showLevelSelect();
    });

    bar.appendChild(levelLabel);
    bar.appendChild(moveEl);
    bar.appendChild(levelsBtn);

    const boardArea = document.createElement("div");
    boardArea.className = "arcade-board-area";
    boardArea.style.position = "relative";

    const board = document.createElement("div");
    board.className = "p15-board";
    board.addEventListener("pointerdown", handleBoardPointerDown);
    board.addEventListener("pointerup", handleBoardPointerUp);
    board.addEventListener("pointercancel", function () { pointerStart = null; });

    boardArea.appendChild(board);
    wrap.appendChild(bar);
    wrap.appendChild(boardArea);
    root.appendChild(wrap);

    ArcadeUI.fitSquare(boardArea, board);
  }

  function newGame() {
    moveCount = 0;
    sliding = false;
    pointerStart = null;
    updateMoveCounter();

    const result = generateBoardWithSolvePath(SHUFFLE_DEPTH[level]);
    tiles = result.tiles;
    _solvePath = result.solvePath;

    // Find blankIdx
    blankIdx = tiles.indexOf(0);

    // Expose debug path for testing
    // getSolvePath() resets to a fresh board so the path is guaranteed to match current state
    window._p15Debug = {
      getSolvePath: function () {
        newGame();
        return _solvePath ? _solvePath.slice() : null;
      },
    };

    renderBoard();

    // Fit after render
    const boardArea = root ? root.querySelector(".arcade-board-area") : null;
    const board = root ? root.querySelector(".p15-board") : null;
    if (boardArea && board) ArcadeUI.fitSquare(boardArea, board);
  }

  // ---- Game registration ----
  window.ARCADE_GAMES.push({
    id: "puzzle15",
    emoji: "🔢",
    nameKey: "game_puzzle15_name",
    descKey: "game_puzzle15_desc",
    accent: "#3a8ee0",

    mount: function (root_, api_) {
      root = root_;
      api = api_;
      injectStyle();

      _keyHandler = function (e) { handleKey(e); };
      document.addEventListener("keydown", _keyHandler);

      _resizeHandler = function () {
        if (view === "play") {
          const boardArea = root ? root.querySelector(".arcade-board-area") : null;
          const board = root ? root.querySelector(".p15-board") : null;
          if (boardArea && board) ArcadeUI.fitSquare(boardArea, board);
        }
      };
      window.addEventListener("resize", _resizeHandler);

      showLevelSelect();
    },

    unmount: function () {
      if (_keyHandler) document.removeEventListener("keydown", _keyHandler);
      if (_resizeHandler) window.removeEventListener("resize", _resizeHandler);
      _keyHandler = null;
      _resizeHandler = null;
      root = null;
      api = null;
      view = "select";
      tiles = [];
      tileEls = [];
      blankIdx = 15;
      moveCount = 0;
      sliding = false;
      pointerStart = null;
      _solvePath = null;
      window._p15Debug = null;
    },
  });
})();
