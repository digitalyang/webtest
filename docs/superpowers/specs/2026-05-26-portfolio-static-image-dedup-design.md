# 作品集管理端：静态图去重与统一隐藏入口

**日期：** 2026-05-26  
**状态：** 已批准（方案 A + 统一「图片」隐藏）  
**关联：** [portfolio-static-cloud-migration-design](./2026-05-26-portfolio-static-cloud-migration-design.md)

## 背景

### 重复显示

静态原图迁 Cloudinary 后，同一角色在 `portfolio_static_images` 可能同时存在：

1. **画廊行**：`cloudinary_public_id` 以 `webtest/portfolio/` 开头，通常带 `legacy_local_src`
2. **封面遗留行**：以 `webtest/portfolio-covers/` 开头（旧导入脚本写入，无 `legacy_local_src`）

公开角色页与 CN 出镜名下拉已排除 cover-only 行。管理端「隐藏 → 追加图片」、封面下拉、追加图片 snapshot 仍展示全量 `staticImages`，导致同一 `filename` 出现两次。

### 操作对象过多

「隐藏 / 恢复」卡片将 **动态图片** 与 **追加图片** 拆成两个操作对象。迁云后静态原图与追加上传同属 `portfolio_static_images`，运营侧只需「选角色 → 选图片 → 隐藏」，不必区分来源。

## 目标

1. 管理端画廊相关列表/下拉 **只展示画廊行**（过滤 `portfolio-covers`）。
2. 隐藏 UI **只保留一个「图片」入口**：下拉与 snapshot 合并动态图与静态画廊图；后端仍按行类型走既有 `image` / `static-image` PATCH。
3. **保留** 作品、角色级隐藏及级联（与现有 spec 一致）；本变更不删除作品/角色操作对象。

## 非目标

- 不修改 D1 数据、不按 `filename` 跨行去重
- 不改变 CN 出镜名、封面上传的 `imageSource` 枚举（仍为 `dynamic` / `static-image`）
- 不合并作品/角色 snapshot 卡片

## 方案 A：过滤 cover-only 行

### 判定规则

```js
function isStaticCoverOnlyImage(image) {
  return String(image?.cloudinary_public_id || "")
    .startsWith("webtest/portfolio-covers/");
}

function filterGalleryStaticImages(images) {
  return (images || []).filter((img) => !isStaticCoverOnlyImage(img));
}
```

### 共享模块

新增 `lib/portfolio-static-images.js`，导出上述函数。`lib/portfolio-admin.js`、`lib/client/portfolio-cn-options.js` 改为从此导入。

### 应用位置

| 位置 | 变更 |
|------|------|
| `buildVisibilityImageOptions` | 静态分支先 `filterGalleryStaticImages` |
| `buildCoverPhotoOptions` | 静态分支同样过滤 |
| 图片 snapshot（见下） | 仅展示过滤后的静态行 |

## 统一「图片」隐藏（前端）

### 操作对象下拉

`PortfolioAdmin`「隐藏 / 恢复」仅三项：

- `作品`
- `角色`
- `图片`（去掉「动态图片」「追加图片」）

`visibilityNeedsImage` 仅在 `visibilityTargetType === "image"` 时为真。

### 图片下拉：`buildVisibilityImageOptions`

**签名：** `buildVisibilityImageOptions(snapshot, roleKey)` — 不再传入 `targetType` / `static-image`。

根据已选 **角色** 的 `source` 自动分支：

| 角色 source | 数据来源 | 选项 `value` |
|-------------|----------|----------------|
| `dynamic` | `snapshot.images`（`role_id` 匹配） | `dynamic:{id}` |
| `static-role` / `static-manifest` | `filterGalleryStaticImages(snapshot.staticImages)`（`static_role_id` 匹配） | `static:{id}` |

选项 `label` 仍为 `filename` / `cloudinary_public_id`，带「（隐藏）」后缀；**不**在 label 上标注「追加」或「动态」。

### Payload：`getVisibilityPayload`

UI 层 `targetType` 仅为 `work` | `role` | `image`。

当 `targetType === "image"` 时，根据 `imageKey` 的 source 映射到后端类型（对调用方透明）：

- `dynamic:{id}` → `{ targetType: "image", targetId: number }`
- `static:{id}` → `{ targetType: "static-image", targetId: "static:{id}" }`

`VALID_TARGET_TYPES` / `TARGET_TYPES_REQUIRING_IMAGE` 在 helper 内保留对 `static-image` 的 **payload 映射** 即可；管理端 state 不再出现 `static-image` 字符串。

### 图片 snapshot：单列表

合并原「图片 snapshot」与「追加图片 snapshot」为一张卡片 **「图片 snapshot」**：

- 动态行：`snapshot.images`
- 静态画廊行：`filterGalleryStaticImages(snapshot.staticImages)`
- 行内快速隐藏按钮根据行类型调用既有 `hideItem`：
  - 动态：`hideItem("image", id, …)`
  - 静态：`hideItem("static-image", \`static:${id}\`, …)`
- 列表项 `key` 使用 `dynamic-{id}` / `static-{id}` 避免 id 碰撞
- 空状态文案：`暂无图片。`

### 后端

**无 API 变更。** `VISIBILITY_ENDPOINTS` 仍区分 `image` 与 `static-image`；仅前端不再暴露该区分。

## 数据流

```
snapshot (works, roles, images, staticImages 全量)
  → 隐藏卡片：作品 / 角色 / 图片（合并下拉）
  → buildVisibilityImageOptions(roleKey) → 动态或画廊静态选项
  → getVisibilityPayload → image | static-image PATCH
  → 图片 snapshot：images + filterGalleryStaticImages(staticImages)
```

## 错误处理

- 过滤后某静态角色无画廊行：该角色在图片下拉中无项（与前台一致）。
- 误选角色与图片 source 不匹配：`getVisibilityPayload` 继续 `assertOptionSource` 并抛出中文错误（测试保留）。

## 测试

1. **去重：** 画廊 + cover-only 双行，`buildVisibilityImageOptions` 仅 1 项。
2. **统一图片：** 动态角色返回 dynamic 选项；静态角色返回 static 选项；`getVisibilityPayload({ targetType: "image", imageKey: "static:200", … })` 映射为 `static-image`。
3. **封面选项：** `portfolio-cover-options` 过滤 cover-only。
4. **Admin 页面测试（若有）：** 不再出现「追加图片」操作对象选项；snapshot 标题为「图片 snapshot」。

## 验收标准

- `hok-daji` 等角色：隐藏 → 图片下拉中 `Daji_1.jpeg` 仅一条。
- 操作对象无「追加图片」；选静态角色后可直接选图并隐藏。
- 图片 snapshot 单列表含动态 + 静态画廊行，无重复 filename（cover-only 引起时）。
- `npm test` 全部通过。

## 后续（本 spec 外）

D1 清理 `webtest/portfolio-covers/` 遗留行另立 spec。
