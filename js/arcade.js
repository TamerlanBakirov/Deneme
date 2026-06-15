// Mini-game hub ("Games" tab). Each mini-game registers itself by pushing a
// module onto window.ARCADE_GAMES; this file renders the picker grid and hosts
// the selected game full-screen, handing it a small shared API.
//
// Game module shape:
//   {
//     id: "memory",            // unique, used for the best-score storage key
//     emoji: "🧠",
//     nameKey: "game_memory_name",   // i18n key for the title
//     descKey: "game_memory_desc",   // i18n key for the one-line tagline
//     accent: "#9b6dd0",       // card accent colour
//     mount(root, api) {},     // build the game inside the empty `root` element
//     unmount() {},            // stop timers/listeners (called on exit)
//   }
//
// Convention: a game's "best" is always a number where HIGHER is better, so the
// hub can rank/format every game uniformly. Games that track a lower-is-better
// metric (moves, time) should convert it to a higher-is-better score.
window.ARCADE_GAMES = window.ARCADE_GAMES || [];

const Arcade = (() => {
  const el = {
    grid: document.getElementById("home-games-grid"),
    screen: document.getElementById("arcade-game"),
    root: document.getElementById("arcade-root"),
    title: document.getElementById("arcade-game-title"),
    score: document.getElementById("arcade-game-score"),
  };

  let active = null;

  function bestKey(id) {
    return "knot-arcade-best-" + id;
  }
  function getBest(id) {
    const raw = localStorage.getItem(bestKey(id));
    return raw === null ? null : Number(raw) || 0;
  }
  function saveBest(id, value) {
    const cur = getBest(id);
    if (cur === null || value > cur) {
      localStorage.setItem(bestKey(id), String(Math.round(value)));
      return value;
    }
    return cur;
  }

  function makeApi(game) {
    return {
      t,
      playClick,
      tone: playTone,
      vibrate,
      isDark: () => state.settings.dark,
      soundOn: () => state.settings.sound,
      best: () => getBest(game.id),
      saveBest: (value) => saveBest(game.id, value),
      setScore: (text) => {
        el.score.textContent = text;
      },
      showRewarded: () => Ads.showRewarded(),
      canReward: () => Ads.canReward(),
      close: () => closeGame(),
    };
  }

  function renderGrid() {
    el.grid.innerHTML = "";
    for (const game of window.ARCADE_GAMES) {
      const card = document.createElement("button");
      card.className = "arcade-card";
      card.style.setProperty("--card-accent", game.accent || "var(--accent)");

      const best = getBest(game.id);
      card.innerHTML = `
        <span class="arcade-card-emoji" aria-hidden="true">${game.emoji}</span>
        <span class="arcade-card-name">${t(game.nameKey)}</span>
        <span class="arcade-card-desc">${t(game.descKey)}</span>
        <span class="arcade-card-best">${
          best === null ? "" : t("best_score", { score: best })
        }</span>
      `;
      card.addEventListener("click", () => {
        playClick();
        openGame(game);
      });
      el.grid.appendChild(card);
    }
  }

  function openGame(game) {
    active = game;
    el.title.textContent = t(game.nameKey);
    el.score.textContent = "";
    el.root.innerHTML = "";
    el.root.className = "arcade-root game-" + game.id;
    document.querySelectorAll(".tab-screen").forEach((s) => s.classList.add("hidden"));
    el.screen.classList.remove("hidden");
    document.getElementById("bottom-nav").classList.add("hidden");
    try {
      game.mount(el.root, makeApi(game));
    } catch (e) {
      console.error("arcade game failed to mount", game.id, e);
    }
  }

  // Tear down the running game. When `restoreTab` is true (back button), return
  // to the home hub; when false (caller is switching tabs via showTab), just
  // clean up and let the caller pick the next screen.
  function closeGame(restoreTab = true) {
    if (active && typeof active.unmount === "function") {
      try {
        active.unmount();
      } catch (e) {
        /* ignore cleanup errors */
      }
    }
    active = null;
    el.root.innerHTML = "";
    el.screen.classList.add("hidden");
    if (restoreTab) {
      // Return to the home hub (which re-renders the game grid with fresh bests).
      if (typeof showTab === "function") showTab("home");
    }
  }

  return {
    renderGrid,
    openGame,
    closeGame,
    isOpen: () => !!active,
  };
})();
