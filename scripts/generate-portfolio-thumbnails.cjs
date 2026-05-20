const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const imagesRoot = path.join(root, "public/assets/images");
const sourceExt = new Set([".jpg", ".jpeg", ".png"]);
const ignoredPattern = /webwxgetmsgimg|_cgi-bin/i;
const THUMB_WIDTH = 480;

function isSourceImage(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  return sourceExt.has(ext) && !fileName.includes(".thumb.") && !ignoredPattern.test(fileName);
}

function thumbPathFor(filePath) {
  const parsed = path.parse(filePath);
  return path.join(parsed.dir, `${parsed.name}.thumb.webp`);
}

function collectImages(dir) {
  const images = [];
  if (!fs.existsSync(dir)) {
    throw new Error(`Image directory not found: ${dir}`);
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".DS_Store") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      images.push(...collectImages(fullPath));
    } else if (isSourceImage(entry.name)) {
      images.push(fullPath);
    }
  }

  return images;
}

async function generate() {
  const images = collectImages(imagesRoot);
  for (const imagePath of images) {
    const outputPath = thumbPathFor(imagePath);
    await sharp(imagePath)
      .rotate()
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(outputPath);
    console.log(`thumbnail: ${path.relative(root, outputPath)}`);
  }
  console.log(`Generated ${images.length} thumbnails.`);
}

generate().catch((error) => {
  console.error(error);
  process.exit(1);
});
