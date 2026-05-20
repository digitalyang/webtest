import { describe, expect, test } from "vitest";
import fs from "fs";
import path from "path";

const manifestPath = path.join(process.cwd(), "public/assets/data/portfolio.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

function publicAssetPath(assetPath) {
  return path.join(process.cwd(), "public", assetPath);
}

describe("portfolio manifest", () => {
  test("groups photography into works and roles", () => {
    expect(Array.isArray(manifest.photographyWorks)).toBe(true);
    const hok = manifest.photographyWorks.find((work) => work.id === "hok");

    expect(hok.title).toBe("HOK");
    expect(hok.roles.map((role) => role.id)).toEqual(["hok-daji", "hok-haiyue"]);
    expect(hok.coverThumb).toBe(hok.roles[0].coverThumb);
  });

  test("every role image and thumbnail exists on disk", () => {
    for (const work of manifest.photographyWorks) {
      expect(fs.existsSync(publicAssetPath(work.coverThumb))).toBe(true);
      for (const role of work.roles) {
        expect(fs.existsSync(publicAssetPath(role.coverThumb))).toBe(true);
        for (const image of role.images) {
          expect(image.src).not.toContain(".thumb.");
          expect(fs.existsSync(publicAssetPath(image.src))).toBe(true);
        }
      }
    }
  });

  test("does not include duplicate wechat file names", () => {
    const serialized = JSON.stringify(manifest);
    expect(serialized).not.toContain("webwxgetmsgimg");
    expect(serialized).not.toContain("_cgi-bin");
  });

  test("single-level folders become one-role works", () => {
    const lolita = manifest.photographyWorks.find((work) => work.id === "lolita");

    expect(lolita.roles).toHaveLength(1);
    expect(lolita.roles[0].id).toBe("lolita-lolita");
    expect(lolita.roles[0].title).toBe("Lolita");
  });
});
