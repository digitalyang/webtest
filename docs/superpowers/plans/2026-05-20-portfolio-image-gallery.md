# 作品集图片画廊 Implementation Plan

> **状态（2026-05-20）：历史实施计划，已被 Next.js Cloudflare 重构后的结构取代。**
>
> 这份计划描述的是旧静态站阶段的图片迁移和画廊实现。当前实现已经迁移：
>
> - 图片源和缩略图：`public/assets/images/**`
> - Manifest：`public/assets/data/portfolio.json`
> - 生成脚本：`scripts/normalize-portfolio-images.cjs`、`scripts/generate-portfolio-thumbnails.cjs`、`scripts/generate-portfolio-manifest.cjs`
> - 作品集页面：`app/portfolio/page.jsx`
> - 作品/角色详情：`app/portfolio/work/[workId]/page.jsx`、`app/portfolio/role/[roleId]/page.jsx`
> - 作品集逻辑：`lib/portfolio.js`、`components/portfolio/*`
>
> 下文中的 `assets/images`、`assets/data`、`assets/js`、`pages/*.html`、`dist`、`build-static.js` 均为历史路径，仅用于追溯当时的设计与迁移过程。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `dist/assets/images` 中 39 张微信导出图片迁移到 Git 可追踪的 `assets/images/`，统一重命名为 `{角色名}_{序号}.jpeg`，并在作品集页面按「摄影 / 代码 / 手绘」三大类展示；GitHub 仓库作为图片网盘。

**Architecture:** 图片源文件放在 `assets/images/`（构建时复制到 `dist/`），由 Node 脚本批量重命名；`assets/data/portfolio.json` 描述分类、相册与图片元数据；`assets/js/portfolio.js` 读取 manifest 渲染画廊；`pages/portfolio.html` 提供 Tab 切换与相册网格。当前 39 张 cos/场照全部归入「摄影」，「代码」保留现有项目卡片，「手绘」先留空占位。

**Tech Stack:** 静态 HTML/CSS/JS、Node.js 脚本、Vitest、npm build → Cloudflare Workers（`dist/` 静态资源）

---

## 现状与约束

| 项 | 说明 |
|---|---|
| 图片位置 | 目前在 `dist/assets/images/`（**39 张** `.jpeg`，均为 `_cgi-bin_mmwebwx-bin_webwxgetmsgimg__...` 长文件名） |
| `.gitignore` | `dist/` 被忽略 → **图片必须迁到 `assets/images/` 才能进 GitHub** |
| 构建 | `scripts/build-static.js` 复制 `assets/` → `dist/` |
| 作品集页 | `pages/portfolio.html` 仅有 3 张文字项目卡片，无图片画廊 |
| 空目录 | `Genshin/`、`pets/`（source 与 dist）均为空，暂不处理 |

### 完整重命名映射（按文件名排序，共 39 张）

```
FGO/Nero/Nero_1.jpeg, Nero_2.jpeg
GirlsBandCry/Nina/Nina_1..4.jpeg
HOK/Daji/Daji_1..4.jpeg
HOK/Haiyue/Haiyue_1..3.jpeg
Honkai3/Elysia/Elysia_1.jpeg
Honkai3/Sakura/Sakura_1..2.jpeg
Honkai_StarRail/Cyrene/Cyrene_1..3.jpeg
Lolita/Lolita_1..3.jpeg
MadokaMagica/Madoka/Madoka_1.jpeg
Miku/Miku_1..2.jpeg
PriPara/Aone/Aone_1..2.jpeg
PriPara/GroupPhoto/GroupPhoto_1..2.jpeg
PriPara/Kanon/Kanon_1.jpeg
PriPara/Lala/Lala_1..6.jpeg
PriPara/Pione/Pione_1..2.jpeg
PriPara/Tricolore/Tricolore_1.jpeg
```

GitHub 直链格式（可选，供外部引用）：

`https://raw.githubusercontent.com/digitalyang/webtest/main/assets/images/{path}`

站内使用相对路径：`../assets/images/FGO/Nero/Nero_1.jpeg`（从 `pages/portfolio.html` 出发）。

---

## File Structure

| 文件 | 职责 |
|---|---|
| `scripts/normalize-portfolio-images.js` | 从 dist 复制到 assets、重命名微信长文件名 |
| `scripts/generate-portfolio-manifest.js` | 扫描 `assets/images/` 生成 `portfolio.json` |
| `assets/images/**` | 图片源（Git 追踪，GitHub 网盘） |
| `assets/data/portfolio.json` | 分类 / 相册 / 图片 manifest |
| `assets/js/portfolio.js` | 画廊渲染、Tab 切换、懒加载 |
| `assets/css/main.css` | 新增 `.portfolio-*` 样式 |
| `pages/portfolio.html` | 三大类 UI 容器 |
| `tests/portfolio-manifest.test.js` | manifest 结构与路径校验 |
| `package.json` | 新增 `normalize:images`、`generate:portfolio` 脚本 |

---

### Task 1: 图片迁移与重命名脚本

**Files:**
- Create: `scripts/normalize-portfolio-images.js`
- Modify: `package.json`（scripts 段）

- [ ] **Step 1: 编写重命名脚本**

```javascript
// scripts/normalize-portfolio-images.js
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

function renameWechatFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      renameWechatFiles(full);
      continue;
    }
    if (!isImage(entry.name) || !wechatPattern.test(entry.name)) continue;

    const folderName = path.basename(dir);
    const existing = fs
      .readdirSync(dir)
      .filter((f) => isImage(f) && !wechatPattern.test(f))
      .map((f) => parseInt(f.match(/_(\d+)\./)?.[1] || "0", 10));
    const nextIndex =
      (existing.length > 0 ? Math.max(...existing) : 0) +
      fs.readdirSync(dir).filter((f) => isImage(f) && wechatPattern.test(f)).indexOf(entry.name) +
      1;

    const ext = path.extname(entry.name).toLowerCase() || ".jpeg";
    const targetName = `${folderName}_${nextIndex}${ext === ".jpg" ? ".jpeg" : ext}`;
    const targetPath = path.join(dir, targetName);
    if (full !== targetPath) {
      fs.renameSync(full, targetPath);
      console.log(`renamed: ${path.relative(root, full)} -> ${path.relative(root, targetPath)}`);
    }
  }
}

// 1) dist -> assets 复制（保留目录结构）
copyTree(sourceDist, targetAssets);
// 2) 每个含微信文件名的目录内重命名
renameWechatFiles(targetAssets);
console.log("Done. Images are under assets/images/");
```

- [ ] **Step 2: 在 package.json 注册脚本**

```json
"normalize:images": "node scripts/normalize-portfolio-images.js"
```

- [ ] **Step 3: 运行脚本**

```bash
npm run normalize:images
```

Expected: 控制台输出 39 条 `renamed:` 日志；`assets/images/FGO/Nero/Nero_1.jpeg` 等文件存在；`dist/assets/images` 中长文件名文件仍在（dist 可随后 `npm run build` 覆盖）。

- [ ] **Step 4: 删除 dist 中重复脏数据（可选清理）**

```bash
rm -rf dist/assets/images
npm run build
```

Expected: `dist/assets/images/FGO/Nero/Nero_1.jpeg` 与 assets 一致。

- [ ] **Step 5: Commit**

```bash
git add scripts/normalize-portfolio-images.js package.json assets/images/
git commit -m "chore: normalize portfolio images and move to assets"
```

---

### Task 2: portfolio.json manifest 生成

**Files:**
- Create: `scripts/generate-portfolio-manifest.js`
- Create: `assets/data/portfolio.json`
- Modify: `package.json`

- [ ] **Step 1: 编写 manifest 生成脚本**

逻辑：
1. 递归扫描 `assets/images/`，收集所有图片。
2. 路径形如 `FGO/Nero/Nero_1.jpeg` → 相册 id `fgo-nero`，标题 `FGO · Nero`。
3. 默认 `category: "photography"`；`assets/images/` 下无图片的目录跳过。
4. 输出结构：

```json
{
  "categories": [
    { "id": "photography", "title": "摄影", "description": "cos、场照与日常摄影" },
    { "id": "code", "title": "代码", "description": "网站与工具项目" },
    { "id": "drawing", "title": "手绘", "description": "插画与手绘草稿" }
  ],
  "albums": [
    {
      "id": "fgo-nero",
      "category": "photography",
      "title": "FGO · Nero",
      "cover": "assets/images/FGO/Nero/Nero_1.jpeg",
      "images": [
        { "src": "assets/images/FGO/Nero/Nero_1.jpeg", "alt": "FGO Nero 1" },
        { "src": "assets/images/FGO/Nero/Nero_2.jpeg", "alt": "FGO Nero 2" }
      ]
    }
  ],
  "projects": [
    {
      "category": "code",
      "title": "个人静态网站",
      "description": "多页面静态站，含留言板与访问统计。",
      "href": "../index.html"
    },
    {
      "category": "code",
      "title": "奶龙表情包页面",
      "description": "纯前端随机表情包展示。",
      "href": "nailong.html"
    },
    {
      "category": "code",
      "title": "原神下载入口",
      "description": "按设备跳转官方下载地址。",
      "href": "genshin.html"
    }
  ]
}
```

脚本核心（相册按目录叶子节点分组，文件夹名即角色名）：

```javascript
// scripts/generate-portfolio-manifest.js — 核心分组
function albumFromDir(relDir, files) {
  const parts = relDir.split(path.sep);
  const character = parts[parts.length - 1];
  const franchise = parts.length > 1 ? parts[0] : character;
  const id = relDir.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const sorted = files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return {
    id,
    category: "photography",
    title: parts.length > 1 ? `${franchise} · ${character}` : character,
    cover: `assets/images/${relDir}/${sorted[0]}`,
    images: sorted.map((f, i) => ({
      src: `assets/images/${relDir}/${f}`,
      alt: `${title} ${i + 1}`
    }))
  };
}
```

- [ ] **Step 2: 注册并生成**

```json
"generate:portfolio": "node scripts/generate-portfolio-manifest.js",
"prebuild": "node scripts/generate-portfolio-manifest.js"
```

```bash
npm run generate:portfolio
```

Expected: `assets/data/portfolio.json` 含 16 个 photography 相册、3 个 code projects。

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-portfolio-manifest.js assets/data/portfolio.json package.json
git commit -m "feat: add portfolio manifest generator"
```

---

### Task 3: 画廊渲染逻辑（TDD）

**Files:**
- Create: `assets/js/portfolio.js`
- Create: `tests/portfolio-manifest.test.js`
- Test: `tests/portfolio-manifest.test.js`

- [ ] **Step 1: 编写失败测试**

```javascript
// tests/portfolio-manifest.test.js
import { describe, expect, test } from "vitest";
import fs from "fs";
import path from "path";

import { resolveImageSrc, groupAlbumsByCategory } from "../assets/js/portfolio.js";

const manifestPath = path.join(process.cwd(), "assets/data/portfolio.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

describe("portfolio manifest", () => {
  test("every photography image file exists on disk", () => {
    for (const album of manifest.albums.filter((a) => a.category === "photography")) {
      for (const image of album.images) {
        expect(fs.existsSync(path.join(process.cwd(), image.src))).toBe(true);
      }
    }
  });

  test("resolveImageSrc prefixes pages/ correctly", () => {
    expect(resolveImageSrc("assets/images/FGO/Nero/Nero_1.jpeg")).toBe(
      "../assets/images/FGO/Nero/Nero_1.jpeg"
    );
  });

  test("groupAlbumsByCategory buckets albums", () => {
    const grouped = groupAlbumsByCategory(manifest.albums);
    expect(grouped.photography.length).toBeGreaterThan(0);
    expect(grouped.drawing ?? []).toHaveLength(0);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npm test -- tests/portfolio-manifest.test.js
```

Expected: FAIL — `portfolio.js` 或导出函数不存在。

- [ ] **Step 3: 实现 portfolio.js**

```javascript
// assets/js/portfolio.js
export function resolveImageSrc(src) {
  return src.startsWith("../") ? src : `../${src}`;
}

export function groupAlbumsByCategory(albums) {
  return albums.reduce((acc, album) => {
    const key = album.category || "photography";
    if (!acc[key]) acc[key] = [];
    acc[key].push(album);
    return acc;
  }, {});
}

function renderProjectCard(project) {
  const href = project.href ? ` href="${project.href}"` : "";
  return `
    <article class="card">
      <div class="card-content">
        <h2>${project.title}</h2>
        <p>${project.description}</p>
        ${project.href ? `<p><a class="button"${href}>查看</a></p>` : ""}
      </div>
    </article>`;
}

function renderAlbum(album) {
  const thumbs = album.images
    .map(
      (img) =>
        `<a class="portfolio-thumb" href="${resolveImageSrc(img.src)}" target="_blank" rel="noopener noreferrer">
          <img src="${resolveImageSrc(img.src)}" alt="${img.alt}" loading="lazy" width="320" height="240">
        </a>`
    )
    .join("");
  return `
    <section class="portfolio-album">
      <h3>${album.title}</h3>
      <div class="portfolio-grid">${thumbs}</div>
    </section>`;
}

function renderCategoryPanel(id, title, bodyHtml) {
  return `<div class="portfolio-panel" data-category="${id}" hidden>${bodyHtml}</div>`;
}

export async function initPortfolio(root = document) {
  const res = await fetch(new URL("../assets/data/portfolio.json", import.meta.url));
  const data = await res.json();
  const container = root.querySelector("#portfolioApp");
  if (!container) return;

  const tabs = data.categories
    .map(
      (c, i) =>
        `<button type="button" class="portfolio-tab${i === 0 ? " is-active" : ""}" data-tab="${c.id}">${c.title}</button>`
    )
    .join("");

  const grouped = groupAlbumsByCategory(data.albums);
  const codeProjects = (data.projects || []).filter((p) => p.category === "code");

  const panels = data.categories
    .map((cat) => {
      if (cat.id === "photography") {
        const albums = (grouped.photography || []).map(renderAlbum).join("");
        return renderCategoryPanel(cat.id, cat.title, albums || "<p class=\"muted\">暂无作品</p>");
      }
      if (cat.id === "code") {
        const cards = codeProjects.map(renderProjectCard).join("");
        return renderCategoryPanel(cat.id, cat.title, `<div class="card-grid">${cards}</div>`);
      }
      if (cat.id === "drawing") {
        return renderCategoryPanel(cat.id, cat.title, "<p class=\"muted\">手绘作品即将上传</p>");
      }
      return renderCategoryPanel(cat.id, cat.title, "");
    })
    .join("");

  container.innerHTML = `<div class="portfolio-tabs">${tabs}</div>${panels}`;

  const tabButtons = container.querySelectorAll(".portfolio-tab");
  const panelNodes = container.querySelectorAll(".portfolio-panel");

  function activate(tabId) {
    tabButtons.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.tab === tabId));
    panelNodes.forEach((panel) => {
      panel.hidden = panel.dataset.category !== tabId;
    });
  }

  tabButtons.forEach((btn) => btn.addEventListener("click", () => activate(btn.dataset.tab)));
  activate(data.categories[0].id);
}

if (document.querySelector("#portfolioApp")) {
  initPortfolio();
}
```

注意：`import.meta.url` 在 Vitest 与浏览器中行为不同；测试只 import 纯函数 `resolveImageSrc` / `groupAlbumsByCategory`，`initPortfolio` 在 HTML 中通过 `<script type="module">` 加载。若 Worker 不提供 ES module，改用 IIFE 副本或 `build-static.js` 不打包此文件（保持原生 module，现代浏览器均支持）。

- [ ] **Step 4: 运行测试通过**

```bash
npm test -- tests/portfolio-manifest.test.js
```

Expected: PASS（3 tests）

- [ ] **Step 5: Commit**

```bash
git add assets/js/portfolio.js tests/portfolio-manifest.test.js
git commit -m "feat: add portfolio gallery renderer with tests"
```

---

### Task 4: 作品集页面与样式

**Files:**
- Modify: `pages/portfolio.html`
- Modify: `assets/css/main.css`

- [ ] **Step 1: 更新 portfolio.html**

替换 `<section class="card-grid">...</section>` 为：

```html
    <section class="hero">
      <div class="badge">Portfolio</div>
      <h1>作品集</h1>
      <p class="subtitle">摄影、代码项目与手绘作品。图片托管在 GitHub 仓库 <code>assets/images/</code>。</p>
    </section>

    <div id="portfolioApp" class="portfolio-app" aria-live="polite"></div>
```

在 `</body>` 前将 script 改为：

```html
  <script type="module" src="../assets/js/portfolio.js"></script>
  <script src="../assets/js/main.js"></script>
```

- [ ] **Step 2: 添加 CSS（append 到 main.css 末尾）**

```css
.portfolio-app {
  margin-top: 28px;
}

.portfolio-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-bottom: 24px;
}

.portfolio-tab {
  padding: 10px 18px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--heading);
  cursor: pointer;
  font-weight: 600;
}

.portfolio-tab.is-active {
  color: #0f172a;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-cyan) 100%);
  border-color: transparent;
}

.portfolio-album {
  margin-bottom: 36px;
}

.portfolio-album h3 {
  margin: 0 0 14px;
  font-size: 1.2rem;
  color: var(--heading);
}

.portfolio-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.portfolio-thumb {
  display: block;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid var(--border);
  aspect-ratio: 4 / 3;
}

.portfolio-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}

.portfolio-thumb:hover img {
  transform: scale(1.04);
}

.muted {
  color: var(--muted);
  text-align: center;
}
```

- [ ] **Step 3: 构建并本地验证**

```bash
npm run build
npm run dev
```

浏览器打开 `http://localhost:8787/pages/portfolio.html`（端口以 wrangler 输出为准）。

Expected:
- 默认显示「摄影」Tab，16 个相册网格
- 点击「代码」显示 3 个项目卡片
- 点击「手绘」显示占位文案
- 图片可点击新标签打开原图

- [ ] **Step 4: Commit**

```bash
git add pages/portfolio.html assets/css/main.css
git commit -m "feat: portfolio page with photography, code, and drawing tabs"
```

---

### Task 5: GitHub 网盘与部署

**Files:**
- Modify: `.gitignore`（确认未忽略 `assets/images/`）
- 用户操作：git push

- [ ] **Step 1: 确认 Git 追踪图片**

```bash
git status assets/images/
git check-ignore -v assets/images/FGO/Nero/Nero_1.jpeg || echo "not ignored"
```

Expected: 图片显示为 untracked 或 staged，且 **not ignored**。

- [ ] **Step 2: 全量测试**

```bash
npm test
npm run build
```

Expected: 全部 PASS；`dist/assets/data/portfolio.json` 存在。

- [ ] **Step 3: 推送到 GitHub（用户确认后执行）**

```bash
git push origin main
```

Expected: GitHub 仓库 `assets/images/` 可见；raw 链接可访问。

- [ ] **Step 4: 部署 Cloudflare**

```bash
npm run deploy
```

Expected: 线上作品集页可加载图片。

- [ ] **Step 5: Commit（如有 .gitignore 等改动）**

```bash
git commit -m "chore: ensure portfolio assets are deployable"
```

---

## 分类规则（实现时写入 manifest 生成器）

| 目录 / 类型 | category | 说明 |
|---|---|---|
| `assets/images/**` 下所有当前 cos 图 | `photography` | 默认全部摄影 |
| `portfolio.json` → `projects` | `code` | 原有三张项目卡片 |
| 未来 `assets/images/drawings/**` | `drawing` | 用户放入手绘后重新 `generate:portfolio`，脚本检测 `drawings` 路径设 `category: "drawing"` |

扩展 `generate-portfolio-manifest.js`：

```javascript
function categoryForPath(relDir) {
  if (relDir.startsWith("drawings")) return "drawing";
  return "photography";
}
```

---

## Self-Review

**1. Spec coverage**

| 需求 | 对应 Task |
|---|---|
| 图片加入作品集 | Task 2–4 |
| 摄影/代码/手绘三大类 | Task 2 manifest + Task 4 UI |
| 重命名 Nero_1 等 | Task 1 脚本 + 映射表 |
| GitHub 当网盘 | Task 1 迁到 assets + Task 5 push |
| 整理微信长文件名 | Task 1 |

**2. Placeholder scan:** 无 TBD；手绘仅有明确占位文案。

**3. Type consistency:** manifest 字段 `category` / `src` / `album.id` 在全计划统一。

**Gap:** 用户若后续把某相册改为「手绘」，需手动改 `portfolio.json` 的 `category` 或扩展生成脚本配置表 `assets/data/portfolio-overrides.json`（YAGNI，首版不做）。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-20-portfolio-image-gallery.md`. Two execution options:

**1. Subagent-Driven (recommended)** — 每个 Task 派发独立 subagent，Task 间做代码审查，迭代快。

**2. Inline Execution** — 本会话用 executing-plans 按 Task 批量执行，检查点暂停给你确认。

**Which approach?**
