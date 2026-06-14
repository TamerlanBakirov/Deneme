// Copy the static site into www/, the directory Capacitor packages into the
// native iOS/Android apps. The source of truth stays at the repo root so the
// GitHub Pages deploy (which serves the root) is unaffected.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const out = path.join(root, "www");

const ENTRIES = ["index.html", "css", "js", "img"];

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const entry of ENTRIES) {
  copyRecursive(path.join(root, entry), path.join(out, entry));
}
console.log(`Built www/ from: ${ENTRIES.join(", ")}`);
