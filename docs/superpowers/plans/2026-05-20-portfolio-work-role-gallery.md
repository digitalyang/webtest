# Portfolio Work Role Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the photography portfolio into a three-level gallery: portfolio list shows one thumbnail per work, work detail shows role thumbnails, and role detail loads JPEG originals in batches of five.

**Architecture:** `assets/images/` remains the source of original JPEG files. A thumbnail script creates `*.thumb.webp` covers at 480px width, and a manifest generator groups images as `photographyWorks -> roles -> images` based on the directory structure. The frontend uses three focused modules: `portfolio.js` for category/work cards, `portfolio-work.js` for role selection, and `portfolio-role.js` for five-at-a-time JPEG loading.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js scripts, Sharp for thumbnail generation, Vitest, Cloudflare Workers static assets from `dist/`.

---

## Requirements

The desired photography flow is:

1. `pages/portfolio.html`
   - Shows the existing categories: `摄影`, `代码`, `手绘`.
   - In `摄影`, each work only shows the first role's first thumbnail as the work cover.
   - Example: `HOK` uses `Daji_1.thumb.webp` as its work cover because `Daji` is the first role by sorted directory order.

2. `pages/portfolio-work.html?id=hok`
   - Shows the selected work.
   - Shows each role in that work.
   - Each role cover uses that role's first thumbnail.
   - Clicking a role opens its role detail page.

3. `pages/portfolio-role.html?id=hok-daji`
   - Loads original JPEG images, not thumbnails.
   - Initially loads the first 5 images.
   - `继续加载 5 张` loads the next batch.
   - When all images are loaded, hide the button and show `已加载全部图片`.

4. Thumbnail behavior
   - Generate 480px wide WebP thumbnails.
   - File name format: `Nero_1.jpeg` -> `Nero_1.thumb.webp`.
   - Portfolio and work pages use thumbnails only.
   - Role detail page uses original JPEG images only.

5. Image cleanup
   - Ignore or delete `_cgi-bin_mmwebwx-bin_webwxgetmsgimg__...` files in `assets/images/`.
   - Do not include `.thumb.webp` files in role `images`.
   - Do not include `.DS_Store`.

## File Structure

| File | Responsibility |
|---|---|
| `scripts/normalize-portfolio-images.js` | Make the image source clean and idempotent; remove duplicate微信长文件名 files after normalized names exist. |
| `scripts/generate-portfolio-thumbnails.js` | Generate 480px WebP thumbnails for normalized original images. |
| `scripts/generate-portfolio-manifest.js` | Generate `photographyWorks` manifest grouped by work and role. |
| `assets/data/portfolio.json` | Single source of truth for categories, code projects, works, roles, and images. |
| `assets/js/portfolio.js` | Render tabs; render work cards for `摄影`; render code cards and drawing empty state. |
| `assets/js/portfolio-work.js` | Render one work page and role cards. |
| `assets/js/portfolio-role.js` | Render one role page and load JPEG images in batches of five. |
| `pages/portfolio.html` | Existing portfolio entry page. |
| `pages/portfolio-work.html` | New work detail page. |
| `pages/portfolio-role.html` | New role image page. |
| `assets/css/main.css` | Shared card, thumbnail, role page, and load-more styles. |
| `tests/portfolio-manifest.test.js` | Verify manifest structure and paths. |
| `tests/portfolio-navigation.test.js` | Verify URL helpers and batch loading helpers. |
| `package.json` | Add `sharp` and generation scripts. |

## Manifest Shape

`assets/data/portfolio.json` should use this shape:

```json
{
  "categories": [
    { "id": "photography", "title": "摄影", "description": "cos、场照与日常摄影" },
    { "id": "code", "title": "代码", "description": "网站与工具项目" },
    { "id": "drawing", "title": "手绘", "description": "插画与手绘草稿" }
  ],
  "photographyWorks": [
    {
      "id": "hok",
      "category": "photography",
      "title": "HOK",
      "coverThumb": "assets/images/HOK/Daji/Daji_1.thumb.webp",
      "roleCount": 2,
      "imageCount": 7,
      "roles": [
        {
          "id": "hok-daji",
          "workId": "hok",
          "title": "Daji",
          "coverThumb": "assets/images/HOK/Daji/Daji_1.thumb.webp",
          "imageCount": 4,
          "images": [
            { "src": "assets/images/HOK/Daji/Daji_1.jpeg", "alt": "HOK Daji 1" },
            { "src": "assets/images/HOK/Daji/Daji_2.jpeg", "alt": "HOK Daji 2" }
          ]
        }
      ]
    }
  ],
  "projects": [
    {
      "category": "code",
      "title": "个人静态网站",
      "description": "多页面静态站，含留言板与访问统计。",
      "href": "../index.html"
    }
  ]
}
```

Directory mapping rules:

- `assets/images/FGO/Nero/Nero_1.jpeg` -> work `FGO`, role `Nero`.
- `assets/images/HOK/Daji/Daji_1.jpeg` -> work `HOK`, role `Daji`.
- `assets/images/Lolita/Lolita_1.jpeg` -> work `Lolita`, role `Lolita`.
- `assets/images/Miku/Miku_1.jpeg` -> work `Miku`, role `Miku`.

Sorting rules:

- Works are sorted by work directory name using `localeCompare(..., { numeric: true })`.
- Roles are sorted by role directory name.
- Images are sorted by file name using numeric sorting.
- Work cover is the first role's `coverThumb`.
- Role cover is the first image's thumbnail.

---

### Task 1: Clean Image Source And Add Thumbnail Generator

**Files:**
- Modify: `package.json`
- Modify: `scripts/normalize-portfolio-images.js`
- Create: `scripts/generate-portfolio-thumbnails.js`
- Generated: `assets/images/**/*.thumb.webp`

- [ ] **Step 1: Add Sharp dependency**

Run:

```bash
npm install sharp
```

Expected:

```text
added ... packages
```

`package.json` should include `sharp` in `dependencies`.

- [ ] **Step 2: Make `normalize-portfolio-images.js` idempotent**

Replace `scripts/normalize-portfolio-images.js` with:

```javascript
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const sourceDist = path.join(root, "dist/assets/images");
const targetAssets = path.join(root, "assets/images");
const imageExt = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const sourceExt = new Set([".jpg", ".jpeg", ".png", ".gif"]);
const wechatPattern = /webwxgetmsgimg/i;

function isImage(fileName) {
  return imageExt.has(path.extname(fileName).toLowerCase());
}

function isSourceImage(fileName) {
  return sourceExt.has(path.extname(fileName).toLowerCase()) && !fileName.includes(".thumb.");
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
    } else if (isImage(entry) && !fs.existsSync(to)) {
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

function normalizeDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) normalizeDir(fullPath);
  }

  const folderName = path.basename(dir);
  const wechatFiles = fs
    .readdirSync(dir)
    .filter((file) => isSourceImage(file) && wechatPattern.test(file))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (wechatFiles.length === 0) return;

  const hasNormalizedFiles = fs
    .readdirSync(dir)
    .some((file) => isSourceImage(file) && file.startsWith(`${folderName}_`) && !wechatPattern.test(file));

  if (hasNormalizedFiles) {
    for (const file of wechatFiles) {
      fs.rmSync(path.join(dir, file));
      console.log(`removed duplicate: ${path.relative(root, path.join(dir, file))}`);
    }
    return;
  }

  let index = nextIndexForDir(dir, folderName);
  for (const fileName of wechatFiles) {
    index += 1;
    const targetName = `${folderName}_${index}.jpeg`;
    const from = path.join(dir, fileName);
    const to = path.join(dir, targetName);
    fs.renameSync(from, to);
    console.log(`renamed: ${path.relative(root, from)} -> ${path.relative(root, to)}`);
  }
}

copyTree(sourceDist, targetAssets);
normalizeDir(targetAssets);
console.log("Done. Images are normalized under assets/images/");
```

- [ ] **Step 3: Create thumbnail generator**

Create `scripts/generate-portfolio-thumbnails.js`:

```javascript
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = process.cwd();
const imagesRoot = path.join(root, "assets/images");
const sourceExt = new Set([".jpg", ".jpeg", ".png"]);
const THUMB_WIDTH = 480;

function isSourceImage(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  return sourceExt.has(ext) && !fileName.includes(".thumb.");
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
```

- [ ] **Step 4: Update package scripts**

In `package.json`, change scripts to:

```json
"scripts": {
  "normalize:images": "node scripts/normalize-portfolio-images.js",
  "generate:portfolio-thumbs": "node scripts/generate-portfolio-thumbnails.js",
  "generate:portfolio": "node scripts/generate-portfolio-manifest.js",
  "prebuild": "npm run generate:portfolio-thumbs && npm run generate:portfolio",
  "build": "node scripts/build-static.js",
  "test": "vitest run --environment jsdom",
  "dev": "npm run build && wrangler dev",
  "deploy": "npm run build && wrangler deploy",
  "version": "npm run build && wrangler versions upload",
  "d1:migrate:local": "wrangler d1 migrations apply webtest-db --local",
  "d1:migrate:remote": "wrangler d1 migrations apply webtest-db --remote"
}
```

- [ ] **Step 5: Run cleanup and thumbnails**

Run:

```bash
npm run normalize:images
npm run generate:portfolio-thumbs
```

Expected:

```text
Done. Images are normalized under assets/images/
Generated 39 thumbnails.
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json scripts/normalize-portfolio-images.js scripts/generate-portfolio-thumbnails.js assets/images/
git commit -m "$(cat <<'EOF'
Add portfolio thumbnail generation

- Normalize uploaded portfolio image names idempotently
- Generate 480px WebP thumbnails for gallery covers
EOF
)"
```

---

### Task 2: Generate Work And Role Manifest

**Files:**
- Modify: `scripts/generate-portfolio-manifest.js`
- Modify: `assets/data/portfolio.json`
- Modify: `tests/portfolio-manifest.test.js`

- [ ] **Step 1: Write failing manifest tests**

Replace `tests/portfolio-manifest.test.js` with:

```javascript
import { describe, expect, test } from "vitest";
import fs from "fs";
import path from "path";

const manifestPath = path.join(process.cwd(), "assets/data/portfolio.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

describe("portfolio manifest", () => {
  test("groups photography into works and roles", () => {
    expect(Array.isArray(manifest.photographyWorks)).toBe(true);
    const hok = manifest.photographyWorks.find((work) => work.id === "hok");

    expect(hok.title).toBe("HOK");
    expect(hok.roles.map((role) => role.id)).toEqual(["hok-daji", "hok-haiyue"]);
    expect(hok.coverThumb).toBe(hok.roles[0].coverThumb);
  });

  test("every role image and thumbnail exists on disk", () => {
    for (const work of manifest.photographyWorks) {
      expect(fs.existsSync(path.join(process.cwd(), work.coverThumb))).toBe(true);
      for (const role of work.roles) {
        expect(fs.existsSync(path.join(process.cwd(), role.coverThumb))).toBe(true);
        for (const image of role.images) {
          expect(image.src).not.toContain(".thumb.");
          expect(fs.existsSync(path.join(process.cwd(), image.src))).toBe(true);
        }
      }
    }
  });

  test("does not include duplicate wechat file names", () => {
    const serialized = JSON.stringify(manifest);
    expect(serialized).not.toContain("webwxgetmsgimg");
    expect(serialized).not.toContain("_cgi-bin");
  });

  test("single-level folders become one-role works", () => {
    const lolita = manifest.photographyWorks.find((work) => work.id === "lolita");

    expect(lolita.roles).toHaveLength(1);
    expect(lolita.roles[0].id).toBe("lolita-lolita");
    expect(lolita.roles[0].title).toBe("Lolita");
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- tests/portfolio-manifest.test.js
```

Expected: FAIL because `manifest.photographyWorks` does not exist yet.

- [ ] **Step 3: Replace manifest generator**

Replace `scripts/generate-portfolio-manifest.js` with:

```javascript
const fs = require("fs");
const path = require("path");

const root = process.cwd();
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
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function imageToThumb(src) {
  const parsed = path.parse(src);
  return `${parsed.dir}/${parsed.name}.thumb.webp`.replaceAll(path.sep, "/");
}

function listDirectories(dir) {
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
```

- [ ] **Step 4: Generate manifest and pass tests**

Run:

```bash
npm run generate:portfolio
npm test -- tests/portfolio-manifest.test.js
```

Expected:

```text
Wrote assets/data/portfolio.json (9 works)
Test Files  1 passed (1)
Tests  4 passed (4)
```

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-portfolio-manifest.js assets/data/portfolio.json tests/portfolio-manifest.test.js
git commit -m "$(cat <<'EOF'
Generate work and role portfolio manifest

- Group photography by work and role
- Exclude duplicate source names and thumbnail files from image lists
EOF
)"
```

---

### Task 3: Portfolio List Shows Work Covers Only

**Files:**
- Modify: `assets/js/portfolio.js`
- Modify: `tests/portfolio-navigation.test.js`

- [ ] **Step 1: Create failing renderer tests**

Create `tests/portfolio-navigation.test.js`:

```javascript
import { describe, expect, test } from "vitest";

import {
  getWorkHref,
  resolveImageSrc,
  renderPhotographyWorks
} from "../assets/js/portfolio.js";

describe("portfolio navigation", () => {
  test("resolves page-relative asset paths", () => {
    expect(resolveImageSrc("assets/images/HOK/Daji/Daji_1.thumb.webp")).toBe(
      "../assets/images/HOK/Daji/Daji_1.thumb.webp"
    );
  });

  test("creates work detail links", () => {
    expect(getWorkHref("hok")).toBe("portfolio-work.html?id=hok");
  });

  test("renders only one cover image per work", () => {
    const html = renderPhotographyWorks([
      {
        id: "hok",
        title: "HOK",
        coverThumb: "assets/images/HOK/Daji/Daji_1.thumb.webp",
        roleCount: 2,
        imageCount: 7,
        roles: [
          {
            id: "hok-daji",
            coverThumb: "assets/images/HOK/Daji/Daji_1.thumb.webp",
            images: [
              { src: "assets/images/HOK/Daji/Daji_1.jpeg", alt: "HOK Daji 1" },
              { src: "assets/images/HOK/Daji/Daji_2.jpeg", alt: "HOK Daji 2" }
            ]
          }
        ]
      }
    ]);

    expect(html.match(/<img/g)).toHaveLength(1);
    expect(html).toContain("Daji_1.thumb.webp");
    expect(html).not.toContain("Daji_2.jpeg");
    expect(html).toContain("portfolio-work.html?id=hok");
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- tests/portfolio-navigation.test.js
```

Expected: FAIL because `getWorkHref` and `renderPhotographyWorks` are not exported yet.

- [ ] **Step 3: Replace portfolio renderer**

Replace `assets/js/portfolio.js` with:

```javascript
export function resolveImageSrc(src) {
  return src.startsWith("../") ? src : `../${src}`;
}

export function getWorkHref(workId) {
  return `portfolio-work.html?id=${encodeURIComponent(workId)}`;
}

function renderProjectCard(project) {
  const link = project.href ? `<p><a class="button" href="${project.href}">查看</a></p>` : "";
  return `
    <article class="card">
      <div class="card-content">
        <h2>${project.title}</h2>
        <p>${project.description}</p>
        ${link}
      </div>
    </article>`;
}

export function renderPhotographyWorks(works) {
  if (!works.length) return '<p class="muted">暂无摄影作品</p>';

  return `<div class="portfolio-grid portfolio-work-grid">${works
    .map(
      (work, index) => `
        <a class="portfolio-thumb portfolio-work-card" href="${getWorkHref(work.id)}">
          <img
            src="${resolveImageSrc(work.coverThumb)}"
            alt="${work.title} 封面"
            loading="${index === 0 ? "eager" : "lazy"}"
            width="480"
            height="360"
            ${index === 0 ? 'fetchpriority="high"' : ""}
          >
          <span class="portfolio-card-text">
            <strong>${work.title}</strong>
            <small>${work.roleCount} 个角色 / ${work.imageCount} 张图片</small>
          </span>
        </a>`
    )
    .join("")}</div>`;
}

function renderCategoryPanel(id, bodyHtml) {
  return `<div class="portfolio-panel" data-category="${id}" hidden>${bodyHtml}</div>`;
}

export async function initPortfolio(root = document) {
  const container = root.querySelector("#portfolioApp");
  if (!container) return;

  try {
    const res = await fetch("../assets/data/portfolio.json");
    if (!res.ok) throw new Error(`Failed to load portfolio manifest: ${res.status}`);
    const data = await res.json();

    const tabs = data.categories
      .map(
        (category, index) =>
          `<button type="button" class="portfolio-tab${index === 0 ? " is-active" : ""}" data-tab="${category.id}">${category.title}</button>`
      )
      .join("");

    const codeProjects = (data.projects || []).filter((project) => project.category === "code");
    const panels = data.categories
      .map((category) => {
        if (category.id === "photography") {
          return renderCategoryPanel(category.id, renderPhotographyWorks(data.photographyWorks || []));
        }
        if (category.id === "code") {
          return renderCategoryPanel(
            category.id,
            `<div class="card-grid">${codeProjects.map(renderProjectCard).join("")}</div>`
          );
        }
        if (category.id === "drawing") {
          return renderCategoryPanel(category.id, '<p class="muted">手绘作品即将上传</p>');
        }
        return renderCategoryPanel(category.id, "");
      })
      .join("");

    container.innerHTML = `<div class="portfolio-tabs">${tabs}</div>${panels}`;

    const tabButtons = container.querySelectorAll(".portfolio-tab");
    const panelNodes = container.querySelectorAll(".portfolio-panel");

    function activate(tabId) {
      tabButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.tab === tabId));
      panelNodes.forEach((panel) => {
        panel.hidden = panel.dataset.category !== tabId;
      });
    }

    tabButtons.forEach((button) => button.addEventListener("click", () => activate(button.dataset.tab)));
    activate(data.categories[0].id);
  } catch (error) {
    container.innerHTML = '<p class="muted">作品集加载失败，请稍后重试。</p>';
    console.error(error);
  }
}

if (document.querySelector("#portfolioApp")) {
  initPortfolio();
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- tests/portfolio-navigation.test.js tests/portfolio-manifest.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add assets/js/portfolio.js tests/portfolio-navigation.test.js
git commit -m "$(cat <<'EOF'
Show work covers on portfolio page

- Render one thumbnail cover per photography work
- Link each work cover to its role selection page
EOF
)"
```

---

### Task 4: Work Detail Page Shows Role Covers

**Files:**
- Create: `pages/portfolio-work.html`
- Create: `assets/js/portfolio-work.js`
- Modify: `tests/portfolio-navigation.test.js`

- [ ] **Step 1: Add failing work-page helper tests**

Append to `tests/portfolio-navigation.test.js`:

```javascript
import {
  findWorkById,
  getRoleHref,
  renderWorkRoles
} from "../assets/js/portfolio-work.js";

describe("portfolio work page", () => {
  const manifest = {
    photographyWorks: [
      {
        id: "hok",
        title: "HOK",
        roles: [
          {
            id: "hok-daji",
            title: "Daji",
            coverThumb: "assets/images/HOK/Daji/Daji_1.thumb.webp",
            imageCount: 4
          }
        ]
      }
    ]
  };

  test("finds a work by id", () => {
    expect(findWorkById(manifest, "hok").title).toBe("HOK");
    expect(findWorkById(manifest, "missing")).toBeUndefined();
  });

  test("creates role detail links", () => {
    expect(getRoleHref("hok-daji")).toBe("portfolio-role.html?id=hok-daji");
  });

  test("renders role covers only", () => {
    const html = renderWorkRoles(manifest.photographyWorks[0]);

    expect(html).toContain("Daji_1.thumb.webp");
    expect(html).toContain("portfolio-role.html?id=hok-daji");
    expect(html).toContain("4 张图片");
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- tests/portfolio-navigation.test.js
```

Expected: FAIL because `assets/js/portfolio-work.js` does not exist yet.

- [ ] **Step 3: Create work page HTML**

Create `pages/portfolio-work.html`:

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>作品详情 - 个人主页</title>
  <link rel="stylesheet" href="../assets/css/main.css">
</head>
<body>
  <main class="page">
    <nav class="navbar" aria-label="页面导航">
      <a class="logo" href="../index.html">个人主页</a>
      <div class="nav-links">
        <a href="../index.html">首页</a>
        <a href="about.html">个人简介</a>
        <a class="active" href="portfolio.html">作品集</a>
        <a href="diary.html">日记分享</a>
        <a href="messages.html">留言板</a>
        <a href="stats.html">访问统计</a>
        <a href="nailong.html">奶龙表情包</a>
        <a href="https://ys.mihoyo.com/main/" data-genshin-download>原神下载</a>
        <a href="https://github.com/digitalyang/webtest" target="_blank" rel="noopener noreferrer">GitHub</a>
      </div>
    </nav>

    <section class="hero">
      <div class="badge">Portfolio</div>
      <h1 id="workTitle">作品详情</h1>
      <p class="subtitle" id="workSubtitle">选择角色查看图片。</p>
    </section>

    <div id="portfolioWorkApp" class="portfolio-app" aria-live="polite"></div>

    <footer>
      <p><a href="portfolio.html">返回作品集</a></p>
    </footer>
  </main>
  <script type="module" src="../assets/js/portfolio-work.js"></script>
  <script src="../assets/js/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: Create work page JS**

Create `assets/js/portfolio-work.js`:

```javascript
import { resolveImageSrc } from "./portfolio.js";

export function getRoleHref(roleId) {
  return `portfolio-role.html?id=${encodeURIComponent(roleId)}`;
}

export function findWorkById(manifest, workId) {
  return (manifest.photographyWorks || []).find((work) => work.id === workId);
}

export function renderWorkRoles(work) {
  if (!work.roles.length) return '<p class="muted">这个作品暂时没有角色。</p>';

  return `<div class="portfolio-grid portfolio-role-grid">${work.roles
    .map(
      (role, index) => `
        <a class="portfolio-thumb portfolio-role-card" href="${getRoleHref(role.id)}">
          <img
            src="${resolveImageSrc(role.coverThumb)}"
            alt="${work.title} ${role.title} 封面"
            loading="${index === 0 ? "eager" : "lazy"}"
            width="480"
            height="360"
            ${index === 0 ? 'fetchpriority="high"' : ""}
          >
          <span class="portfolio-card-text">
            <strong>${role.title}</strong>
            <small>${role.imageCount} 张图片</small>
          </span>
        </a>`
    )
    .join("")}</div>`;
}

function getCurrentId() {
  return new URLSearchParams(window.location.search).get("id");
}

export async function initPortfolioWork(root = document) {
  const container = root.querySelector("#portfolioWorkApp");
  if (!container) return;

  const workId = getCurrentId();
  if (!workId) {
    container.innerHTML = '<p class="muted">没有指定作品。</p><p class="muted"><a href="portfolio.html">返回作品集</a></p>';
    return;
  }

  try {
    const res = await fetch("../assets/data/portfolio.json");
    if (!res.ok) throw new Error(`Failed to load portfolio manifest: ${res.status}`);
    const manifest = await res.json();
    const work = findWorkById(manifest, workId);

    if (!work) {
      container.innerHTML = '<p class="muted">没有找到这个作品。</p><p class="muted"><a href="portfolio.html">返回作品集</a></p>';
      return;
    }

    const title = root.querySelector("#workTitle");
    const subtitle = root.querySelector("#workSubtitle");
    if (title) title.textContent = work.title;
    if (subtitle) subtitle.textContent = `${work.roleCount} 个角色 / ${work.imageCount} 张图片`;
    container.innerHTML = renderWorkRoles(work);
  } catch (error) {
    container.innerHTML = '<p class="muted">作品加载失败，请稍后重试。</p>';
    console.error(error);
  }
}

if (document.querySelector("#portfolioWorkApp")) {
  initPortfolioWork();
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm test -- tests/portfolio-navigation.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add pages/portfolio-work.html assets/js/portfolio-work.js tests/portfolio-navigation.test.js
git commit -m "$(cat <<'EOF'
Add portfolio work role selection page

- Show one thumbnail cover per role
- Link each role cover to JPEG image detail page
EOF
)"
```

---

### Task 5: Role Detail Page Loads JPEGs In Batches Of Five

**Files:**
- Create: `pages/portfolio-role.html`
- Create: `assets/js/portfolio-role.js`
- Modify: `tests/portfolio-navigation.test.js`

- [ ] **Step 1: Add failing batch tests**

Append to `tests/portfolio-navigation.test.js`:

```javascript
import {
  getImageBatch,
  findRoleById,
  renderRoleImages
} from "../assets/js/portfolio-role.js";

describe("portfolio role page", () => {
  const images = Array.from({ length: 12 }, (_, index) => ({
    src: `assets/images/HOK/Daji/Daji_${index + 1}.jpeg`,
    alt: `HOK Daji ${index + 1}`
  }));

  const manifest = {
    photographyWorks: [
      {
        id: "hok",
        title: "HOK",
        roles: [{ id: "hok-daji", title: "Daji", images }]
      }
    ]
  };

  test("finds role with parent work", () => {
    const result = findRoleById(manifest, "hok-daji");

    expect(result.work.title).toBe("HOK");
    expect(result.role.title).toBe("Daji");
    expect(findRoleById(manifest, "missing")).toBeUndefined();
  });

  test("returns image batches of five", () => {
    expect(getImageBatch(images, 0, 5)).toHaveLength(5);
    expect(getImageBatch(images, 5, 5)[0].alt).toBe("HOK Daji 6");
    expect(getImageBatch(images, 10, 5)).toHaveLength(2);
  });

  test("renders jpeg images only", () => {
    const html = renderRoleImages(getImageBatch(images, 0, 5));

    expect(html.match(/<img/g)).toHaveLength(5);
    expect(html).toContain("Daji_1.jpeg");
    expect(html).not.toContain(".thumb.webp");
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- tests/portfolio-navigation.test.js
```

Expected: FAIL because `assets/js/portfolio-role.js` does not exist yet.

- [ ] **Step 3: Create role page HTML**

Create `pages/portfolio-role.html`:

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>角色图片 - 个人主页</title>
  <link rel="stylesheet" href="../assets/css/main.css">
</head>
<body>
  <main class="page">
    <nav class="navbar" aria-label="页面导航">
      <a class="logo" href="../index.html">个人主页</a>
      <div class="nav-links">
        <a href="../index.html">首页</a>
        <a href="about.html">个人简介</a>
        <a class="active" href="portfolio.html">作品集</a>
        <a href="diary.html">日记分享</a>
        <a href="messages.html">留言板</a>
        <a href="stats.html">访问统计</a>
        <a href="nailong.html">奶龙表情包</a>
        <a href="https://ys.mihoyo.com/main/" data-genshin-download>原神下载</a>
        <a href="https://github.com/digitalyang/webtest" target="_blank" rel="noopener noreferrer">GitHub</a>
      </div>
    </nav>

    <section class="hero">
      <div class="badge">Portfolio</div>
      <h1 id="roleTitle">角色图片</h1>
      <p class="subtitle" id="roleSubtitle">原图每次加载 5 张。</p>
    </section>

    <div id="portfolioRoleApp" class="portfolio-app" aria-live="polite"></div>

    <footer>
      <p><a id="backToWorkLink" href="portfolio.html">返回作品集</a></p>
    </footer>
  </main>
  <script type="module" src="../assets/js/portfolio-role.js"></script>
  <script src="../assets/js/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: Create role page JS**

Create `assets/js/portfolio-role.js`:

```javascript
import { resolveImageSrc } from "./portfolio.js";

const BATCH_SIZE = 5;

export function getImageBatch(images, start, size = BATCH_SIZE) {
  return images.slice(start, start + size);
}

export function findRoleById(manifest, roleId) {
  for (const work of manifest.photographyWorks || []) {
    const role = work.roles.find((candidate) => candidate.id === roleId);
    if (role) return { work, role };
  }
  return undefined;
}

export function renderRoleImages(images) {
  return images
    .map(
      (image) => `
        <a class="portfolio-thumb portfolio-original-thumb" href="${resolveImageSrc(image.src)}" target="_blank" rel="noopener noreferrer">
          <img src="${resolveImageSrc(image.src)}" alt="${image.alt}" loading="lazy" width="480" height="640">
        </a>`
    )
    .join("");
}

function getCurrentId() {
  return new URLSearchParams(window.location.search).get("id");
}

function getWorkHref(workId) {
  return `portfolio-work.html?id=${encodeURIComponent(workId)}`;
}

export async function initPortfolioRole(root = document) {
  const container = root.querySelector("#portfolioRoleApp");
  if (!container) return;

  const roleId = getCurrentId();
  if (!roleId) {
    container.innerHTML = '<p class="muted">没有指定角色。</p><p class="muted"><a href="portfolio.html">返回作品集</a></p>';
    return;
  }

  try {
    const res = await fetch("../assets/data/portfolio.json");
    if (!res.ok) throw new Error(`Failed to load portfolio manifest: ${res.status}`);
    const manifest = await res.json();
    const result = findRoleById(manifest, roleId);

    if (!result) {
      container.innerHTML = '<p class="muted">没有找到这个角色。</p><p class="muted"><a href="portfolio.html">返回作品集</a></p>';
      return;
    }

    const { work, role } = result;
    const title = root.querySelector("#roleTitle");
    const subtitle = root.querySelector("#roleSubtitle");
    const backLink = root.querySelector("#backToWorkLink");
    if (title) title.textContent = `${work.title} · ${role.title}`;
    if (subtitle) subtitle.textContent = `${role.imageCount} 张原图，每次加载 5 张。`;
    if (backLink) {
      backLink.href = getWorkHref(work.id);
      backLink.textContent = `返回 ${work.title}`;
    }

    let loaded = 0;
    container.innerHTML = `
      <div class="portfolio-grid portfolio-original-grid" id="roleImageGrid"></div>
      <div class="portfolio-load-more">
        <button class="button" type="button" id="loadMoreImages">继续加载 5 张</button>
        <p class="muted" id="loadStatus"></p>
      </div>`;

    const grid = root.querySelector("#roleImageGrid");
    const button = root.querySelector("#loadMoreImages");
    const status = root.querySelector("#loadStatus");

    function loadNextBatch() {
      const batch = getImageBatch(role.images, loaded, BATCH_SIZE);
      grid.insertAdjacentHTML("beforeend", renderRoleImages(batch));
      loaded += batch.length;

      if (loaded >= role.images.length) {
        button.hidden = true;
        status.textContent = "已加载全部图片";
      } else {
        const remaining = role.images.length - loaded;
        button.textContent = `继续加载 ${Math.min(BATCH_SIZE, remaining)} 张`;
        status.textContent = `已加载 ${loaded} / ${role.images.length} 张`;
      }
    }

    button.addEventListener("click", loadNextBatch);
    loadNextBatch();
  } catch (error) {
    container.innerHTML = '<p class="muted">角色图片加载失败，请稍后重试。</p>';
    console.error(error);
  }
}

if (document.querySelector("#portfolioRoleApp")) {
  initPortfolioRole();
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm test -- tests/portfolio-navigation.test.js tests/portfolio-manifest.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add pages/portfolio-role.html assets/js/portfolio-role.js tests/portfolio-navigation.test.js
git commit -m "$(cat <<'EOF'
Add role image page with batched JPEG loading

- Load role images five at a time
- Keep original JPEGs off list and work selection pages
EOF
)"
```

---

### Task 6: Styles, Build, And Manual Verification

**Files:**
- Modify: `assets/css/main.css`
- Generated: `dist/**`

- [ ] **Step 1: Add shared gallery styles**

Append before the existing `@media (max-width: 640px)` block in `assets/css/main.css`:

```css
.portfolio-work-grid,
.portfolio-role-grid {
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

.portfolio-work-card,
.portfolio-role-card {
  position: relative;
  min-height: 220px;
  color: var(--heading);
  text-decoration: none;
  background: var(--surface-soft);
}

.portfolio-card-text {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  gap: 4px;
  padding: 14px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0) 0%, rgba(15, 23, 42, 0.86) 100%);
}

.portfolio-card-text strong,
.portfolio-card-text small {
  color: var(--heading);
}

.portfolio-original-grid {
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

.portfolio-original-thumb {
  aspect-ratio: 3 / 4;
}

.portfolio-load-more {
  display: grid;
  justify-items: center;
  gap: 12px;
  margin-top: 28px;
}

.portfolio-load-more .button[hidden] {
  display: none;
}
```

- [ ] **Step 2: Run full tests**

Run:

```bash
npm test
```

Expected:

```text
Test Files  3 passed (3)
```

- [ ] **Step 3: Build**

Run:

```bash
npm run build
```

Expected:

```text
Generated 39 thumbnails.
Wrote assets/data/portfolio.json (9 works)
Static site built to dist
```

- [ ] **Step 4: Verify built files exist**

Run:

```bash
test -f dist/pages/portfolio-work.html
test -f dist/pages/portfolio-role.html
test -f dist/assets/images/HOK/Daji/Daji_1.thumb.webp
test -f dist/assets/data/portfolio.json
```

Expected: command exits with status `0`.

- [ ] **Step 5: Manual browser verification**

Run:

```bash
npm run dev
```

Open `http://localhost:8787/pages/portfolio.html`.

Expected:

- `摄影` tab shows works, not roles.
- `HOK` appears once, using `Daji_1.thumb.webp` as cover.
- Clicking `HOK` opens `portfolio-work.html?id=hok`.
- Work page shows `Daji` and `Haiyue` role cards.
- Clicking `Daji` opens `portfolio-role.html?id=hok-daji`.
- Role page loads original `.jpeg` files, 5 at a time.
- `继续加载 5 张` disappears after all images load.

- [ ] **Step 6: Commit**

```bash
git add assets/css/main.css dist/
git commit -m "$(cat <<'EOF'
Style portfolio work and role gallery pages

- Add cover card styles for work and role selection
- Add original image grid and load-more controls
EOF
)"
```

Note: `dist/` is ignored in this repo, so `git add dist/` may add nothing. That is expected because Cloudflare deploy builds `dist/` locally.

---

## Self-Review

**Spec coverage**

- Portfolio list shows one cover per work: Task 3.
- Work page lets user choose role: Task 4.
- Role page loads JPEG originals only: Task 5.
- Five-at-a-time image loading: Task 5.
- 480px WebP thumbnails: Task 1.
- Manifest supports work -> role -> image hierarchy: Task 2.
- Existing `摄影 / 代码 / 手绘` categories remain: Task 3.

**Placeholder scan**

No incomplete implementation steps are left. All code steps contain concrete file contents or exact snippets.

**Type consistency**

The plan uses `photographyWorks`, `roles`, `coverThumb`, `imageCount`, `roleCount`, `workId`, `id`, and `images` consistently across generator, frontend, and tests.

**Known risk**

`assets/js/portfolio-work.js` and `assets/js/portfolio-role.js` import `resolveImageSrc` from `portfolio.js`. Because `portfolio.js` currently auto-initializes only when `#portfolioApp` exists, importing it on other pages is safe.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-20-portfolio-work-role-gallery.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
