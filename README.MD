# Knot Escape

A minimalist browser puzzle game.

## How to play

Each puzzle is a tangle of knotted cords. Tap a cord and it slides off the
board in the direction it points — but only if nothing is in its way. If
another cord blocks its path, the move fails and you lose a heart. Clear every
cord off the board to escape the level. You have **5 hearts** per level, no
timer, just planning. A new daily challenge puzzle is also available, with its
own scoring based on speed and hearts remaining.

## Running

It is a static site — no build step. Serve the folder and open it:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Project layout

| Path | Purpose |
| --- | --- |
| `index.html` | Splash, game, and overlay markup |
| `css/style.css` | Cream / teal / rope theme, knots, hearts |
| `js/levels.js` | 40 pre-generated levels (generated data) |
| `js/game.js` | Game state, SVG rendering, and move logic |
| `scripts/generate-levels.js` | Level generator (run with Node) |

## Regenerating levels

Levels are built in reverse-removal order so a valid solution always exists; the
generator simulates the solution and asserts solvability before emitting a
level.

```bash
node scripts/generate-levels.js > /tmp/levels.json
node -e "const l=require('/tmp/levels.json');require('fs').writeFileSync('js/levels.js','const LEVELS = '+JSON.stringify(l)+';\n')"
```
