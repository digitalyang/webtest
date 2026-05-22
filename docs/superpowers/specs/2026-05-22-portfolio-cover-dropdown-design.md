# Portfolio Cover Dropdown Design

## Goal

Make the portfolio admin cover-setting flow use clear dropdowns instead of manual IDs.

The UI should use one consistent vocabulary:

- 作品
- 角色
- 照片
- 封面

The UI should not expose implementation source labels such as static, dynamic, old work, old album, or appended image.

## Current Context

The admin upload flow already supports selecting works and roles through dropdowns for image upload.

The cover-setting flow still uses manual fields:

```text
目标类型
目标 ID
图片 ID
```

It also exposes implementation labels such as:

```text
旧作品
旧相册
追加图片
```

That makes cover setting harder to use and inconsistent with the upload flow.

## Approved Direction

Use one cascading cover picker:

```text
封面类型：作品封面 / 角色封面
选择作品
选择角色
选择封面
设置封面
```

Both cover types use the same selection path.

### 作品封面

Flow:

```text
封面类型：作品封面
选择作品：GirlsBandCry
选择角色：Nina
选择封面：Nina_5.webp
```

The selected photo is applied to the whole selected work.

### 角色封面

Flow:

```text
封面类型：角色封面
选择作品：GirlsBandCry
选择角色：Nina
选择封面：Nina_5.webp
```

The selected photo is applied only to the selected role.

## Admin UI

Replace the current cover card fields with:

- `封面类型` select
  - `作品封面`
  - `角色封面`
- `选择作品` select
- `选择角色` select
- `选择封面` select
- `设置封面` button

The work and role dropdowns should reuse the existing admin option model used by uploads.

The cover photo dropdown should show photos for the selected role only.

Photo option labels should be understandable without technical source labels. Good labels:

```text
Nina_5.webp
Nina 5
#50 Nina_5.webp
```

If a filename is unavailable, use a stable fallback with the image ID.

## Data Model For Options

The frontend can still keep internal source metadata in option values or objects:

```text
work.source: static | dynamic
role.source: static | static-dynamic | dynamic
photo.source: static | dynamic
```

This metadata should not be displayed as the primary UI label.

The frontend should map the selected values to the existing cover API contract:

### Dynamic Work

```json
{
  "targetType": "work",
  "targetId": 1,
  "imageId": 20
}
```

### Dynamic Role

```json
{
  "targetType": "role",
  "targetId": 2,
  "imageId": 20
}
```

### Static Work

```json
{
  "targetType": "static-work",
  "targetId": "girlsbandcry",
  "imageId": 50
}
```

### Static Role

```json
{
  "targetType": "static-role",
  "targetId": "girlsbandcry-nina",
  "imageId": 50
}
```

## Photo Filtering

When a role is selected:

- Dynamic role: show images from `portfolio_images` where `role_id` matches the selected role.
- Static original role: show appended Cloudinary images from `portfolio_static_images` where `static_role_id` matches the selected role.
- Static-work dynamic role: show appended Cloudinary images from `portfolio_static_images` where `static_role_id` matches the generated public role ID.

Original local static images from `portfolio.json` do not need to appear in the first version because the backend can only set cover overrides to D1/Cloudinary image IDs.

If a selected role has no selectable Cloudinary photos, show an empty option message such as:

```text
这个角色暂无可选照片
```

## Cover WebP Fallback

The backend should ensure the selected photo has a usable 480px WebP cover URL.

If a dynamic image or static appended image already has `cover_thumb_url`, use it.

If `cover_thumb_url` is missing, derive it from Cloudinary metadata:

```text
https://res.cloudinary.com/<cloudName>/image/upload/c_fill,w_480,f_webp,q_auto/<publicId>.webp
```

Then continue setting the cover.

The frontend should not need to know whether the cover URL already existed or was derived.

## Error Handling

Frontend validation:

- If no work is selected, show `请选择作品。`
- If no role is selected, show `请选择角色。`
- If no photo is selected, show `请选择封面照片。`

Backend validation:

- Reject a cover request when the selected image does not belong to the selected work or role.
- Reject missing static or dynamic targets with the current clear error messages.
- Keep all admin cover APIs protected by the admin session.

## Testing

Required coverage:

- Admin page renders `作品封面`, `角色封面`, `选择作品`, `选择角色`, and `选择封面`.
- Admin page no longer renders cover labels `旧作品`, `旧相册`, `目标 ID`, or `图片 ID`.
- Frontend maps selected dynamic work/role/photo to `work` or `role` cover payloads.
- Frontend maps selected static work/role/photo to `static-work` or `static-role` cover payloads.
- Backend derives a missing dynamic `cover_thumb_url` before setting cover.
- Backend derives a missing static appended `cover_thumb_url` before setting cover.
- Backend rejects image/target ownership mismatches.

## Out of Scope

- Selecting original local static images as cover candidates.
- Drag-and-drop cover picking.
- Visual thumbnail preview in the dropdown.
- Changing the public portfolio route structure.
