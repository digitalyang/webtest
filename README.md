# webtest

个人主页项目，已重构为 Next.js App Router，并通过 `@opennextjs/cloudflare` 部署到 Cloudflare Workers。留言板、作品集管理数据和访问埋点使用 Cloudflare D1。

- 线上地址：[https://webtest.digitalyang2002.workers.dev/](https://webtest.digitalyang2002.workers.dev/)
- Cloudflare 管理页面：[Workers & Pages](https://dash.cloudflare.com/61f11b4f67679695a8ef80b030c3eb51/workers-and-pages)
- GitHub 仓库：[digitalyang/webtest](https://github.com/digitalyang/webtest)

## 功能

- 首页、个人简介、作品集、日记分享等页面由 Next.js 静态预渲染。
- 作品集：`/portfolio` 展示分类；`/portfolio/work/[workId]` 展示角色；`/portfolio/role/[roleId]` 分批加载原图。
- 作品集后台：支持新建动态作品/角色、上传 Cloudinary 图片、追加静态作品图片、设置作品/角色封面，并为具体图片维护 `CN：<圈名>` 标注。
- 静态作品封面：可把旧本地静态图片导入为 480px Cloudinary WebP 封面候选，原始大图仍保留在站点静态资源中。
- 留言板：通过 `/api/messages` 写入和读取 D1 留言数据，支持 Markdown 安全渲染。
- 访问埋点：通过 `/api/stats` 的 POST 记录访问量；统计读取不向前端公开。
- 奶龙表情包、原神下载、点击星星、Toast 等客户端交互保留。
- 留言防滥用：包含蜜罐字段、频率限制、重复内容检测和危险内容过滤。

## 项目结构

```text
.
├── app/                 # Next.js App Router 页面和 API Route Handlers
├── components/          # React 客户端/服务端组件
├── lib/                 # 共享逻辑、作品集 helpers、D1 API helpers
├── migrations/          # Cloudflare D1 数据库迁移
├── public/assets/       # 图片、缩略图、portfolio manifest 等静态资源
├── scripts/             # 图片规范化、缩略图、manifest 生成脚本
├── tests/               # Vitest 测试
├── next.config.mjs      # Next.js 配置和旧 URL redirect
├── open-next.config.ts  # OpenNext Cloudflare 配置
├── package.json         # npm 脚本和依赖
└── wrangler.toml        # Cloudflare Workers / D1 配置
```

## 本地开发

先安装依赖：

```sh
npm install
```

启动 Next.js 开发服务器：

```sh
npm run dev
```

生成作品集缩略图和 manifest：

```sh
npm run generate:portfolio-thumbs
npm run generate:portfolio
```

导入 `portfolio.json` 中的静态原图到 Cloudinary 画廊（与追加上传相同的 9.5MB 压缩策略）：

```sh
npm run import:static-portfolio:dry-run
npm run import:static-portfolio:local
npm run import:static-portfolio:remote
```

脚本会上传完整画廊资源到 `webtest/portfolio/{作品}/{角色}/{角色}_{序号}`，写入 D1 `portfolio_static_images`（含 `legacy_local_src`），并迁移 `static-local` 出镜名记录。远程导入前建议先运行 dry-run 确认将处理的图片列表。

部署后公开作品集只使用 Cloudinary URL；`public/assets/images` 仍保留在仓库中作备份，站点运行时不再引用本地路径。本地调试如需回退 manifest 原图，可设置 `ALLOW_LOCAL_STATIC_FALLBACK=1`。

生产构建并生成 OpenNext Cloudflare 产物：

```sh
npm run build
```

仅运行 Next.js 构建：

```sh
npm run build:next
```

Cloudflare Workers Runtime 本地预览：

```sh
npm run preview
```

## 数据库迁移

本地 D1 迁移：

```sh
npm run d1:migrate:local
```

远程 D1 迁移：

```sh
npm run d1:migrate:remote
```

当前 D1 绑定名称为 `DB`，数据库名为 `webtest-db`，配置在 `wrangler.toml` 中。Next Route Handlers 通过 OpenNext Cloudflare 上下文读取该绑定。

当前数据库迁移包含留言、日记、作品集后台、静态追加图片和作品图片 CN 标注等表。新增功能上线前需要先运行对应的 D1 migration。

## 测试

```sh
npm test
```

测试覆盖作品集 manifest、作品集导航 helper、作品集后台 API、CN 标注、Markdown 安全渲染、D1 API helper 和旧 URL 映射。

## 部署

部署到 Cloudflare Workers：

```sh
npm run deploy
```

如果 Cloudflare 控制台使用分离的 Build / Deploy 命令，请使用：

```text
Build command: npm run build
Deploy command: npx wrangler deploy
```

`npm run build` 会同时生成 `.next/` 和 `.open-next/`，所以后续 `wrangler deploy` 可以找到 OpenNext 编译产物。

上传 Worker 版本但不立即发布：

```sh
npm run version
```

部署后可在 Cloudflare 管理页面查看 Worker、日志、D1 数据库和版本发布状态。

## 旧 URL 兼容

旧静态站入口仍保持可访问：

- `/index.html` -> `/`
- `/pages/portfolio.html` -> `/portfolio`
- `/pages/portfolio-work.html?id=hok` -> `/portfolio/work/hok`
- `/pages/portfolio-role.html?id=hok-daji` -> `/portfolio/role/hok-daji`

普通静态页面旧路径通过 `next.config.mjs` redirects 处理；带 `id` 的作品集旧路径通过 `app/pages/*.html/route.js` 保留 query 兼容。
