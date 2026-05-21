# Portfolio Upload Compression Progress Design

## Goal

Add automatic client-side image compression and a visible progress bar to the portfolio admin upload flow.

The upload page should help the site owner upload images that exceed Cloudinary's current 10 MB per-file limit by compressing them in the browser before sending them to Cloudinary.

## Current Context

The portfolio admin upload flow is implemented in `components/admin/PortfolioAdmin.jsx`.

Current behavior:

- The user selects one or more image files.
- The browser asks the server for an upload plan.
- Each original selected file is uploaded directly to Cloudinary.
- Uploaded metadata is saved to D1 through the admin API.
- The portfolio snapshot is refreshed.

Cloudinary currently rejects files larger than 10 MB with an error like:

```text
File size too large. Maximum is 10485760.
```

The project already has `sharp`, but this upload path runs in the browser. The first version should not add server-side image processing or send large original files through the app server.

## Approved Direction

Use browser-side Canvas compression before Cloudinary upload.

High-level flow:

```text
Select images
-> request upload plan
-> compress oversized images to WebP
-> upload compressed/original files to Cloudinary
-> save metadata to D1
-> refresh snapshot
```

## Compression Rules

Use these limits:

- Cloudinary hard limit: 10 MB.
- App target limit: 9.5 MB.
- Oversized threshold: files larger than 9.5 MB.
- Output format for compressed images: WebP.

Files at or below 9.5 MB should upload unchanged.

Files above 9.5 MB should be converted to WebP in the browser. The compression routine should start with high quality and progressively reduce quality and dimensions until the output is below 9.5 MB.

If a file still cannot be compressed below 9.5 MB after reaching the configured minimum quality and dimension bounds, stop the upload before saving any image metadata and show a clear error message naming the file that needs manual handling.

## Compression Algorithm

The implementation should use browser APIs:

- `createImageBitmap` when available.
- Fallback to `HTMLImageElement` plus object URLs if needed.
- `canvas.toBlob(..., "image/webp", quality)` for output.

Recommended first-version parameters:

- Start quality: `0.9`.
- Minimum quality: `0.6`.
- Quality decrement: `0.1`.
- Start scale: `1`.
- Minimum scale: `0.5`.
- Scale decrement: `0.85` after quality attempts are exhausted.

For each scale, try qualities from high to low. If all qualities are still too large, reduce dimensions and try again.

The output should be wrapped as a `File` so existing upload code can continue to use `FormData`.

Compressed filenames should end in `.webp`. Example:

```text
original: nina-large.png
compressed upload file: nina-large.webp
```

Cloudinary public IDs still come from the server upload plan. This feature must not change public ID naming or D1 sort order.

## Progress UI

Add an upload progress bar to the existing upload card.

The progress should include compression, Cloudinary upload, D1 save, and snapshot refresh.

The UI should show:

- Current status text.
- Numeric percentage.
- A horizontal progress bar.
- Optional detail text for compression results.

Example status messages:

```text
正在生成上传计划...
正在压缩 nina.png (2/5)...
nina.png 已压缩：20.4MB -> 8.9MB
正在上传 nina.webp (2/5)...
正在保存图片记录...
正在刷新 snapshot...
上传完成：5 张图片已保存。
```

Progress should reset when the user selects a new file set.

## Progress Calculation

Use a deterministic approximate progress model.

For `N` selected files:

- Upload plan: 5%.
- Compression phase: 35%.
- Cloudinary upload phase: 50%.
- Save and refresh phase: 10%.

Within compression and upload phases, divide progress evenly by file count.

If no files require compression, the compression phase can complete immediately after checking all files.

The progress bar should reach 100% only after image records are saved and the snapshot refresh succeeds.

## Error Handling

Compression errors should stop the upload before Cloudinary upload starts for that file.

Cloudinary upload errors should keep the current error behavior but should prefer the clearer Cloudinary message when available.

If compression fails because browser APIs are unavailable, show:

```text
当前浏览器不支持自动压缩，请先手动压缩图片到 9.5MB 以下。
```

If compression cannot reach the target size, show:

```text
<filename> 压缩后仍超过 9.5MB，请手动缩小分辨率后再上传。
```

No partial D1 save should happen if preprocessing fails before Cloudinary uploads complete.

## Component Boundaries

Keep the first version scoped to the admin upload component and a small local helper module if needed.

Preferred structure:

- `components/admin/PortfolioAdmin.jsx`
  - Owns upload UI state.
  - Displays progress and status.
  - Calls compression helpers before Cloudinary upload.
- Optional `lib/client/image-compression.js`
  - Pure browser helper for file size formatting, WebP compression, and target-size checks.

If tests are easier with a helper module, create the helper module instead of embedding all logic in the React component.

## Testing

Add focused tests for the compression helpers and upload page behavior where practical.

Required coverage:

- Files below 9.5 MB are returned unchanged.
- Files above 9.5 MB are sent through the WebP compression path.
- Compression failure returns a clear error before D1 metadata save.
- Progress state can represent plan, compression, upload, save, refresh, and completion.
- Existing upload plan and metadata save behavior still use server-generated public IDs and sort order.

Existing portfolio admin API tests should continue to pass.

## Out of Scope

- Server-side compression.
- Cloudinary plan upgrades.
- Changing Cloudinary public ID naming.
- Changing D1 schema.
- Drag-and-drop upload UI.
- Per-file retry controls.
- Exact byte-level image quality guarantees.
