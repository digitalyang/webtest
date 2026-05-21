export const COMPRESSION_TARGET_BYTES = Math.floor(9.5 * 1024 * 1024);

const START_QUALITY = 0.9;
const MIN_QUALITY = 0.6;
const QUALITY_STEP = 0.1;
const START_SCALE = 1;
const MIN_SCALE = 0.5;
const SCALE_STEP = 0.85;
const WEBP_TYPE = "image/webp";

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export function fileNeedsCompression(file) {
  return file.size > COMPRESSION_TARGET_BYTES;
}

export function getCompressedWebpFilename(filename) {
  return `${String(filename || "upload").replace(/\.[^/.]+$/, "")}.webp`;
}

export function calculateUploadProgress(phase, completedFiles = 0, totalFiles = 1) {
  const safeTotal = Math.max(1, totalFiles);
  const safeCompleted = Math.min(Math.max(0, completedFiles), safeTotal);
  const ratios = {
    plan: 5,
    compress: 5 + (safeCompleted / safeTotal) * 35,
    upload: 40 + (safeCompleted / safeTotal) * 50,
    save: 95,
    complete: 100
  };

  return Math.round(ratios[phase] ?? 0);
}

export async function prepareImageForUpload(file) {
  if (!fileNeedsCompression(file)) {
    return {
      file,
      wasCompressed: false,
      message: ""
    };
  }

  if (typeof document === "undefined") {
    throw new Error("当前浏览器不支持自动压缩，请先手动压缩图片到 9.5MB 以下。");
  }

  const bitmap = await loadImageBitmap(file);
  try {
    const compressedBlob = await compressBitmapToTarget(bitmap, file.name);
    const compressedFile =
      compressedBlob instanceof File
        ? compressedBlob
        : new File([compressedBlob], getCompressedWebpFilename(file.name), {
            type: WEBP_TYPE,
            lastModified: file.lastModified || Date.now()
          });

    return {
      file: compressedFile,
      wasCompressed: true,
      message: `${file.name} 已压缩：${formatFileSize(file.size)} -> ${formatFileSize(compressedFile.size)}`
    };
  } finally {
    bitmap.close?.();
  }
}

async function loadImageBitmap(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      throw new Error(`当前浏览器无法读取 ${file.name}，请先手动压缩图片到 9.5MB 以下。`);
    }
  }

  throw new Error("当前浏览器不支持自动压缩，请先手动压缩图片到 9.5MB 以下。");
}

async function compressBitmapToTarget(bitmap, filename) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context || typeof canvas.toBlob !== "function") {
    throw new Error("当前浏览器不支持自动压缩，请先手动压缩图片到 9.5MB 以下。");
  }

  for (let scale = START_SCALE; scale >= MIN_SCALE; scale *= SCALE_STEP) {
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    for (let quality = START_QUALITY; quality >= MIN_QUALITY; quality -= QUALITY_STEP) {
      const blob = await canvasToBlob(canvas, WEBP_TYPE, Number(quality.toFixed(2)));
      if (blob.size <= COMPRESSION_TARGET_BYTES) {
        return blob;
      }
    }
  }

  throw new Error(`${filename} 压缩后仍超过 9.5MB，请手动缩小分辨率后再上传。`);
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("当前浏览器不支持自动压缩，请先手动压缩图片到 9.5MB 以下。"));
        return;
      }

      resolve(blob);
    }, type, quality);
  });
}
