// Shared helpers for mini-game level systems: per-game progress storage,
// Knot-Escape-style level-select grids, star rows, and board sizing.
// Loaded before the individual game modules; exposes window.ArcadeUI.
window.ArcadeUI = (function () {
  const PREFIX = "knot-arcade-progress-";

  const STR = {
    en: {
      select_level: "Select Level",
      tap_to_play: "Tap a level to play",
      level_n: "Level {n}",
      next_level: "Next Level",
      retry: "Retry",
      levels: "Levels",
      level_complete: "Level Complete!",
      level_failed: "Try Again",
      moves_left: "Moves left",
    },
    tr: {
      select_level: "Seviye Seç",
      tap_to_play: "Oynamak için bir seviye seç",
      level_n: "Seviye {n}",
      next_level: "Sonraki Seviye",
      retry: "Tekrar Dene",
      levels: "Seviyeler",
      level_complete: "Seviye Tamamlandı!",
      level_failed: "Tekrar Dene",
      moves_left: "Kalan hamle",
    },
  };

  function lang() {
    const l = (document.documentElement.lang || "en").slice(0, 2);
    return STR[l] ? l : "en";
  }

  function t(key, vars) {
    let s = (STR[lang()] || STR.en)[key] || STR.en[key] || key;
    if (vars) {
      for (const k in vars) s = s.replace("{" + k + "}", vars[k]);
    }
    return s;
  }

  // ---- Progress persistence: { stars: number[total] (0-3), unlocked: index } ----
  function loadProgress(id, total) {
    const stars = new Array(total).fill(0);
    let unlocked = 0;
    try {
      const raw = JSON.parse(localStorage.getItem(PREFIX + id));
      if (raw && Array.isArray(raw.stars)) {
        for (let i = 0; i < total && i < raw.stars.length; i++) stars[i] = raw.stars[i] | 0;
      }
      if (raw && typeof raw.unlocked === "number") unlocked = raw.unlocked | 0;
    } catch (e) {
      // ignore malformed storage
    }
    unlocked = Math.max(0, Math.min(unlocked, total - 1));
    return { stars, unlocked };
  }

  function saveProgress(id, progress) {
    try {
      localStorage.setItem(PREFIX + id, JSON.stringify(progress));
    } catch (e) {
      // ignore storage errors (e.g. private mode)
    }
  }

  // Records the star result for a level, unlocking the next one if passed.
  // Returns the updated progress object.
  function recordResult(id, total, levelIndex, stars) {
    const progress = loadProgress(id, total);
    if (stars > progress.stars[levelIndex]) progress.stars[levelIndex] = stars;
    if (stars > 0) progress.unlocked = Math.max(progress.unlocked, Math.min(levelIndex + 1, total - 1));
    saveProgress(id, progress);
    return progress;
  }

  // ---- Level-select grid (mirrors Knot Escape's .level-grid / .level-cell) ----
  function renderLevelGrid(container, opts) {
    const total = opts.total;
    const progress = opts.progress;
    container.innerHTML = "";
    const grid = document.createElement("div");
    grid.className = "level-grid";
    for (let i = 0; i < total; i++) {
      const cell = document.createElement("button");
      cell.className = "level-cell";
      const unlocked = i <= progress.unlocked;
      if (progress.stars[i] > 0) cell.classList.add("done");
      else if (i === progress.unlocked) cell.classList.add("current");
      if (!unlocked) cell.classList.add("locked");
      cell.disabled = !unlocked;
      if (unlocked && opts.onSelect) {
        cell.addEventListener("click", () => opts.onSelect(i));
      }

      const num = document.createElement("span");
      num.className = "cell-num";
      num.textContent = String(i + 1);
      cell.appendChild(num);

      if (progress.stars[i] > 0) {
        const starRow = document.createElement("span");
        starRow.className = "cell-stars";
        for (let s = 0; s < 3; s++) {
          const star = document.createElement("span");
          star.className = "star" + (s < progress.stars[i] ? " filled" : "");
          star.textContent = "★";
          starRow.appendChild(star);
        }
        cell.appendChild(starRow);
      }

      grid.appendChild(cell);
    }
    container.appendChild(grid);
  }

  // ---- Star row (mirrors the win-overlay's .star-row / .star.filled) ----
  // opts: { animate (default true), api } — when animating, earned stars pop in
  // one-by-one and (if api+sound) each fires an ascending chime in sync.
  const STAR_NOTES = [523.25, 659.25, 783.99]; // C5 - E5 - G5 (bright major triad)
  function renderStars(container, earned, opts) {
    opts = opts || {};
    const animate = opts.animate !== false;
    const api = opts.api;
    container.innerHTML = "";
    container.classList.add("star-row");
    container.classList.toggle("animate", animate);
    const base = 0.12, step = 0.2;
    for (let s = 0; s < 3; s++) {
      const star = document.createElement("span");
      star.className = "star" + (s < earned ? " filled" : "");
      star.textContent = "★";
      if (animate && s < earned) {
        const delay = base + s * step;
        star.style.animationDelay = delay + "s";
        if (api && api.tone && api.soundOn && api.soundOn()) {
          setTimeout(() => api.tone(STAR_NOTES[s] || 784, 0.22, "triangle"), (delay + 0.04) * 1000);
        }
      }
      container.appendChild(star);
    }
  }

  // ---- Board sizing: make the board fill the available area, not just a fixed max-width ----
  // Sizes `el` to the largest square that fits inside `container`.
  function fitSquare(container, el, maxPx) {
    if (!container || !el) return 0;
    let size = Math.floor(Math.min(container.clientWidth, container.clientHeight));
    if (maxPx) size = Math.min(size, maxPx);
    size = Math.max(size, 0);
    el.style.width = size + "px";
    el.style.height = size + "px";
    return size;
  }

  // Sizes `el` to the largest cols x rows grid of square cells (with `gap` px
  // between them) that fits inside `container`. Returns the cell size in px.
  function fitGrid(container, el, cols, rows, gap) {
    if (!container || !el) return 0;
    gap = gap || 0;
    const w = container.clientWidth;
    const h = container.clientHeight;
    const cell = Math.max(0, Math.floor(Math.min((w - gap * (cols - 1)) / cols, (h - gap * (rows - 1)) / rows)));
    el.style.width = cell * cols + gap * (cols - 1) + "px";
    el.style.height = cell * rows + gap * (rows - 1) + "px";
    return cell;
  }

  return { t, loadProgress, saveProgress, recordResult, renderLevelGrid, renderStars, fitSquare, fitGrid };
})();
