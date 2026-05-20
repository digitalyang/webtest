const fs = require("fs");
const path = require("path");

const root = process.cwd();
const imagesRoot = path.join(root, "assets/images");
const outputPath = path.join(root, "assets/data/portfolio.json");
const imageExt = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);

function isImage(fileName) {
  return imageExt.has(path.extname(fileName).toLowerCase());
}

function categoryForPath(relDir) {
  if (relDir.startsWith("drawings")) return "drawing";
  return "photography";
}

function collectAlbumDirs(dir, base = "") {
  const albums = [];
  if (!fs.existsSync(dir)) return albums;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === ".DS_Store") continue;
    const relDir = base ? `${base}/${entry.name}` : entry.name;
    const fullDir = path.join(dir, entry.name);
    const images = fs.readdirSync(fullDir).filter(isImage).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const childDirs = fs
      .readdirSync(fullDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name !== ".DS_Store");

    if (images.length > 0 && childDirs.length === 0) {
      albums.push({ relDir, images });
    } else {
      albums.push(...collectAlbumDirs(fullDir, relDir));
    }
  }
  return albums;
}

function albumFromDir(relDir, files) {
  const parts = relDir.split("/");
  const character = parts[parts.length - 1];
  const franchise = parts.length > 1 ? parts[0] : character;
  const id = relDir.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const title = parts.length > 1 ? `${franchise} · ${character}` : character;

  return {
    id,
    category: categoryForPath(relDir),
    title,
    cover: `assets/images/${relDir}/${files[0]}`,
    images: files.map((f, i) => ({
      src: `assets/images/${relDir}/${f}`,
      alt: `${title} ${i + 1}`
    }))
  };
}

const albumDirs = collectAlbumDirs(imagesRoot);
const albums = albumDirs.map(({ relDir, images }) => albumFromDir(relDir, images));

const manifest = {
  categories: [
    { id: "photography", title: "摄影", description: "cos、场照与日常摄影" },
    { id: "code", title: "代码", description: "网站与工具项目" },
    { id: "drawing", title: "手绘", description: "插画与手绘草稿" }
  ],
  albums,
  projects: [
    {
      category: "code",
      title: "个人静态网站",
      description: "多页面静态站，含留言板与访问统计。",
      href: "../index.html"
    },
    {
      category: "code",
      title: "奶龙表情包页面",
      description: "纯前端随机表情包展示。",
      href: "nailong.html"
    },
    {
      category: "code",
      title: "原神下载入口",
      description: "按设备跳转官方下载地址。",
      href: "genshin.html"
    }
  ]
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${path.relative(root, outputPath)} (${albums.length} albums)`);
