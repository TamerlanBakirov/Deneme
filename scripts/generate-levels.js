// Level generator CLI for the "Knot Escape" puzzle game.
//
// The actual placement/validation algorithm lives in js/generator.js so the
// same code can produce the daily challenge in the browser. See that file
// for an explanation of the algorithm.

const { generateLevel } = require("../js/generator.js");

const configs = [];
for (let i = 0; i < 40; i++) {
  const size = Math.min(5 + Math.floor(i / 2), 14);
  const fillTarget = Math.min(0.55 + i * 0.009, 0.85);
  const maxLen = Math.min(3 + Math.floor(i / 5), 9);
  const minLen = Math.min(1 + Math.floor(i / 10), 3);
  configs.push({ rows: size, cols: size, fillTarget, maxLen, minLen });
}

const levels = configs.map((cfg, i) =>
  generateLevel(cfg.rows, cfg.cols, cfg.fillTarget, cfg.maxLen, 0x9e3779b9 ^ (i * 2654435761), cfg.minLen)
);

process.stdout.write(JSON.stringify(levels));
