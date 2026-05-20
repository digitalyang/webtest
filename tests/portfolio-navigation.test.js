import { describe, expect, test } from "vitest";

import {
  findRoleById,
  findWorkById,
  getImageBatch,
  getRoleHref,
  getWorkHref,
  resolveImageSrc,
  renderPhotographyWorks,
  renderWorkRoles,
  renderRoleImages
} from "../lib/portfolio.js";

describe("portfolio navigation", () => {
  test("resolves page-relative asset paths", () => {
    expect(resolveImageSrc("assets/images/HOK/Daji/Daji_1.thumb.webp")).toBe(
      "/assets/images/HOK/Daji/Daji_1.thumb.webp"
    );
  });

  test("creates work detail links", () => {
    expect(getWorkHref("hok")).toBe("/portfolio/work/hok");
  });

  test("renders only one cover image per work", () => {
    const html = renderPhotographyWorks([
      {
        id: "hok",
        title: "HOK",
        coverThumb: "assets/images/HOK/Daji/Daji_1.thumb.webp",
        roleCount: 2,
        imageCount: 7,
        roles: [
          {
            id: "hok-daji",
            coverThumb: "assets/images/HOK/Daji/Daji_1.thumb.webp",
            images: [
              { src: "assets/images/HOK/Daji/Daji_1.jpeg", alt: "HOK Daji 1" },
              { src: "assets/images/HOK/Daji/Daji_2.jpeg", alt: "HOK Daji 2" }
            ]
          }
        ]
      }
    ]);

    expect(html.match(/<img/g)).toHaveLength(1);
    expect(html).toContain("Daji_1.thumb.webp");
    expect(html).not.toContain("Daji_2.jpeg");
    expect(html).toContain("/portfolio/work/hok");
  });
});

describe("portfolio work page", () => {
  const manifest = {
    photographyWorks: [
      {
        id: "hok",
        title: "HOK",
        roles: [
          {
            id: "hok-daji",
            title: "Daji",
            coverThumb: "assets/images/HOK/Daji/Daji_1.thumb.webp",
            imageCount: 4,
            images: [{ src: "assets/images/HOK/Daji/Daji_1.jpeg", alt: "HOK Daji 1" }]
          }
        ]
      }
    ]
  };

  test("finds a work by id", () => {
    expect(findWorkById(manifest, "hok").title).toBe("HOK");
    expect(findWorkById(manifest, "missing")).toBeUndefined();
  });

  test("creates role detail links", () => {
    expect(getRoleHref("hok-daji")).toBe("/portfolio/role/hok-daji");
  });

  test("renders role covers only", () => {
    const html = renderWorkRoles(manifest.photographyWorks[0]);

    expect(html).toContain("Daji_1.thumb.webp");
    expect(html).not.toContain("Daji_1.jpeg");
    expect(html).toContain("/portfolio/role/hok-daji");
    expect(html).toContain("4 张图片");
  });
});

describe("portfolio role page", () => {
  const images = Array.from({ length: 12 }, (_, index) => ({
    src: `assets/images/HOK/Daji/Daji_${index + 1}.jpeg`,
    alt: `HOK Daji ${index + 1}`
  }));

  const manifest = {
    photographyWorks: [
      {
        id: "hok",
        title: "HOK",
        roles: [{ id: "hok-daji", title: "Daji", images }]
      }
    ]
  };

  test("finds role with parent work", () => {
    const result = findRoleById(manifest, "hok-daji");

    expect(result.work.title).toBe("HOK");
    expect(result.role.title).toBe("Daji");
    expect(findRoleById(manifest, "missing")).toBeUndefined();
  });

  test("returns image batches of five", () => {
    expect(getImageBatch(images, 0, 5)).toHaveLength(5);
    expect(getImageBatch(images, 5, 5)[0].alt).toBe("HOK Daji 6");
    expect(getImageBatch(images, 10, 5)).toHaveLength(2);
  });

  test("renders jpeg images only", () => {
    const html = renderRoleImages(getImageBatch(images, 0, 5));

    expect(html.match(/<img/g)).toHaveLength(5);
    expect(html).toContain("Daji_1.jpeg");
    expect(html).not.toContain(".thumb.webp");
  });
});
