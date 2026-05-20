# Portfolio Gallery Performance Design

> **Status (2026-05-20): Historical / superseded by the Next.js Cloudflare refactor.**
>
> This document records the original static-site performance design. The current implementation uses Next.js App Router and OpenNext Cloudflare:
>
> - Portfolio list: `app/portfolio/page.jsx` -> `/portfolio`
> - Work detail: `app/portfolio/work/[workId]/page.jsx` -> `/portfolio/work/[workId]`
> - Role detail: `app/portfolio/role/[roleId]/page.jsx` -> `/portfolio/role/[roleId]`
> - Shared helpers: `lib/portfolio.js`
> - React components: `components/portfolio/*`
> - Static assets and manifest: `public/assets/images/**`, `public/assets/data/portfolio.json`
> - Generation scripts: `scripts/generate-portfolio-thumbnails.cjs`, `scripts/generate-portfolio-manifest.cjs`
>
> Old references below such as `pages/portfolio.html`, `assets/js/*`, `assets/data/*`, and `dist/` describe the pre-Next implementation only.

## Goal

Improve portfolio image loading performance while keeping all original images available from the site and GitHub repository.

The photography portfolio should load quickly by showing only one compressed cover thumbnail per album. Users can open an album detail page to view original images in batches of five.

## Current Problem

`assets/js/portfolio.js` currently renders every image in every photography album directly on `pages/portfolio.html`. The page has `loading="lazy"`, but the browser still has to build a large image DOM and may start downloading many original images as the user scrolls.

The current image set is small enough to work, but this approach will slow down quickly as more photos are added.

## Approved User Experience

### Portfolio List Page

`pages/portfolio.html` shows the three existing categories:

- `摄影`
- `代码`
- `手绘`

In the `摄影` category, each album is displayed as a single card:

- Album title.
- One cover image.
- Image count, for example `6 张`.
- Link to the album detail page.

The cover image must use a compressed WebP thumbnail:

```text
assets/images/FGO/Nero/Nero_1.thumb.webp
```

The original image remains available:

```text
assets/images/FGO/Nero/Nero_1.jpeg
```

### Album Detail Page

Add a detail page:

```text
pages/portfolio-album.html?id=fgo-nero
```

The page reads `assets/data/portfolio.json`, finds the album by `id`, and renders original images from `album.images`.

Loading behavior:

- Initial render loads the first 5 original images.
- A `继续加载 5 张` button loads the next batch of up to 5 images.
- When fewer than 5 remain, the button loads the remaining images.
- After all images are loaded, the button is hidden and a message says `已加载全部图片`.
- If an album has 5 or fewer images, the button is not shown after initial render.

Original images can still be clicked to open in a new tab.

## Architecture

### Thumbnail Generation

Add a Node script that scans `assets/images/` and creates WebP thumbnails for original image files.

Thumbnail rules:

- Width: `480px`.
- Format: WebP.
- Naming: insert `.thumb` before the extension.
- Example: `Nero_1.jpeg` -> `Nero_1.thumb.webp`.
- Do not generate thumbnails from existing `.thumb.webp` files.
- Preserve aspect ratio.
- Keep original images unchanged.

The recommended implementation uses `sharp` because it is reliable and widely used for static image pipelines.

### Manifest Updates

Update `scripts/generate-portfolio-manifest.js` so each album includes:

```json
{
  "cover": "assets/images/FGO/Nero/Nero_1.jpeg",
  "coverThumb": "assets/images/FGO/Nero/Nero_1.thumb.webp",
  "images": [
    {
      "src": "assets/images/FGO/Nero/Nero_1.jpeg",
      "alt": "FGO · Nero 1"
    }
  ]
}
```

If a thumbnail is missing, the generator should fall back to `cover` so the site still works. The implementation should still make the normal build generate thumbnails before generating the manifest.

### Frontend Modules

Keep responsibilities small:

- `assets/js/portfolio.js`: renders category tabs and album cards on `pages/portfolio.html`.
- `assets/js/portfolio-album.js`: renders the album detail page and manages batch loading.
- `assets/data/portfolio.json`: remains the single source of truth for categories, albums, and projects.

### Build Flow

Update `package.json` scripts so the build prepares portfolio assets before copying to `dist/`:

```json
{
  "generate:portfolio-thumbs": "node scripts/generate-portfolio-thumbnails.js",
  "generate:portfolio": "node scripts/generate-portfolio-manifest.js",
  "prebuild": "npm run generate:portfolio-thumbs && npm run generate:portfolio"
}
```

## Data Flow

1. Original images live in `assets/images/**`.
2. `generate-portfolio-thumbnails.js` creates `*.thumb.webp` cover thumbnails.
3. `generate-portfolio-manifest.js` writes `assets/data/portfolio.json`.
4. `npm run build` copies `assets/` and `pages/` to `dist/`.
5. `portfolio.html` downloads only `portfolio.json` and album cover thumbnails.
6. `portfolio-album.html?id=...` downloads only the first 5 original images for that album.
7. Each click on `继续加载 5 张` appends the next image batch.

## Error Handling

Album detail page behavior:

- Missing `id`: show `没有指定相册。` and link back to `portfolio.html`.
- Unknown `id`: show `没有找到这个相册。` and link back to `portfolio.html`.
- Manifest fetch failure: show `相册加载失败，请稍后重试。`.
- Empty album: show `这个相册暂时没有图片。`.

Thumbnail generation behavior:

- Missing original image directory should fail with a clear error.
- Unsupported files are ignored.
- Existing thumbnails may be overwritten to keep output deterministic.

## Testing

Add or update Vitest coverage:

- Manifest contains `coverThumb` for each album.
- `coverThumb` points to an existing file after thumbnail generation.
- The portfolio list renderer uses `coverThumb`, not every `album.images` item.
- Batch helper returns the first 5 images, then the next 5 images.
- Detail page handles missing or unknown album ids.

Manual verification:

- Run `npm test`.
- Run `npm run build`.
- Open `pages/portfolio.html` locally and verify the photography list loads only cover thumbnails.
- Open `pages/portfolio-album.html?id=fgo-nero` and verify original images load in batches of 5.

## Performance Notes

This design improves performance in two ways:

- The list page downloads small WebP thumbnails instead of original photos.
- The detail page delays original image downloads until the user opens an album and requests more images.

Future optimization, if the image library grows much larger:

- Generate responsive thumbnail sizes such as `320w`, `480w`, and `720w`.
- Add `srcset` for cover images.
- Consider paginating albums if there are hundreds of albums.

## Out of Scope

- Image editing or compression of original files.
- Cloud image CDN integration.
- Authentication or private gallery access.
- Drag-and-drop image upload UI.
- Replacing GitHub as the image storage location.
