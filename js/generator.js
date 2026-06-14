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

  // Build a fully-packed, always-solvable board by *eroding* the grid in
  // solution order. We start with every cell present and repeatedly carve off
  // one arrow whose head has a clear "exit ray" — every cell between the head
  // and the board edge (in the head's travel direction) is already carved away.
  // Such an arrow is removable at that moment, so replaying the carves in
  // reverse gives a valid puzzle. The cell with the smallest row among those
  // still present always has an unobstructed upward ray, so a removable head
  // always exists until the grid is empty — which means the board fills 100%.
  //
  // `fillTarget` is no longer needed (coverage is total) but is kept in the
  // signature for the existing callers.
  function generateLevel(rows, cols, fillTarget, maxLen, seed, minLen) {
    minLen = Math.max(1, Math.min(minLen || 1, maxLen));
    const rand = makeRng(seed);

    const present = new Set();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) present.add(`${r},${c}`);
    }

    // Is the ray from (r,c) in direction d clear of every still-present cell?
    function exitRayClear(r, c, d) {
      const { dr, dc } = DIRS[d];
      let rr = r + dr;
      let cc = c + dc;
      while (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
        if (present.has(`${rr},${cc}`)) return false;
        rr += dr;
        cc += dc;
      }
      return true;
    }

    // Find a present cell with a clear exit ray, plus that travel direction.
    // Prefer a random cell/direction for variety; fall back to the guaranteed
    // min-row-points-up choice so the loop can never stall.
    function pickHead() {
      const cells = [...present];
      for (let t = 0; t < 24; t++) {
        const k = cells[Math.floor(rand() * cells.length)];
        const ci = k.indexOf(",");
        const r = +k.slice(0, ci);
        const c = +k.slice(ci + 1);
        for (const d of shuffle(DIR_NAMES, rand)) {
          if (exitRayClear(r, c, d)) return { r, c, dir: d };
        }
      }
      let best = null;
      for (const k of present) {
        const ci = k.indexOf(",");
        const r = +k.slice(0, ci);
        if (!best || r < best.r) best = { r, c: +k.slice(ci + 1) };
      }
      return { r: best.r, c: best.c, dir: "up" };
    }

    const removalOrder = [];
    while (present.size > 0) {
      const { r, c, dir } = pickHead();
      const head = { r, c };
      const targetLen = minLen + Math.floor(Math.sqrt(rand()) * (maxLen - minLen + 1));

      // Grow the body backwards into adjacent present cells (first step leads
      // away from the head so the head clearly points forward; later steps may
      // wind, but never onto the head's own forward ray).
      const used = new Set([`${r},${c}`]);
      const body = [head];
      let cur = head;
      let stepDir = OPPOSITE[dir]; // first step leads straight away from the head
      let firstStep = true;
      while (body.length < targetLen) {
        // Prefer continuing straight (momentum) so cords run long before
        // turning, then fall back to a random turn.
        const dirsToTry = firstStep
          ? [stepDir, ...shuffle(DIR_NAMES, rand)]
          : (rand() < 0.7 ? [stepDir, ...shuffle(DIR_NAMES, rand)] : shuffle(DIR_NAMES, rand));
        firstStep = false;
        let moved = false;
        for (const d of dirsToTry) {
          const nr = cur.r + DIRS[d].dr;
          const nc = cur.c + DIRS[d].dc;
          const key = `${nr},${nc}`;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          if (!present.has(key) || used.has(key)) continue;
          if (onForwardRay(nr, nc, head, dir)) continue;
          const cell = { r: nr, c: nc };
          used.add(key);
          body.unshift(cell);
          cur = cell;
          stepDir = d;
          moved = true;
          break;
        }
        if (!moved) break;
      }

      for (const cell of body) present.delete(`${cell.r},${cell.c}`);
      removalOrder.push({ cells: body.map((cl) => [cl.r, cl.c]), dir });
    }

    // Placement order is the reverse of removal order.
    const arrows = removalOrder.reverse();
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
