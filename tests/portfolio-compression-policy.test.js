import { describe, expect, test } from "vitest";
import {
  COMPRESSION_TARGET_BYTES,
  MIN_QUALITY,
  MIN_SCALE,
  QUALITY_STEP,
  SCALE_STEP,
  START_QUALITY,
  START_SCALE,
  fileNeedsCompressionFromBytes
} from "../lib/portfolio-compression-policy.js";

describe("portfolio compression policy", () => {
  test("matches append upload constants", () => {
    expect(COMPRESSION_TARGET_BYTES).toBe(Math.floor(9.5 * 1024 * 1024));
    expect(START_QUALITY).toBe(0.9);
    expect(MIN_QUALITY).toBe(0.6);
    expect(QUALITY_STEP).toBe(0.1);
    expect(START_SCALE).toBe(1);
    expect(MIN_SCALE).toBe(0.5);
    expect(SCALE_STEP).toBe(0.85);
  });

  test("detects byte sizes above the compression target", () => {
    expect(fileNeedsCompressionFromBytes(COMPRESSION_TARGET_BYTES)).toBe(false);
    expect(fileNeedsCompressionFromBytes(COMPRESSION_TARGET_BYTES + 1)).toBe(true);
  });
});
