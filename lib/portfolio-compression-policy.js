export const COMPRESSION_TARGET_BYTES = Math.floor(9.5 * 1024 * 1024);
export const START_QUALITY = 0.9;
export const MIN_QUALITY = 0.6;
export const QUALITY_STEP = 0.1;
export const START_SCALE = 1;
export const MIN_SCALE = 0.5;
export const SCALE_STEP = 0.85;
export const WEBP_MIME = "image/webp";

export function fileNeedsCompressionFromBytes(bytes) {
  return bytes > COMPRESSION_TARGET_BYTES;
}
