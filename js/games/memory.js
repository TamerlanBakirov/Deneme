// Memory Match — flip cards to find all the pairs. Self-contained arcade
// module; see js/arcade.js for the host contract.
(function () {
  window.ARCADE_GAMES = window.ARCADE_GAMES || [];
  const FACES = ["🪢", "⭐", "🎈", "🍀", "🌙", "🔔", "🎲", "🍎", "🌸", "⚡", "🐢", "🎵"];

  const STRINGS = {
    en: { get_ready: "Get ready!", memorize: "Memorize the cards…" },
    tr: { get_ready: "Hazır ol!", memorize: "Kartları ezberle…" },
  };
  function tt(key) {
    const lang = (document.documentElement.lang || "en").slice(0, 2);
    const dict = STRINGS[lang] || STRINGS.en;
    return dict[key] || STRINGS.en[key] || key;
  }

  const STYLE_ID = "memory-game-style";
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `
      .game-memory { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:18px; padding:18px; }
      .mem-hint { color:var(--muted); font-size:14px; min-height:18px; text-align:center; transition:opacity .3s ease; }
      .mem-grid { display:grid; gap:10px; width:100%; max-width:360px; perspective:800px; }
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

      .mem-win { display:flex; flex-direction:column; align-items:center; gap:14px; text-align:center;
        position:relative; padding:24px; border-radius:20px; background:var(--panel);
        box-shadow:0 8px 28px rgba(0,0,0,.12); overflow:hidden; }
      .mem-win h3 { color:var(--accent-deep); font-size:22px; margin:0; }
      .mem-win p { color:var(--muted); font-size:15px; margin:0; }
      .mem-confetti { position:absolute; inset:0; pointer-events:none; overflow:hidden; border-radius:20px; }
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
  let timer = null;
  let startTime = 0;
  let moves = 0;
  let matched = 0;
  let busy = false;
  let first = null;
  let root = null;
  let timeouts = [];

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

  function updateHeader() {
    const secs = Math.floor((Date.now() - startTime) / 1000);
    const mm = String(Math.floor(secs / 60)).padStart(1, "0");
    const ss = String(secs % 60).padStart(2, "0");
    api.setScore(`${api.t("moves_label")}: ${moves} • ${mm}:${ss}`);
  }

  function newGame() {
    moves = 0;
    matched = 0;
    busy = true; // blocked during peek
    first = null;
    if (timer) clearInterval(timer);
    clearAllTimeouts();

    const pairs = 8;
    const faces = shuffle(FACES.slice()).slice(0, pairs);
    const deck = shuffle(faces.concat(faces));

    root.innerHTML = "";

    const hint = document.createElement("div");
    hint.className = "mem-hint";
    hint.textContent = tt("memorize");
    root.appendChild(hint);

    const grid = document.createElement("div");
    grid.className = "mem-grid";
    grid.style.gridTemplateColumns = "repeat(4, 1fr)";

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
      grid.appendChild(card);
    });
    root.appendChild(grid);

    // Peek: show all faces briefly, then flip down and start the clock.
    setTO(() => {
      grid.querySelectorAll(".mem-card").forEach((c) => c.classList.remove("peeking"));
      hint.style.opacity = "0";
      setTO(() => {
        if (hint.parentNode) hint.remove();
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
      if (api.soundOn()) api.tone(520, 0.08);
      if (matched === 8) win();
    } else {
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
    if (timer) clearInterval(timer);
    api.vibrate([20, 40, 20]);
    if (api.soundOn()) {
      api.tone(660, 0.12);
      setTO(() => api.tone(880, 0.18), 110);
    }
    const secs = Math.floor((Date.now() - startTime) / 1000);
    // Higher is better: reward few moves and quick solves.
    const score = Math.max(50, 1200 - moves * 25 - secs * 6);
    const best = api.saveBest(score);

    setTO(() => {
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
      spawnConfetti(box);
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
      clearAllTimeouts();
    },
  });
})();
