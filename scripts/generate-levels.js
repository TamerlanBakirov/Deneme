// Level generator CLI for the "Knot Escape" puzzle game.
//
// The actual placement/validation algorithm lives in js/generator.js so the
// same code can produce the daily challenge in the browser. See that file
// for an explanation of the algorithm.

const { generateLevel } = require("../js/generator.js");

const configs = [];
for (let i = 0; i < 40; i++) {
  const size = 5 + i;
  const fillTarget = Math.min(0.62 + i * 0.012, 0.96);
  const maxLen = Math.min(5 + Math.floor(i / 2), 18);
  const minLen = Math.min(2 + Math.floor(i / 3), 8);
  configs.push({ rows: size, cols: size, fillTarget, maxLen, minLen });
}

const levels = configs.map((cfg, i) =>
  generateLevel(cfg.rows, cfg.cols, cfg.fillTarget, cfg.maxLen, 0x9e3779b9 ^ (i * 2654435761), cfg.minLen)
);

process.stdout.write(JSON.stringify(levels));
