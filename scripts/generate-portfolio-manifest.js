const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const imagesRoot = path.join(root, "assets/images");
const outputPath = path.join(root, "assets/data/portfolio.json");
const sourceExt = new Set([".jpg", ".jpeg", ".png", ".gif"]);
const ignoredPattern = /webwxgetmsgimg|_cgi-bin/i;

function isSourceImage(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  return sourceExt.has(ext) && !fileName.includes(".thumb.") && !ignoredPattern.test(fileName);
}

function sortByName(a, b) {
  return a.localeCompare(b, undefined, { numeric: true });
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function imageToThumb(src) {
  const parsed = path.parse(src);
  return `${parsed.dir}/${parsed.name}.thumb.webp`.replaceAll(path.sep, "/");
}

function listDirectories(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== ".DS_Store")
    .map((entry) => entry.name)
    .sort(sortByName);
}

function listImages(dir) {
  return fs.readdirSync(dir).filter(isSourceImage).sort(sortByName);
}

function createRole(workName, roleName, relDir) {
  const fullDir = path.join(imagesRoot, relDir);
  const files = listImages(fullDir);
  if (files.length === 0) return null;

  const workId = slug(workName);
  const roleId = `${workId}-${slug(roleName)}`;
  const images = files.map((file, index) => ({
    src: `assets/images/${relDir}/${file}`,
    alt: `${workName} ${roleName} ${index + 1}`
  }));
  const coverThumb = imageToThumb(images[0].src);

  return {
    id: roleId,
    workId,
    title: roleName,
    coverThumb,
    imageCount: images.length,
    images
  };
}

function createWork(workName) {
  const workDir = path.join(imagesRoot, workName);
  const childDirs = listDirectories(workDir);
  const directImages = listImages(workDir);

  const roleNames = childDirs.length > 0 ? childDirs : directImages.length > 0 ? [workName] : [];
  const roles = roleNames
    .map((roleName) => {
      const relDir = childDirs.length > 0 ? `${workName}/${roleName}` : workName;
      return createRole(workName, roleName, relDir);
    })
    .filter(Boolean);

  if (roles.length === 0) return null;

  const imageCount = roles.reduce((sum, role) => sum + role.imageCount, 0);

  return {
    id: slug(workName),
    category: "photography",
    title: workName,
    coverThumb: roles[0].coverThumb,
    roleCount: roles.length,
    imageCount,
    roles
  };
}

const photographyWorks = listDirectories(imagesRoot).map(createWork).filter(Boolean);

const manifest = {
  categories: [
    { id: "photography", title: "摄影", description: "cos、场照与日常摄影" },
    { id: "code", title: "代码", description: "网站与工具项目" },
    { id: "drawing", title: "手绘", description: "插画与手绘草稿" }
  ],
  photographyWorks,
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
console.log(`Wrote ${path.relative(root, outputPath)} (${photographyWorks.length} works)`);
