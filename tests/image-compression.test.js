import { afterEach, describe, expect, test, vi } from "vitest";

import {
  COMPRESSION_TARGET_BYTES,
  calculateUploadProgress,
  fileNeedsCompression,
  formatFileSize,
  getCompressedWebpFilename,
  prepareImageForUpload
} from "../lib/client/image-compression.js";

function makeFile(name, size, type = "image/png") {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", {
    value: size
  });
  return file;
}

describe("image compression helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("formats file sizes for upload messages", () => {
    expect(formatFileSize(512)).toBe("512B");
    expect(formatFileSize(2048)).toBe("2.0KB");
    expect(formatFileSize(20_409_885)).toBe("19.5MB");
  });

  test("detects files above the 9.5MB compression target", () => {
    expect(COMPRESSION_TARGET_BYTES).toBe(Math.floor(9.5 * 1024 * 1024));
    expect(fileNeedsCompression(makeFile("small.png", COMPRESSION_TARGET_BYTES))).toBe(false);
    expect(fileNeedsCompression(makeFile("large.png", COMPRESSION_TARGET_BYTES + 1))).toBe(true);
  });

  test("creates webp filenames without changing public ids", () => {
    expect(getCompressedWebpFilename("nina-large.png")).toBe("nina-large.webp");
    expect(getCompressedWebpFilename("nina")).toBe("nina.webp");
  });

  test("calculates deterministic upload progress by phase", () => {
    expect(calculateUploadProgress("plan", 0, 4)).toBe(5);
    expect(calculateUploadProgress("compress", 2, 4)).toBe(23);
    expect(calculateUploadProgress("upload", 2, 4)).toBe(65);
    expect(calculateUploadProgress("save", 0, 4)).toBe(95);
    expect(calculateUploadProgress("complete", 0, 4)).toBe(100);
  });

  test("returns small files unchanged without using canvas APIs", async () => {
    const file = makeFile("small.png", 1024);
    const result = await prepareImageForUpload(file);

    expect(result.file).toBe(file);
    expect(result.wasCompressed).toBe(false);
    expect(result.message).toBe("");
  });

  test("compresses oversized files to webp with browser encoders", async () => {
    const original = makeFile("large.png", COMPRESSION_TARGET_BYTES + 1);
    const compressed = makeFile("large.webp", COMPRESSION_TARGET_BYTES - 1024, "image/webp");
    const drawImage = vi.fn();
    const close = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toBlob: (callback, type, quality) => {
        callback(compressed);
      }
    };

    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({
      width: 2000,
      height: 1000,
      close
    })));
    vi.stubGlobal("document", {
      createElement: () => canvas
    });

    const result = await prepareImageForUpload(original);

    expect(result.wasCompressed).toBe(true);
    expect(result.file.name).toBe("large.webp");
    expect(result.file.type).toBe("image/webp");
    expect(result.file.size).toBe(COMPRESSION_TARGET_BYTES - 1024);
    expect(result.message).toContain("large.png 已压缩");
    expect(globalThis.createImageBitmap).toHaveBeenCalledWith(original);
    expect(drawImage).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });

  test("throws a clear error when webp encoding is unsupported", async () => {
    const original = makeFile("fallback.png", COMPRESSION_TARGET_BYTES + 1);
    const pngBlob = makeFile("fallback.png", COMPRESSION_TARGET_BYTES - 1024, "image/png");
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: vi.fn() }),
      toBlob: (callback) => callback(pngBlob)
    };

    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({
      width: 2000,
      height: 1000,
      close: vi.fn()
    })));
    vi.stubGlobal("document", {
      createElement: () => canvas
    });

    await expect(prepareImageForUpload(original)).rejects.toThrow("当前浏览器不支持 WebP 自动压缩");
    await expect(prepareImageForUpload(original)).rejects.toThrow("请先手动压缩图片到 9.5MB 以下");
  });

  test("throws a clear error when the browser cannot read the image", async () => {
    const original = makeFile("broken.png", COMPRESSION_TARGET_BYTES + 1);

    vi.stubGlobal("createImageBitmap", vi.fn(async () => {
      throw new Error("The source image could not be decoded.");
    }));
    vi.stubGlobal("document", {
      createElement: vi.fn()
    });

    await expect(prepareImageForUpload(original)).rejects.toThrow("当前浏览器无法读取 broken.png");
    await expect(prepareImageForUpload(original)).rejects.toThrow("请先手动压缩图片到 9.5MB 以下");
  });

  test("throws a clear error when compression cannot reach the target size", async () => {
    const original = makeFile("too-large.png", COMPRESSION_TARGET_BYTES + 1);
    const stillLarge = makeFile("too-large.webp", COMPRESSION_TARGET_BYTES + 1, "image/webp");
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: vi.fn() }),
      toBlob: (callback) => callback(stillLarge)
    };

    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({
      width: 2000,
      height: 1000,
      close: vi.fn()
    })));
    vi.stubGlobal("document", {
      createElement: () => canvas
    });

    await expect(prepareImageForUpload(original)).rejects.toThrow("too-large.png 压缩后仍超过 9.5MB");
  });
});
