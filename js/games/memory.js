// Memory Match — flip cards to find all the pairs. Self-contained arcade
// module; see js/arcade.js for the host contract.
(function () {
  window.ARCADE_GAMES = window.ARCADE_GAMES || [];
  const FACES = ["🪢", "⭐", "🎈", "🍀", "🌙", "🔔", "🎲", "🍎", "🌸", "⚡", "🐢", "🎵"];

  const STYLE_ID = "memory-game-style";
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `
      .game-memory { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:18px; padding:18px; }
      .mem-grid { display:grid; gap:10px; width:100%; max-width:360px; }
      .mem-card { aspect-ratio:1; border:none; border-radius:16px; background:var(--panel);
        font-size:30px; line-height:1; display:flex; align-items:center; justify-content:center;
        cursor:pointer; position:relative; transform-style:preserve-3d; transition:transform .28s var(--ease-spring);
        box-shadow:0 4px 12px rgba(60,45,20,.08); }
      .mem-card .mem-face { transition:opacity .12s ease; }
      .mem-card:not(.flipped):not(.matched) .mem-face { opacity:0; }
      .mem-card:not(.flipped):not(.matched)::after { content:"❓"; position:absolute; font-size:24px; opacity:.35; }
      .mem-card.flipped, .mem-card.matched { background:var(--accent-soft); }
      .mem-card.matched { opacity:.55; transform:scale(.94); }
      .mem-card:active { transform:scale(.92); }
      .mem-win { display:flex; flex-direction:column; align-items:center; gap:14px; text-align:center; }
      .mem-win h3 { color:var(--accent-deep); font-size:22px; }
      .mem-win p { color:var(--muted); font-size:15px; }
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
  let timer = null;
  let startTime = 0;
  let moves = 0;
  let matched = 0;
  let busy = false;
  let first = null;
  let root = null;

  function updateHeader() {
    const secs = Math.floor((Date.now() - startTime) / 1000);
    const mm = String(Math.floor(secs / 60)).padStart(1, "0");
    const ss = String(secs % 60).padStart(2, "0");
    api.setScore(`${api.t("moves_label")}: ${moves} • ${mm}:${ss}`);
  }

  function newGame() {
    moves = 0;
    matched = 0;
    busy = false;
    first = null;
    startTime = Date.now();
    if (timer) clearInterval(timer);
    timer = setInterval(updateHeader, 1000);
    updateHeader();

    const pairs = 8;
    const faces = shuffle(FACES.slice()).slice(0, pairs);
    const deck = shuffle(faces.concat(faces));

    root.innerHTML = "";
    const grid = document.createElement("div");
    grid.className = "mem-grid";
    grid.style.gridTemplateColumns = "repeat(4, 1fr)";

    deck.forEach((face) => {
      const card = document.createElement("button");
      card.className = "mem-card";
      card.innerHTML = `<span class="mem-face">${face}</span>`;
      card.dataset.face = face;
      card.addEventListener("click", () => onFlip(card));
      grid.appendChild(card);
    });
    root.appendChild(grid);
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
      if (matched === 8) win();
    } else {
      busy = true;
      const a = first;
      const b = card;
      first = null;
      setTimeout(() => {
        a.classList.remove("flipped");
        b.classList.remove("flipped");
        busy = false;
      }, 720);
    }
  }

  function win() {
    if (timer) clearInterval(timer);
    api.vibrate([20, 40, 20]);
    if (api.soundOn()) {
      api.tone(660, 0.12);
      setTimeout(() => api.tone(880, 0.18), 110);
    }
    const secs = Math.floor((Date.now() - startTime) / 1000);
    // Higher is better: reward few moves and quick solves.
    const score = Math.max(50, 1200 - moves * 25 - secs * 6);
    const best = api.saveBest(score);

    setTimeout(() => {
      root.innerHTML = "";
      const box = document.createElement("div");
      box.className = "mem-win";
      box.innerHTML = `
        <h3>${api.t("you_win")}</h3>
        <p>${api.t("score_label")}: ${score} • ${api.t("best_score", { score: best })}</p>
      `;
      const again = document.createElement("button");
      again.className = "play-btn";
      again.textContent = api.t("new_game");
      again.addEventListener("click", () => {
        api.playClick();
        newGame();
      });
      box.appendChild(again);
      root.appendChild(box);
    }, 700);
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
      newGame();
    },
    unmount() {
      if (timer) clearInterval(timer);
      timer = null;
    },
  });
})();
