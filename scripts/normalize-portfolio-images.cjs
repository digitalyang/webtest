const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.resolve(__dirname, "..");
const sourceDist = path.join(root, "dist/assets/images");
const targetAssets = path.join(root, "public/assets/images");
const imageExt = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const sourceExt = new Set([".jpg", ".jpeg", ".png", ".gif"]);
const wechatPattern = /webwxgetmsgimg|_cgi-bin/i;

function isImage(fileName) {
  return imageExt.has(path.extname(fileName).toLowerCase()) && !fileName.includes(".thumb.");
}

function isSourceImage(fileName) {
  return sourceExt.has(path.extname(fileName).toLowerCase()) && !fileName.includes(".thumb.");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizedPatternFor(folderName) {
  return new RegExp(`^${escapeRegExp(folderName)}_(\\d+)\\.`, "i");
}

function fileHash(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function normalizedSourceFiles(dir, folderName) {
  if (!fs.existsSync(dir)) return [];
  const pattern = normalizedPatternFor(folderName);
  return fs.readdirSync(dir).filter((file) => isSourceImage(file) && pattern.test(file) && !wechatPattern.test(file));
}

function normalizedHashes(dir, folderName) {
  return new Set(normalizedSourceFiles(dir, folderName).map((file) => fileHash(path.join(dir, file))));
}

function copyTree(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    if (entry === ".DS_Store") continue;
    const from = path.join(src, entry);
    const to = path.join(dest, entry);
    const stat = fs.statSync(from);
    if (stat.isDirectory()) {
      copyTree(from, to);
    } else if (isSourceImage(entry) && wechatPattern.test(entry)) {
      const existingHashes = normalizedHashes(dest, path.basename(dest));
      if (!existingHashes.has(fileHash(from)) && !fs.existsSync(to)) {
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.copyFileSync(from, to);
      }
    } else if (isImage(entry) && !fs.existsSync(to)) {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
    }
  }
}

function nextIndexForDir(dir, folderName) {
  const pattern = normalizedPatternFor(folderName);
  let max = 0;
  for (const file of fs.readdirSync(dir)) {
    const match = file.match(pattern);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max;
}

function normalizeDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      normalizeDir(fullPath);
    }
  }

  const folderName = path.basename(dir);
  const wechatFiles = fs
    .readdirSync(dir)
    .filter((file) => isSourceImage(file) && wechatPattern.test(file))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (wechatFiles.length === 0) return;

  let index = nextIndexForDir(dir, folderName);
  for (const fileName of wechatFiles) {
    const from = path.join(dir, fileName);
    const hash = fileHash(from);
    const duplicate = normalizedHashes(dir, folderName).has(hash);

    if (duplicate) {
      fs.rmSync(from);
      console.log(`removed duplicate: ${path.relative(root, from)}`);
      continue;
    }

    index += 1;
    const targetName = `${folderName}_${index}.jpeg`;
    const to = path.join(dir, targetName);
    fs.renameSync(from, to);
    console.log(`renamed: ${path.relative(root, from)} -> ${path.relative(root, to)}`);
  }
}

copyTree(sourceDist, targetAssets);
normalizeDir(targetAssets);
console.log("Done. Images are normalized under public/assets/images/");
