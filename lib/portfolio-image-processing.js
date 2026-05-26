import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  COMPRESSION_TARGET_BYTES,
  MIN_QUALITY,
  MIN_SCALE,
  QUALITY_STEP,
  SCALE_STEP,
  START_QUALITY,
  START_SCALE,
  WEBP_MIME,
  fileNeedsCompressionFromBytes
} from "./portfolio-compression-policy.js";

export async function prepareLocalImageForUpload(localPath) {
  const filename = path.basename(localPath);
  const original = await fs.readFile(localPath);

  if (!fileNeedsCompressionFromBytes(original.length)) {
    return {
      buffer: original,
      mimeType: mimeTypeFor(filename),
      filename,
      wasCompressed: false
    };
  }

  const metadata = await sharp(original, { failOn: "none" }).rotate().metadata();
  const baseWidth = metadata.width || 1;
  const baseHeight = metadata.height || 1;

  for (let scale = START_SCALE; scale >= MIN_SCALE; scale *= SCALE_STEP) {
    const width = Math.max(1, Math.round(baseWidth * scale));
    const height = Math.max(1, Math.round(baseHeight * scale));

    for (let quality = START_QUALITY; quality >= MIN_QUALITY; quality -= QUALITY_STEP) {
      const buffer = await sharp(original, { failOn: "none" })
        .rotate()
        .resize({ width, height, fit: "inside", withoutEnlargement: true })
        .webp({ quality: Math.round(quality * 100) })
        .toBuffer();

      if (buffer.length <= COMPRESSION_TARGET_BYTES) {
        return {
          buffer,
          mimeType: WEBP_MIME,
          filename: webpFilename(filename),
          wasCompressed: true
        };
      }
    }
  }

  throw new Error(`${filename} 压缩后仍超过 9.5MB，请手动缩小分辨率后再上传。`);
}

function webpFilename(filename) {
  return `${filename.replace(/\.[^/.]+$/, "")}.webp`;
}

function mimeTypeFor(filename) {
  const ext = path.extname(filename).slice(1).toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "application/octet-stream";
}
