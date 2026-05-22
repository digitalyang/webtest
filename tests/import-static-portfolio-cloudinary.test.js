import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, describe, expect, test } from "vitest";

const require = createRequire(import.meta.url);
const {
  buildCoverThumbUrl,
  buildImportRecords,
  buildUpsertSql,
  parseDotVars
} = require("../scripts/import-static-portfolio-cloudinary.cjs");

const tempDirs = [];

function makeTempRoot() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "portfolio-import-"));
  tempDirs.push(tempRoot);
  return tempRoot;
}

function writeImage(root, relativePath) {
  const filePath = path.join(root, "public", relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "fake image");
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("buildImportRecords", () => {
  test("maps static manifest images to Cloudinary import records", () => {
    const root = makeTempRoot();
    writeImage(root, "assets/images/GirlsBandCry/Nina/Nina_1.jpeg");
    writeImage(root, "assets/images/GirlsBandCry/Nina/Nina_2.png");

    const manifest = {
      photographyWorks: [
        {
          id: "girlsbandcry",
          roles: [
            {
              id: "girlsbandcry-nina",
              title: "Nina",
              images: [
                { src: "assets/images/GirlsBandCry/Nina/Nina_1.jpeg", alt: "GirlsBandCry Nina 1" },
                { src: "assets/images/GirlsBandCry/Nina/Nina_2.png", alt: "GirlsBandCry Nina 2" }
              ]
            }
          ]
        }
      ]
    };

    expect(buildImportRecords({ manifest, rootDir: root, cloudName: "demo" }).records).toEqual([
      {
        staticWorkId: "girlsbandcry",
        staticRoleId: "girlsbandcry-nina",
        publicId: "webtest/portfolio-covers/girlsbandcry/nina/nina_1",
        secureUrl: "https://res.cloudinary.com/demo/image/upload/v1/webtest/portfolio-covers/girlsbandcry/nina/nina_1.webp",
        coverThumbUrl: "https://res.cloudinary.com/demo/image/upload/c_fill,w_480,f_webp,q_auto/webtest/portfolio-covers/girlsbandcry/nina/nina_1.webp",
        filename: "Nina_1.jpeg",
        alt: "GirlsBandCry Nina 1",
        width: null,
        height: null,
        format: null,
        bytes: null,
        sortOrder: 1,
        localPath: path.join(root, "public/assets/images/GirlsBandCry/Nina/Nina_1.jpeg")
      },
      {
        staticWorkId: "girlsbandcry",
        staticRoleId: "girlsbandcry-nina",
        publicId: "webtest/portfolio-covers/girlsbandcry/nina/nina_2",
        secureUrl: "https://res.cloudinary.com/demo/image/upload/v1/webtest/portfolio-covers/girlsbandcry/nina/nina_2.webp",
        coverThumbUrl: "https://res.cloudinary.com/demo/image/upload/c_fill,w_480,f_webp,q_auto/webtest/portfolio-covers/girlsbandcry/nina/nina_2.webp",
        filename: "Nina_2.png",
        alt: "GirlsBandCry Nina 2",
        width: null,
        height: null,
        format: null,
        bytes: null,
        sortOrder: 2,
        localPath: path.join(root, "public/assets/images/GirlsBandCry/Nina/Nina_2.png")
      }
    ]);
  });

  test("fails on missing local files unless skipMissing is set", () => {
    const manifest = {
      photographyWorks: [
        {
          id: "fgo",
          roles: [
            {
              id: "fgo-nero",
              title: "Nero",
              images: [{ src: "assets/images/FGO/Nero/Nero_1.jpeg", alt: "FGO Nero 1" }]
            }
          ]
        }
      ]
    };

    expect(() => buildImportRecords({
      manifest,
      rootDir: makeTempRoot(),
      cloudName: "demo"
    })).toThrow("Missing local static image");

    const result = buildImportRecords({
      manifest,
      rootDir: makeTempRoot(),
      cloudName: "demo",
      skipMissing: true
    });
    expect(result.records).toEqual([]);
    expect(result.missingFiles).toHaveLength(1);
  });
});

describe("buildUpsertSql", () => {
  test("generates idempotent static image upsert SQL", () => {
    const sql = buildUpsertSql([
      {
        staticWorkId: "fgo",
        staticRoleId: "fgo-nero",
        publicId: "webtest/portfolio/fgo/nero/nero_1",
        secureUrl: "https://example.com/nero_1.jpeg",
        coverThumbUrl: "https://example.com/nero_1.webp",
        filename: "Nero_1.jpeg",
        alt: "FGO Nero 1",
        width: 1024,
        height: 768,
        format: "jpg",
        bytes: 12345,
        sortOrder: 1
      }
    ]);

    expect(sql).toContain("INSERT INTO portfolio_static_images");
    expect(sql).toContain("ON CONFLICT(cloudinary_public_id) DO UPDATE SET");
    expect(sql).toContain("'webtest/portfolio/fgo/nero/nero_1'");
    expect(sql).not.toContain("BEGIN TRANSACTION");
    expect(sql).not.toContain("COMMIT");
    expect(sql).not.toContain("SAVEPOINT");
  });
});

describe("configuration helpers", () => {
  test("parses dot vars and builds Cloudinary cover URLs", () => {
    expect(parseDotVars("CLOUDINARY_CLOUD_NAME=demo\nEMPTY=\nQUOTED=\"photoUpload\"\n")).toEqual({
      CLOUDINARY_CLOUD_NAME: "demo",
      EMPTY: "",
      QUOTED: "photoUpload"
    });
    expect(buildCoverThumbUrl("demo", "webtest/portfolio/fgo/nero/nero_1")).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_fill,w_480,f_webp,q_auto/webtest/portfolio/fgo/nero/nero_1.webp"
    );
  });
});
