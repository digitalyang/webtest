# webtest

个人主页项目，使用静态 HTML/CSS/JavaScript 构建页面，并通过 Cloudflare Workers 部署。留言板和访问统计数据保存在 Cloudflare D1。

- 线上地址：[https://webtest.digitalyang2002.workers.dev/](https://webtest.digitalyang2002.workers.dev/)
- Cloudflare 管理页面：[Workers & Pages](https://dash.cloudflare.com/61f11b4f67679695a8ef80b030c3eb51/workers-and-pages)
- GitHub 仓库：[digitalyang/webtest](https://github.com/digitalyang/webtest)

## 功能

- 首页、个人简介、作品集、日记分享等静态页面
- 留言板：通过 `/api/messages` 写入和读取 D1 留言数据
- 访问统计：通过 `/api/stats` 记录访问量并展示页面排行
- 奶龙表情包、原神下载等趣味入口
- 留言防滥用：包含蜜罐字段、频率限制、重复内容检测和危险内容过滤

## 项目结构

```text
.
├── assets/              # CSS、前端 JavaScript 等静态资源
├── migrations/          # Cloudflare D1 数据库迁移
├── pages/               # 子页面 HTML
├── scripts/             # 构建脚本
├── src/worker.js        # Cloudflare Worker 入口和 API
├── index.html           # 首页
├── package.json         # npm 脚本和依赖
└── wrangler.toml        # Cloudflare Workers 配置
```

## 本地开发

先安装依赖：

```sh
npm install
```

构建静态资源：

```sh
npm run build
```

启动本地 Worker：

```sh
npm run dev
```

构建脚本会把 `index.html`、`assets/` 和 `pages/` 复制到 `dist/`，Worker 再从 `dist/` 提供静态资源。

## 数据库迁移

本地 D1 迁移：

```sh
npm run d1:migrate:local
```

远程 D1 迁移：

```sh
npm run d1:migrate:remote
```

当前 D1 绑定名称为 `DB`，数据库名为 `webtest-db`，配置在 `wrangler.toml` 中。

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
