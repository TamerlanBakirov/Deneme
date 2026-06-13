// Shared level-generation logic, used both by the Node CLI
// (scripts/generate-levels.js) and the browser (daily challenge).
//
// See scripts/generate-levels.js for an explanation of the algorithm:
// arrows are placed one at a time with a clear forward ray, so that
// removing them in reverse placement order is always a valid solution.

(function (root) {
  const DIRS = {
    up: { dr: -1, dc: 0 },
    down: { dr: 1, dc: 0 },
    left: { dr: 0, dc: -1 },
    right: { dr: 0, dc: 1 },
  };
  const DIR_NAMES = Object.keys(DIRS);
  const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };

  function makeRng(seed) {
    let s = seed >>> 0;
    return function rand() {
      // xorshift32
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 0xffffffff;
    };
  }

  function shuffle(arr, rand) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function onForwardRay(r, c, head, dir) {
    const { dr, dc } = DIRS[dir];
    if (dr !== 0) {
      return c === head.c && (dr < 0 ? r < head.r : r > head.r);
    }
    return r === head.r && (dc < 0 ? c < head.c : c > head.c);
  }

  // Is the ray from `head` in `dir` (to the grid edge) clear of occupied cells?
  function rayClear(head, dir, rows, cols, occupied) {
    const { dr, dc } = DIRS[dir];
    let r = head.r + dr;
    let c = head.c + dc;
    while (r >= 0 && r < rows && c >= 0 && c < cols) {
      if (occupied.has(`${r},${c}`)) return false;
      r += dr;
      c += dc;
    }
    return true;
  }

  function generateLevel(rows, cols, fillTarget, maxLen, seed) {
    const rand = makeRng(seed);
    const occupied = new Map(); // "r,c" -> arrow index
    const arrows = [];
    const totalCells = rows * cols;

    let attemptsLeft = totalCells * 60;
    while (occupied.size / totalCells < fillTarget && attemptsLeft-- > 0) {
      const hr = Math.floor(rand() * rows);
      const hc = Math.floor(rand() * cols);
      if (occupied.has(`${hr},${hc}`)) continue;
      const head = { r: hr, c: hc };

      // Pick a travel direction whose forward ray is currently clear.
      let dir = null;
      for (const d of shuffle(DIR_NAMES, rand)) {
        if (rayClear(head, d, rows, cols, occupied)) {
          dir = d;
          break;
        }
      }
      if (!dir) continue;

      // Build the body backwards from the head. First step goes opposite the
      // travel direction so the head clearly leads; later steps may turn but must
      // never land on the forward ray.
      const used = new Set([`${hr},${hc}`]);
      const body = [head]; // tail .. head order is built by unshifting
      const desiredLen = 1 + Math.floor(rand() * maxLen);

      let cur = head;
      let firstStep = true;
      while (body.length < desiredLen) {
        const dirsToTry = firstStep
          ? [OPPOSITE[dir]]
          : shuffle(DIR_NAMES, rand);
        firstStep = false;
        let moved = false;
        for (const d of dirsToTry) {
          const nr = cur.r + DIRS[d].dr;
          const nc = cur.c + DIRS[d].dc;
          const key = `${nr},${nc}`;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          if (occupied.has(key) || used.has(key)) continue;
          if (onForwardRay(nr, nc, head, dir)) continue;
          const cell = { r: nr, c: nc };
          used.add(key);
          body.unshift(cell);
          cur = cell;
          moved = true;
          break;
        }
        if (!moved) break;
      }

      const index = arrows.length;
      for (const cell of body) occupied.set(`${cell.r},${cell.c}`, index);
      arrows.push({ cells: body.map((c) => [c.r, c.c]), dir });
    }

    validate(arrows);
    return { arrows };
  }

  // Simulate the intended solution (reverse placement order) and assert each
  // arrow is removable when its turn comes.
  function validate(arrows) {
    const present = arrows.map(() => true);
    const cellOwner = new Map();
    arrows.forEach((a, i) => a.cells.forEach(([r, c]) => cellOwner.set(`${r},${c}`, i)));

    for (let i = arrows.length - 1; i >= 0; i--) {
      const a = arrows[i];
      const head = a.cells[a.cells.length - 1];
      const { dr, dc } = DIRS[a.dir];
      let r = head[0] + dr;
      let c = head[1] + dc;
      // Walk the ray far enough to leave any plausible grid.
      for (let step = 0; step < 64; step++) {
        const owner = cellOwner.get(`${r},${c}`);
        if (owner !== undefined && owner !== i && present[owner]) {
          throw new Error(`Level unsolvable: arrow ${i} blocked by ${owner}`);
        }
        r += dr;
        c += dc;
      }
      present[i] = false;
    }
  }

  const LevelGenerator = { DIRS, DIR_NAMES, OPPOSITE, makeRng, shuffle, generateLevel, validate };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = LevelGenerator;
  } else {
    root.LevelGenerator = LevelGenerator;
  }
})(typeof window !== "undefined" ? window : globalThis);
