import { describe, expect, test } from "vitest";

import {
  buildCloudinaryCoverUrl,
  buildImageUploadPlan,
  isValidPortfolioSlug,
  mergePortfolioData,
  normalizeDynamicPortfolio,
  resolveCoverImage,
  validateCloudinaryUpload
} from "../lib/portfolio-admin.js";

describe("portfolio admin helper functions", () => {
  test("validates URL-safe lowercase slugs", () => {
    expect(isValidPortfolioSlug("nina")).toBe(true);
    expect(isValidPortfolioSlug("girlsbandcry")).toBe(true);
    expect(isValidPortfolioSlug("nina-01")).toBe(true);
    expect(isValidPortfolioSlug("Nina")).toBe(false);
    expect(isValidPortfolioSlug("灵笼")).toBe(false);
    expect(isValidPortfolioSlug("../nina")).toBe(false);
  });

  test("builds sequential Cloudinary public ids and filenames", () => {
    expect(
      buildImageUploadPlan({
        workSlug: "girlsbandcry",
        roleSlug: "nina",
        startIndex: 5,
        files: [
          { name: "A.PNG", type: "image/png" },
          { name: "B.webp", type: "image/webp" }
        ]
      })
    ).toEqual([
      {
        index: 5,
        filename: "nina_5.png",
        publicId: "webtest/portfolio/girlsbandcry/nina/nina_5"
      },
      {
        index: 6,
        filename: "nina_6.webp",
        publicId: "webtest/portfolio/girlsbandcry/nina/nina_6"
      }
    ]);
  });

  test("builds 480px webp cover URLs from Cloudinary public ids", () => {
    expect(
      buildCloudinaryCoverUrl({
        cloudName: "di76171b0",
        publicId: "webtest/portfolio/girlsbandcry/nina/nina_1"
      })
    ).toBe("https://res.cloudinary.com/di76171b0/image/upload/c_fill,w_480,f_webp,q_auto/webtest/portfolio/girlsbandcry/nina/nina_1.webp");
  });

  test("rejects upload metadata outside the configured Cloudinary cloud and folder", () => {
    expect(
      validateCloudinaryUpload({
        cloudName: "di76171b0",
        publicId: "webtest/portfolio/girlsbandcry/nina/nina_1",
        secureUrl: "https://res.cloudinary.com/di76171b0/image/upload/v1/webtest/portfolio/girlsbandcry/nina/nina_1.png"
      }).ok
    ).toBe(true);

    expect(
      validateCloudinaryUpload({
        cloudName: "di76171b0",
        publicId: "other/folder/nina_1",
        secureUrl: "https://res.cloudinary.com/di76171b0/image/upload/v1/other/folder/nina_1.png"
      }).ok
    ).toBe(false);

    expect(
      validateCloudinaryUpload({
        cloudName: "di76171b0",
        publicId: "webtest/portfolio/girlsbandcry/nina/nina_1",
        secureUrl: "https://res.cloudinary.com/other/image/upload/v1/webtest/portfolio/girlsbandcry/nina/nina_1.png"
      }).ok
    ).toBe(false);

    expect(
      validateCloudinaryUpload({
        cloudName: "di76171b0",
        publicId: "webtest/portfolio/girlsbandcry/nina/nina_1",
        secureUrl: "https://res.cloudinary.com/di76171b0/image/upload/v1/webtest/portfolio/girlsbandcry/nina/nina_2.png"
      }).ok
    ).toBe(false);

    expect(
      validateCloudinaryUpload({
        cloudName: "di76171b0",
        publicId: "webtest/portfolio/girlsbandcry/nina/nina_1",
        secureUrl: "https://res.cloudinary.com/di76171b0/image/upload/v1/tmp/webtest/portfolio/girlsbandcry/nina/nina_1.png"
      }).ok
    ).toBe(false);
  });

  test("resolves explicit covers and falls back to first visible image", () => {
    const images = [
      { id: 1, coverThumb: "hidden.webp", isHidden: true },
      { id: 2, coverThumb: "first.webp", isHidden: false },
      { id: 3, coverThumb: "selected.webp", isHidden: false }
    ];

    expect(resolveCoverImage(images, 3).coverThumb).toBe("selected.webp");
    expect(resolveCoverImage(images, 1).coverThumb).toBe("first.webp");
    expect(resolveCoverImage(images).coverThumb).toBe("first.webp");
  });

  test("normalizes D1 rows into public portfolio work shape", () => {
    const dynamic = normalizeDynamicPortfolio({
      works: [{ id: 10, title: "GirlsBandCry", slug: "gbc", cover_image_id: null, sort_order: 1 }],
      roles: [{ id: 20, work_id: 10, title: "Nina", slug: "nina", cover_image_id: 30, sort_order: 1 }],
      images: [
        {
          id: 30,
          work_id: 10,
          role_id: 20,
          secure_url: "https://res.cloudinary.com/di76171b0/image/upload/v1/webtest/portfolio/gbc/nina/nina_1.png",
          cover_thumb_url: "https://res.cloudinary.com/di76171b0/image/upload/c_fill,w_480,f_webp,q_auto/webtest/portfolio/gbc/nina/nina_1.webp",
          alt: "GirlsBandCry Nina 1",
          sort_order: 1
        }
      ]
    });

    expect(dynamic.photographyWorks[0].id).toBe("gbc");
    expect(dynamic.photographyWorks[0].coverThumb).toContain("nina_1.webp");
    expect(dynamic.photographyWorks[0].roles[0].images[0].src).toContain("nina_1.png");
  });

  test("excludes visible D1 works and roles without visible images", () => {
    const dynamic = normalizeDynamicPortfolio({
      works: [
        { id: 10, title: "Empty Work", slug: "empty", cover_image_id: null, sort_order: 1 },
        { id: 11, title: "GirlsBandCry", slug: "gbc", cover_image_id: null, sort_order: 2 }
      ],
      roles: [
        { id: 20, work_id: 10, title: "Empty Role", slug: "empty-role", cover_image_id: null, sort_order: 1 },
        { id: 21, work_id: 11, title: "Nina", slug: "nina", cover_image_id: null, sort_order: 1 },
        { id: 22, work_id: 11, title: "No Images", slug: "no-images", cover_image_id: null, sort_order: 2 }
      ],
      images: [
        {
          id: 30,
          work_id: 11,
          role_id: 21,
          secure_url: "https://res.cloudinary.com/di76171b0/image/upload/v1/webtest/portfolio/gbc/nina/nina_1.png",
          cover_thumb_url: "https://res.cloudinary.com/di76171b0/image/upload/c_fill,w_480,f_webp,q_auto/webtest/portfolio/gbc/nina/nina_1.webp",
          alt: "GirlsBandCry Nina 1",
          sort_order: 1
        }
      ]
    });

    expect(dynamic.photographyWorks.map((work) => work.id)).toEqual(["gbc"]);
    expect(dynamic.photographyWorks[0].roles.map((role) => role.id)).toEqual(["gbc-nina"]);
    expect(dynamic.photographyWorks[0].imageCount).toBe(1);
  });

  test("does not use hidden role images as explicit work covers", () => {
    const dynamic = normalizeDynamicPortfolio({
      works: [{ id: 10, title: "GirlsBandCry", slug: "gbc", cover_image_id: 40, sort_order: 1 }],
      roles: [
        { id: 20, work_id: 10, title: "Nina", slug: "nina", cover_image_id: 30, sort_order: 1 },
        { id: 21, work_id: 10, title: "Hidden", slug: "hidden", cover_image_id: 40, sort_order: 2, is_hidden: 1 }
      ],
      images: [
        {
          id: 30,
          work_id: 10,
          role_id: 20,
          secure_url: "https://res.cloudinary.com/di76171b0/image/upload/v1/webtest/portfolio/gbc/nina/nina_1.png",
          cover_thumb_url: "https://res.cloudinary.com/di76171b0/image/upload/c_fill,w_480,f_webp,q_auto/webtest/portfolio/gbc/nina/nina_1.webp",
          alt: "GirlsBandCry Nina 1",
          sort_order: 1
        },
        {
          id: 40,
          work_id: 10,
          role_id: 21,
          secure_url: "https://res.cloudinary.com/di76171b0/image/upload/v1/webtest/portfolio/gbc/hidden/hidden_1.png",
          cover_thumb_url: "https://res.cloudinary.com/di76171b0/image/upload/c_fill,w_480,f_webp,q_auto/webtest/portfolio/gbc/hidden/hidden_1.webp",
          alt: "Hidden role image",
          sort_order: 1
        }
      ]
    });

    expect(dynamic.photographyWorks[0].coverThumb).toContain("nina_1.webp");
    expect(dynamic.photographyWorks[0].roles).toHaveLength(1);
  });

  test("merges static and dynamic portfolio data while rejecting duplicate ids", () => {
    const staticManifest = {
      categories: [{ id: "photography", title: "摄影" }],
      photographyWorks: [
        {
          id: "fgo",
          title: "FGO",
          roles: [{ id: "fgo-nero", title: "Nero", images: [] }],
          roleCount: 1,
          imageCount: 0
        }
      ],
      projects: []
    };
    const dynamicPortfolio = {
      photographyWorks: [{ id: "gbc", title: "GirlsBandCry", roles: [], roleCount: 0, imageCount: 0 }]
    };

    expect(mergePortfolioData(staticManifest, dynamicPortfolio).photographyWorks.map((work) => work.id)).toEqual(["fgo", "gbc"]);
    expect(() =>
      mergePortfolioData(staticManifest, {
        photographyWorks: [{ id: "fgo", title: "Duplicate", roles: [], roleCount: 0, imageCount: 0 }]
      })
    ).toThrow("Duplicate portfolio work id");
    expect(() =>
      mergePortfolioData(staticManifest, {
        photographyWorks: [
          {
            id: "new-fgo",
            title: "New FGO",
            roles: [{ id: "fgo-nero", title: "Duplicate Nero", images: [] }],
            roleCount: 1,
            imageCount: 0
          }
        ]
      })
    ).toThrow("Duplicate portfolio role id");
  });
});
