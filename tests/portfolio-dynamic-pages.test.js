import { describe, expect, test } from "vitest";

import { dynamic as portfolioDynamic } from "../app/portfolio/page.jsx";
import { dynamic as roleDynamic, generateMetadata as generateRoleMetadata } from "../app/portfolio/role/[roleId]/page.jsx";
import { dynamic as workDynamic, generateMetadata as generateWorkMetadata } from "../app/portfolio/work/[workId]/page.jsx";
import { getMergedPortfolioData } from "../lib/server/portfolio-admin.js";
import manifest from "../public/assets/data/portfolio.json";

function createPortfolioEnv() {
  const responses = [
    { results: [{ id: 99, title: "Cloud Work", slug: "cloud-work", cover_image_id: null, sort_order: 1 }] },
    { results: [{ id: 100, work_id: 99, title: "Cloud Role", slug: "cloud-role", cover_image_id: 101, sort_order: 1 }] },
    {
      results: [
        {
          id: 101,
          work_id: 99,
          role_id: 100,
          secure_url: "https://res.cloudinary.com/di76171b0/image/upload/v1/webtest/portfolio/cloud-work/cloud-role/cloud-role_1.png",
          cover_thumb_url: "https://res.cloudinary.com/di76171b0/image/upload/c_fill,w_480,f_webp,q_auto/webtest/portfolio/cloud-work/cloud-role/cloud-role_1.webp",
          alt: "Cloud Work Cloud Role 1",
          sort_order: 1
        }
      ]
    },
    {
      results: [
        {
          id: 201,
          static_work_id: "fgo",
          static_role_id: "fgo-nero",
          secure_url: "https://res.cloudinary.com/di76171b0/image/upload/v1/webtest/portfolio/fgo/nero/nero_5.png",
          cover_thumb_url: "https://res.cloudinary.com/di76171b0/image/upload/c_fill,w_480,f_webp,q_auto/webtest/portfolio/fgo/nero/nero_5.webp",
          alt: "FGO Nero 5",
          sort_order: 5
        },
        {
          id: 203,
          static_work_id: "fgo",
          static_role_id: "fgo-caster",
          secure_url: "https://res.cloudinary.com/di76171b0/image/upload/v1/webtest/portfolio/fgo/caster/caster_1.png",
          cover_thumb_url: "https://res.cloudinary.com/di76171b0/image/upload/c_fill,w_480,f_webp,q_auto/webtest/portfolio/fgo/caster/caster_1.webp",
          alt: "FGO Caster 1",
          sort_order: 1
        }
      ]
    },
    {
      results: [
        {
          id: 202,
          static_work_id: "fgo",
          slug: "caster",
          title: "Caster",
          sort_order: 2
        }
      ]
    },
    {
      results: [
        {
          target_type: "work",
          target_id: "fgo",
          image_id: 201
        }
      ]
    }
  ];

  return {
    DB: {
      prepare() {
        return {
          async all() {
            return responses.shift() || { results: [] };
          }
        };
      }
    }
  };
}

describe("portfolio dynamic pages", () => {
  test("portfolio pages are forced dynamic for D1-backed data", () => {
    expect(portfolioDynamic).toBe("force-dynamic");
    expect(workDynamic).toBe("force-dynamic");
    expect(roleDynamic).toBe("force-dynamic");
  });

  test("reads async work params when generating metadata", async () => {
    const metadata = await generateWorkMetadata({
      params: Promise.resolve({ workId: "fgo" })
    });

    expect(metadata.title).toBe("FGO - DigitalSheep's Space");
  });

  test("reads async role params when generating metadata", async () => {
    const metadata = await generateRoleMetadata({
      params: Promise.resolve({ roleId: "fgo-nero" })
    });

    expect(metadata.title).toBe("FGO · Nero - DigitalSheep's Space");
  });

  test("merges static and D1 portfolio rows for public pages", async () => {
    const merged = await getMergedPortfolioData(createPortfolioEnv(), manifest);
    const fgo = merged.photographyWorks.find((work) => work.id === "fgo");
    const nero = fgo.roles.find((role) => role.id === "fgo-nero");

    expect(merged.photographyWorks.some((work) => work.id === "fgo")).toBe(true);
    expect(merged.photographyWorks.some((work) => work.id === "cloud-work")).toBe(true);
    expect(merged.photographyWorks.find((work) => work.id === "cloud-work").coverThumb).toContain("cloud-role_1.webp");
    expect(fgo.coverThumb).toContain("nero_5.webp");
    expect(nero.images.at(-1).src).toContain("nero_5.png");
    expect(fgo.roles.some((role) => role.id === "fgo-caster")).toBe(true);
    expect(fgo.roles.find((role) => role.id === "fgo-caster").imageCount).toBe(1);
  });

  test("does not swallow D1 query errors in merged portfolio helper", async () => {
    await expect(
      getMergedPortfolioData(
        {
          DB: {
            prepare() {
              return {
                async all() {
                  throw new Error("D1 failed");
                }
              };
            }
          }
        },
        manifest
      )
    ).rejects.toThrow("D1 failed");
  });
});
