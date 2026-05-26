import { describe, expect, test } from "vitest";
import {
  filterGalleryStaticImages,
  isStaticCoverOnlyImage
} from "../lib/portfolio-static-images.js";

describe("portfolio static images", () => {
  test("detects portfolio-covers public ids", () => {
    expect(isStaticCoverOnlyImage({
      cloudinary_public_id: "webtest/portfolio-covers/hok/daji/daji_1"
    })).toBe(true);
    expect(isStaticCoverOnlyImage({
      cloudinary_public_id: "webtest/portfolio/hok/daji/daji_1"
    })).toBe(false);
    expect(isStaticCoverOnlyImage({})).toBe(false);
  });

  test("filterGalleryStaticImages removes cover-only rows", () => {
    const images = [
      { id: 1, cloudinary_public_id: "webtest/portfolio/hok/daji/daji_1" },
      { id: 2, cloudinary_public_id: "webtest/portfolio-covers/hok/daji/daji_1" }
    ];
    expect(filterGalleryStaticImages(images)).toEqual([images[0]]);
    expect(filterGalleryStaticImages(null)).toEqual([]);
  });
});
