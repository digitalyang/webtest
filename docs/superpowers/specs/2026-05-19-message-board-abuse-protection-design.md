# 留言板轻量防护设计

## 背景

当前留言板通过 Cloudflare Worker 的 `/api/messages` 写入 D1，前端 `assets/js/messages.js` 调用接口发布和读取留言。现有保护包括：

- 前端 `maxlength` 限制昵称和留言长度。
- 前端展示时用 `textContent` 转义用户内容。
- Worker 端用 `cleanText()` 截断昵称和留言长度。
- D1 使用参数绑定写入，避免 SQL 注入。

这些保护不足以防止连续刷留言、重复内容灌入和明显的脚本攻击内容提交。

## 目标

实现轻量防护，不增加登录、验证码或审核流程，保持个人站留言体验简单：

- 留言内容上限放宽到 3000 字。
- 发布按钮提交后冷却 3 秒。
- 拒绝明显危险的脚本/HTML 攻击片段。
- 限制同一来源 60 秒内最多 5 条留言。
- 限制同一来源 5 分钟内重复提交完全相同留言。
- 所有拒绝返回中文错误，避免服务端抛 500。

## 非目标

- 不做验证码。
- 不做人工审核队列。
- 不做用户登录。
- 不引入第三方安全服务。
- 不追求抵御分布式攻击，只处理个人站常见低成本滥用。

## 前端设计

修改 `pages/messages.html`：

- 留言 `textarea` 的 `maxlength` 从 `200` 改为 `3000`。
- 增加隐藏蜜罐字段，例如 `website`，正常用户不可见。

修改 `assets/js/messages.js`：

- 提交时读取 `website` 字段并发送给后端。
- 提交成功或失败后，发布按钮进入 3 秒冷却。
- 冷却期间禁用按钮，并显示“请等待 3 秒”等倒计时文案。
- 前端保留空值校验，但安全判断以 Worker 端为准。

## Worker API 设计

修改 `src/worker.js` 的 `handleMessages()`：

- `name` 最大 20 字。
- `content` 最大 3000 字。
- 如果 `website` 蜜罐字段不为空，返回 400。
- 拒绝包含明显危险片段的内容或昵称：
  - `<script`
  - `</script`
  - `javascript:`
  - `onerror=`
  - `onclick=`
  - `<iframe`
  - `<object`
  - `<embed`
- 基于请求来源生成 `client_key`：
  - 优先读取 `CF-Connecting-IP`。
  - 本地开发或缺失时回退到 `User-Agent`。
  - 使用 `crypto.subtle.digest("SHA-256")` 哈希，不明文存 IP。
- 发布前查询 `message_events`：
  - 60 秒内同一 `client_key` 超过或等于 5 条，返回 429。
  - 5 分钟内同一 `client_key` + `content_hash` 已存在，返回 429。
- 留言写入成功后，写入一条 `message_events` 记录。

## 数据库设计

新增 migration `migrations/0002_message_abuse_protection.sql`：

```sql
CREATE TABLE IF NOT EXISTS message_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_key TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_message_events_client_time
  ON message_events (client_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_events_duplicate
  ON message_events (client_key, content_hash, created_at DESC);
```

## 错误处理

Worker 返回 JSON 错误：

- 蜜罐触发：`检测到异常提交，请刷新页面后重试。`
- 危险内容：`留言包含不支持的代码片段，请修改后再提交。`
- 频率过高：`留言太频繁了，请稍后再试。`
- 重复内容：`请不要重复提交相同留言。`

前端统一展示 `error.message` 或接口返回的 `error`。

## 测试计划

本地验证：

- `npm run build`
- `npm run d1:migrate:local`
- `npm run dev`

接口验证：

- 正常留言成功写入。
- 3000 字以内留言成功，超过后被截断或拒绝。
- 包含 `<script` 的留言被拒绝。
- 蜜罐字段非空被拒绝。
- 60 秒内第 6 条留言被拒绝。
- 5 分钟内重复内容被拒绝。

部署前验证：

- `ReadLints` 无报错。
- `git status` 只包含本功能相关改动。
