const fs = require("fs");
const path = require("path");

const root = process.cwd();
const sourceDist = path.join(root, "dist/assets/images");
const targetAssets = path.join(root, "assets/images");
const imageExt = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const wechatPattern = /webwxgetmsgimg/i;

function isImage(fileName) {
  return imageExt.has(path.extname(fileName).toLowerCase());
}

function copyTree(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`Source not found: ${src}`);
    process.exit(1);
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    if (entry === ".DS_Store") continue;
    const from = path.join(src, entry);
    const to = path.join(dest, entry);
    const stat = fs.statSync(from);
    if (stat.isDirectory()) {
      copyTree(from, to);
    } else if (isImage(entry)) {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
    }
  }
}

function nextIndexForDir(dir, folderName) {
  const pattern = new RegExp(`^${folderName}_(\\d+)\\.`, "i");
  let max = 0;
  for (const file of fs.readdirSync(dir)) {
    const match = file.match(pattern);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max;
}

function renameWechatFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      renameWechatFiles(path.join(dir, entry.name));
    }
  }

  const folderName = path.basename(dir);
  const wechatFiles = fs
    .readdirSync(dir)
    .filter((f) => isImage(f) && wechatPattern.test(f))
    .sort();

  if (wechatFiles.length === 0) return;

  let index = nextIndexForDir(dir, folderName);
  for (const fileName of wechatFiles) {
    index += 1;
    const ext = path.extname(fileName).toLowerCase();
    const normalizedExt = ext === ".jpg" ? ".jpeg" : ext || ".jpeg";
    const targetName = `${folderName}_${index}${normalizedExt}`;
    const from = path.join(dir, fileName);
    const to = path.join(dir, targetName);
    if (from !== to) {
      fs.renameSync(from, to);
      console.log(`renamed: ${path.relative(root, from)} -> ${path.relative(root, to)}`);
    }
  }
}

copyTree(sourceDist, targetAssets);
renameWechatFiles(targetAssets);
console.log("Done. Images are under assets/images/");
