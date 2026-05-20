import { describe, expect, test } from "vitest";
import fs from "fs";
import path from "path";

import { resolveImageSrc, groupAlbumsByCategory } from "../assets/js/portfolio.js";

const manifestPath = path.join(process.cwd(), "assets/data/portfolio.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

describe("portfolio manifest", () => {
  test("every photography image file exists on disk", () => {
    for (const album of manifest.albums.filter((a) => a.category === "photography")) {
      for (const image of album.images) {
        expect(fs.existsSync(path.join(process.cwd(), image.src))).toBe(true);
      }
    }
  });

  test("resolveImageSrc prefixes pages/ correctly", () => {
    expect(resolveImageSrc("assets/images/FGO/Nero/Nero_1.jpeg")).toBe(
      "../assets/images/FGO/Nero/Nero_1.jpeg"
    );
  });

  test("groupAlbumsByCategory buckets albums", () => {
    const grouped = groupAlbumsByCategory(manifest.albums);
    expect(grouped.photography.length).toBeGreaterThan(0);
    expect(grouped.drawing ?? []).toHaveLength(0);
  });
});
