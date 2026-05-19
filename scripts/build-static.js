const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const root = process.cwd();
const output = path.join(root, "dist");
const entries = ["index.html", "assets", "pages"];

function copyRecursive(source, target) {
  const stat = fs.statSync(source);

  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(target, entry));
    }
    return;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const entry of entries) {
  copyRecursive(path.join(root, entry), path.join(output, entry));
}

esbuild.buildSync({
  entryPoints: [path.join(root, "assets/js/messages.js")],
  outfile: path.join(output, "assets/js/messages.js"),
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2020"
});

console.log(`Static site built to ${path.relative(root, output)}`);
