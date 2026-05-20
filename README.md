# webtest

个人主页项目，已重构为 Next.js App Router，并通过 `@opennextjs/cloudflare` 部署到 Cloudflare Workers。留言板和访问统计继续使用 Cloudflare D1。

- 线上地址：[https://webtest.digitalyang2002.workers.dev/](https://webtest.digitalyang2002.workers.dev/)
- Cloudflare 管理页面：[Workers & Pages](https://dash.cloudflare.com/61f11b4f67679695a8ef80b030c3eb51/workers-and-pages)
- GitHub 仓库：[digitalyang/webtest](https://github.com/digitalyang/webtest)

## 功能

- 首页、个人简介、作品集、日记分享等页面由 Next.js 静态预渲染。
- 作品集：`/portfolio` 展示分类；`/portfolio/work/[workId]` 展示角色；`/portfolio/role/[roleId]` 分批加载原图。
- 留言板：通过 `/api/messages` 写入和读取 D1 留言数据，支持 Markdown 安全渲染。
- 访问统计：通过 `/api/stats` 记录访问量并展示页面排行。
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

生产构建：

```sh
npm run build
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

## 测试

```sh
npm test
```

测试覆盖作品集 manifest、作品集导航 helper、Markdown 安全渲染、D1 API helper 和旧 URL 映射。

## 部署

部署到 Cloudflare Workers：

```sh
npm run deploy
```

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
