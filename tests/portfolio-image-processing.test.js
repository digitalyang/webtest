import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, test } from "vitest";
import { COMPRESSION_TARGET_BYTES } from "../lib/portfolio-compression-policy.js";
import { prepareLocalImageForUpload } from "../lib/portfolio-image-processing.js";

const tempFiles = [];

async function writeJpeg(filePath, width, height, quality = 80) {
  const buffer = await sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 100, b: 50 } }
  })
    .jpeg({ quality })
    .toBuffer();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
  tempFiles.push(filePath);
  return filePath;
}

afterEach(() => {
  for (const filePath of tempFiles.splice(0)) {
    fs.rmSync(filePath, { force: true });
  }
});

describe("prepareLocalImageForUpload", () => {
  test("returns original bytes for files at or below 9.5MB", async () => {
    const filePath = path.join(os.tmpdir(), `small-${Date.now()}.jpg`);
    await writeJpeg(filePath, 800, 600, 80);
    const original = fs.readFileSync(filePath);

    const result = await prepareLocalImageForUpload(filePath);

    expect(result.wasCompressed).toBe(false);
    expect(result.mimeType).toMatch(/jpe?g/);
    expect(Buffer.compare(result.buffer, original)).toBe(0);
  });

  test("compresses oversized files to webp under the target", async () => {
    const filePath = path.join(os.tmpdir(), `large-${Date.now()}.png`);
    const width = 2400;
    const height = 2400;
    const raw = Buffer.alloc(width * height * 3);
    for (let index = 0; index < raw.length; index += 1) {
      raw[index] = index % 256;
    }
    const buffer = await sharp(raw, { raw: { width, height, channels: 3 } })
      .png({ compressionLevel: 0 })
      .toBuffer();
    fs.writeFileSync(filePath, buffer);
    tempFiles.push(filePath);
    expect(buffer.length).toBeGreaterThan(COMPRESSION_TARGET_BYTES);

    const result = await prepareLocalImageForUpload(filePath);

    expect(result.wasCompressed).toBe(true);
    expect(result.mimeType).toBe("image/webp");
    expect(result.buffer.length).toBeLessThanOrEqual(COMPRESSION_TARGET_BYTES);
    expect(result.filename.endsWith(".webp")).toBe(true);
  }, 30_000);
});
