import { describe, expect, test, vi } from "vitest";

import {
  createPortfolioWork,
  createPortfolioRole,
  getDynamicPortfolioRows,
  getNextImageIndex,
  handleCreateImagesRequest,
  handleImageUploadPlanRequest,
  savePortfolioImages,
  setPortfolioCover,
  updatePortfolioVisibility
} from "../lib/server/portfolio-admin.js";
import {
  clearAdminSessionCookie,
  createAdminSessionCookie,
  createAdminSessionValue,
  hashAdminPassword,
  isValidAdminSession,
  requireAdminSession,
  verifyAdminLogin
} from "../lib/server/admin-auth.js";

const sessionRouteContext = vi.hoisted(() => ({ env: {} }));

vi.mock("../lib/server/cloudflare", () => ({
  getRequestContext: () => ({ env: sessionRouteContext.env })
}));

function createEnv(responses = [], { batch = true } = {}) {
  const calls = [];
  const DB = {
    prepare(sql) {
      let hasBoundValues = false;

      const statement = {
        bind(...values) {
          hasBoundValues = true;
          calls.push({ sql, values });
          return statement;
        },
        async all() {
          if (!hasBoundValues) {
            calls.push({ sql, values: [] });
          }
          return responses.shift() || { results: [] };
        },
        async first() {
          return responses.shift();
        },
        async run() {
          return responses.shift() || { success: true };
        }
      };

      return statement;
    }
  };

  if (batch) {
    DB.batch = async (statements) => {
      calls.push({ batchSize: statements.length });
      return responses.shift() || statements.map(() => ({ success: true }));
    };
  }

  return {
    calls,
    DB
  };
}

function createStaticManifest(imageCount = 4) {
  return {
    photographyWorks: [
      {
        id: "girlsbandcry",
        roles: [
          {
            id: "girlsbandcry-nina",
            images: Array.from({ length: imageCount }, (_, index) => ({
              src: `assets/images/GirlsBandCry/Nina/Nina_${index + 1}.jpeg`,
              alt: `GirlsBandCry Nina ${index + 1}`
            }))
          }
        ]
      }
    ]
  };
}

describe("portfolio admin D1 helpers", () => {
  test("creates a work after rejecting invalid slugs", async () => {
    const env = createEnv([{ id: 1, title: "GirlsBandCry", slug: "girlsbandcry" }]);

    await expect(createPortfolioWork(env, { title: "Bad", slug: "Bad Slug" }, [])).rejects.toThrow("Invalid work slug");
    await expect(createPortfolioWork(env, { title: "FGO", slug: "fgo" }, ["fgo"])).rejects.toThrow("conflicts with an existing static work");

    const result = await createPortfolioWork(env, { title: "GirlsBandCry", slug: "girlsbandcry" }, ["fgo"]);
    expect(result.slug).toBe("girlsbandcry");
    expect(env.calls.at(-1).sql).toContain("INSERT INTO portfolio_works");
  });

  test("creates a role under an existing work", async () => {
    const env = createEnv([{ id: 2, work_id: 1, title: "Nina", slug: "nina" }]);

    await expect(createPortfolioRole(env, { workId: 1, title: "Bad", slug: "Bad Slug" })).rejects.toThrow("Invalid role slug");

    const result = await createPortfolioRole(env, { workId: 1, title: "Nina", slug: "nina" });
    expect(result.slug).toBe("nina");
    expect(env.calls.at(-1).values).toEqual([1, "Nina", "nina"]);
  });

  test("gets the next image index for a role", async () => {
    const env = createEnv([{ max_order: 4 }]);
    await expect(getNextImageIndex(env, 9)).resolves.toBe(5);
    expect(env.calls[0].values).toEqual([9]);
  });

  test("saves uploaded image metadata", async () => {
    const env = createEnv();
    await expect(savePortfolioImages(env, {
      workId: 1,
      roleId: 2,
      images: [
        {
          publicId: "webtest/portfolio/gbc/nina/nina_1",
          secureUrl: "https://res.cloudinary.com/di76171b0/image/upload/v1/webtest/portfolio/gbc/nina/nina_1.png",
          coverThumbUrl: "https://res.cloudinary.com/di76171b0/image/upload/c_fill,w_480,f_webp,q_auto/webtest/portfolio/gbc/nina/nina_1.webp",
          filename: "nina_1.png",
          alt: "GirlsBandCry Nina 1",
          width: 100,
          height: 200,
          format: "png",
          bytes: 123,
          sortOrder: 1
        },
        {
          publicId: "webtest/portfolio/gbc/nina/nina_2",
          secureUrl: "https://res.cloudinary.com/di76171b0/image/upload/v1/webtest/portfolio/gbc/nina/nina_2.png",
          coverThumbUrl: "https://res.cloudinary.com/di76171b0/image/upload/c_fill,w_480,f_webp,q_auto/webtest/portfolio/gbc/nina/nina_2.webp",
          filename: "nina_2.png",
          alt: "GirlsBandCry Nina 2",
          width: 120,
          height: 220,
          format: "png",
          bytes: 456,
          sortOrder: 2
        }
      ]
    })).resolves.toEqual({ count: 2 });

    expect(env.calls[0].sql).toContain("INSERT INTO portfolio_images");
    expect(env.calls[0].values[0]).toBe(1);
    expect(env.calls[0].values[1]).toBe(2);
    expect(env.calls).toContainEqual({ batchSize: 2 });
  });

  test("validates all uploaded image metadata before writing", async () => {
    const env = createEnv();

    await expect(
      savePortfolioImages(env, {
        workId: 1,
        roleId: 2,
        images: [{ secureUrl: "https://example.com/a.png", coverThumbUrl: "thumb.webp", filename: "nina_1.png", alt: "Nina", sortOrder: 1 }]
      })
    ).rejects.toThrow("Image publicId is required");

    expect(env.calls).toEqual([]);
  });

  test("returns zero without writing when no images are provided", async () => {
    const env = createEnv();
    await expect(savePortfolioImages(env, { workId: 1, roleId: 2, images: [] })).resolves.toEqual({ count: 0 });
    expect(env.calls).toEqual([]);
  });

  test("sets covers and visibility flags", async () => {
    const env = createEnv([{ success: true }, { success: true }]);

    await setPortfolioCover(env, { targetType: "role", targetId: 2, imageId: 9 });
    expect(env.calls[0].sql).toContain("UPDATE portfolio_roles");
    expect(env.calls[0].values).toEqual([9, 2]);

    await updatePortfolioVisibility(env, { targetType: "image", targetId: 9, isHidden: true });
    expect(env.calls[1].sql).toContain("UPDATE portfolio_images");
    expect(env.calls[1].values).toEqual([1, 9]);
  });

  test("loads dynamic portfolio rows", async () => {
    const env = createEnv([{ results: [{ id: 1 }] }, { results: [{ id: 2 }] }, { results: [{ id: 3 }] }]);
    const rows = await getDynamicPortfolioRows(env);

    expect(rows.works).toEqual([{ id: 1 }]);
    expect(rows.roles).toEqual([{ id: 2 }]);
    expect(rows.images).toEqual([{ id: 3 }]);
    expect(env.calls.some((call) =>
      call.sql.includes("WHERE is_hidden = 0") && call.sql.includes("ORDER BY sort_order, id")
    )).toBe(true);
  });
});

describe("admin auth helpers", () => {
  test("hashes and verifies admin password without exposing the raw password", async () => {
    const hash = await hashAdminPassword("secret");
    expect(hash).not.toBe("secret");
    expect(await verifyAdminLogin({ password: "secret" }, { ADMIN_PASSWORD_HASH: hash })).toBe(true);
    expect(await verifyAdminLogin({ password: "wrong" }, { ADMIN_PASSWORD_HASH: hash })).toBe(false);
    expect(await verifyAdminLogin({ password: "secret" }, {})).toBe(false);
    expect(await verifyAdminLogin({ token: "legacy-token", password: "secret" }, { ADMIN_PASSWORD_HASH: hash })).toBe(true);
  });

  test("creates and validates short-lived session cookies", async () => {
    const env = { ADMIN_PASSWORD_HASH: await hashAdminPassword("secret") };
    const cookie = await createAdminSessionCookie(env, 1_000);
    expect(cookie).toMatch(/^portfolio_admin=/);
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Max-Age=14400");

    const value = cookie.match(/portfolio_admin=([^;]+)/)[1];
    expect(await isValidAdminSession(value, env, 1_000)).toBe(true);
    expect(await isValidAdminSession(`${value}tampered`, env, 1_000)).toBe(false);
    expect(await isValidAdminSession("bad-session", env, 1_000)).toBe(false);
  });

  test("uses the supplied time when creating session cookies", async () => {
    const env = { ADMIN_PASSWORD_HASH: await hashAdminPassword("secret") };
    const cookie = await createAdminSessionCookie(env, 1_000);
    const value = cookie.match(/portfolio_admin=([^;]+)/)[1];

    expect(value).toBe(await createAdminSessionValue(env, 1_000));
  });

  test("clears admin session cookies securely", () => {
    const cookie = clearAdminSessionCookie();
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Max-Age=0");
  });

  test("rejects expired admin sessions", async () => {
    const env = { ADMIN_PASSWORD_HASH: await hashAdminPassword("secret") };
    const value = await createAdminSessionValue(env, 1_000);
    expect(await isValidAdminSession(value, env, 1_000 + 4 * 60 * 60 * 1000 + 1)).toBe(false);
  });

  test("requires a valid admin session cookie", async () => {
    const env = { ADMIN_PASSWORD_HASH: await hashAdminPassword("secret") };
    const value = await createAdminSessionValue(env);

    expect(await requireAdminSession(new Request("https://example.com", {
      headers: {
        Cookie: `portfolio_admin=${value}`
      }
    }), env)).toBe(true);
    expect(await requireAdminSession(new Request("https://example.com", {
      headers: {
        Cookie: "portfolio_admin=bad-session"
      }
    }), env)).toBe(false);
  });
});

describe("admin session API", () => {
  test("disables caching for invalid JSON responses", async () => {
    const { POST } = await import("../app/api/admin/session/route.js");
    const response = await POST(new Request("https://example.com/api/admin/session", {
      method: "POST",
      body: "{"
    }));

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  test("disables caching for failed login responses", async () => {
    sessionRouteContext.env = {
      ADMIN_PASSWORD_HASH: await hashAdminPassword("secret")
    };
    const { POST } = await import("../app/api/admin/session/route.js");
    const response = await POST(new Request("https://example.com/api/admin/session", {
      method: "POST",
      body: JSON.stringify({ password: "wrong" })
    }));

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  test("sets a secure no-store cookie for successful logins", async () => {
    sessionRouteContext.env = {
      ADMIN_PASSWORD_HASH: await hashAdminPassword("secret")
    };
    const { POST } = await import("../app/api/admin/session/route.js");
    const response = await POST(new Request("https://example.com/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "secret" })
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Set-Cookie")).toContain("portfolio_admin=");
    expect(response.headers.get("Set-Cookie")).toContain("Secure");
  });

  test("clears the admin session with no-store headers", async () => {
    const { DELETE } = await import("../app/api/admin/session/route.js");
    const response = await DELETE();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Set-Cookie")).toContain("portfolio_admin=");
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
  });
});

describe("portfolio admin API request validation", () => {
  test("rejects portfolio admin snapshots without a session", async () => {
    const env = createEnv();
    env.ADMIN_PASSWORD_HASH = await hashAdminPassword("secret");
    sessionRouteContext.env = env;

    const { GET } = await import("../app/api/admin/portfolio/route.js");
    const response = await GET(new Request("https://example.com/api/admin/portfolio"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body.error).toBe("管理员验证失败。");
  });

  test("rejects static portfolio work slug conflicts through the real route", async () => {
    const hash = await hashAdminPassword("secret");
    const env = createEnv([{ id: 1, title: "FGO", slug: "fgo" }]);
    env.ADMIN_PASSWORD_HASH = hash;
    sessionRouteContext.env = env;
    const cookie = await createAdminSessionCookie(env);
    const { POST } = await import("../app/api/admin/portfolio/works/route.js");
    const response = await POST(new Request("https://example.com/api/admin/portfolio/works", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie
      },
      body: JSON.stringify({ title: "FGO", slug: "fgo" })
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("conflicts with an existing static work");
  });

  test("rejects image metadata without a valid admin session", async () => {
    const env = createEnv();
    const request = new Request("https://example.com/api/admin/portfolio/images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: [] })
    });

    const response = await handleCreateImagesRequest(request, env);
    expect(response.status).toBe(401);
  });

  test("rejects Cloudinary metadata outside the configured cloud", async () => {
    const hash = await hashAdminPassword("secret");
    const env = createEnv();
    env.ADMIN_PASSWORD_HASH = hash;
    env.CLOUDINARY_CLOUD_NAME = "di76171b0";
    const cookie = await createAdminSessionCookie(env);
    const request = new Request("https://example.com/api/admin/portfolio/images", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie
      },
      body: JSON.stringify({
        workId: 1,
        roleId: 2,
        images: [
          {
            publicId: "other/folder/nina_1",
            secureUrl: "https://res.cloudinary.com/other/image/upload/v1/other/folder/nina_1.png"
          }
        ]
      })
    });

    const response = await handleCreateImagesRequest(request, env);
    expect(response.status).toBe(400);
  });

  test("derives image cover thumbnails from server-side Cloudinary config", async () => {
    const hash = await hashAdminPassword("secret");
    const env = createEnv([{ work_slug: "gbc", role_slug: "nina" }]);
    env.ADMIN_PASSWORD_HASH = hash;
    env.CLOUDINARY_CLOUD_NAME = "di76171b0";
    const cookie = await createAdminSessionCookie(env);
    const request = new Request("https://example.com/api/admin/portfolio/images", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie
      },
      body: JSON.stringify({
        workId: 1,
        roleId: 2,
        images: [
          {
            publicId: "webtest/portfolio/gbc/nina/nina_1",
            secureUrl: "https://res.cloudinary.com/di76171b0/image/upload/v1/webtest/portfolio/gbc/nina/nina_1.png",
            coverThumbUrl: "client-bad.webp",
            filename: "nina_1.png",
            alt: "GirlsBandCry Nina 1",
            width: 100,
            height: 200,
            format: "png",
            bytes: 123,
            sortOrder: 1
          }
        ]
      })
    });

    const response = await handleCreateImagesRequest(request, env);
    const insertCall = env.calls.find((call) => call.sql?.includes("INSERT INTO portfolio_images"));

    expect(response.status).toBe(201);
    expect(insertCall.values[4]).toContain("c_fill,w_480,f_webp,q_auto");
    expect(insertCall.values[4]).not.toBe("client-bad.webp");
  });

  test("rejects image uploads when the role context does not exist", async () => {
    const hash = await hashAdminPassword("secret");
    const env = createEnv();
    env.ADMIN_PASSWORD_HASH = hash;
    env.CLOUDINARY_CLOUD_NAME = "di76171b0";
    const cookie = await createAdminSessionCookie(env);
    const request = new Request("https://example.com/api/admin/portfolio/images", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie
      },
      body: JSON.stringify({
        workId: 1,
        roleId: 2,
        images: [
          {
            publicId: "webtest/portfolio/gbc/nina/nina_1",
            secureUrl: "https://res.cloudinary.com/di76171b0/image/upload/v1/webtest/portfolio/gbc/nina/nina_1.png",
            coverThumbUrl: "client-bad.webp",
            filename: "nina_1.png",
            alt: "GirlsBandCry Nina 1",
            sortOrder: 1
          }
        ]
      })
    });

    const response = await handleCreateImagesRequest(request, env);

    expect(response.status).toBe(400);
    expect(env.calls.some((call) => call.sql?.includes("INSERT INTO portfolio_images"))).toBe(false);
  });

  test("rejects image public ids outside the role folder", async () => {
    const hash = await hashAdminPassword("secret");
    const env = createEnv([{ work_slug: "gbc", role_slug: "nina" }]);
    env.ADMIN_PASSWORD_HASH = hash;
    env.CLOUDINARY_CLOUD_NAME = "di76171b0";
    const cookie = await createAdminSessionCookie(env);
    const request = new Request("https://example.com/api/admin/portfolio/images", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie
      },
      body: JSON.stringify({
        workId: 1,
        roleId: 2,
        images: [
          {
            publicId: "webtest/portfolio/gbc/lucy/lucy_1",
            secureUrl: "https://res.cloudinary.com/di76171b0/image/upload/v1/webtest/portfolio/gbc/lucy/lucy_1.png",
            coverThumbUrl: "client-bad.webp",
            filename: "lucy_1.png",
            alt: "GirlsBandCry Lucy 1",
            sortOrder: 1
          }
        ]
      })
    });

    const response = await handleCreateImagesRequest(request, env);

    expect(response.status).toBe(400);
    expect(env.calls.some((call) => call.sql?.includes("INSERT INTO portfolio_images"))).toBe(false);
  });

  test("rejects nested image public ids inside the role folder", async () => {
    const hash = await hashAdminPassword("secret");
    const env = createEnv([{ work_slug: "gbc", role_slug: "nina" }]);
    env.ADMIN_PASSWORD_HASH = hash;
    env.CLOUDINARY_CLOUD_NAME = "di76171b0";
    const cookie = await createAdminSessionCookie(env);
    const request = new Request("https://example.com/api/admin/portfolio/images", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie
      },
      body: JSON.stringify({
        workId: 1,
        roleId: 2,
        images: [
          {
            publicId: "webtest/portfolio/gbc/nina/nested/nina_1",
            secureUrl: "https://res.cloudinary.com/di76171b0/image/upload/v1/webtest/portfolio/gbc/nina/nested/nina_1.png",
            coverThumbUrl: "client-bad.webp",
            filename: "nina_1.png",
            alt: "GirlsBandCry Nina 1",
            sortOrder: 1
          }
        ]
      })
    });

    const response = await handleCreateImagesRequest(request, env);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Cloudinary 上传信息无效。");
    expect(env.calls.some((call) => call.sql?.includes("INSERT INTO portfolio_images"))).toBe(false);
  });

  test("reserves upload plans for static portfolio roles", async () => {
    const hash = await hashAdminPassword("secret");
    const env = createEnv([{ max_order: 0 }]);
    env.ADMIN_PASSWORD_HASH = hash;
    env.CLOUDINARY_CLOUD_NAME = "di76171b0";
    const cookie = await createAdminSessionCookie(env);
    const response = await handleImageUploadPlanRequest(new Request("https://example.com/api/admin/portfolio/images/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        targetType: "static",
        staticWorkId: "girlsbandcry",
        staticRoleId: "girlsbandcry-nina",
        staticImageCount: 4,
        files: [{ name: "A.png", type: "image/png" }]
      })
    }), env, createStaticManifest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.plan[0]).toMatchObject({
      index: 5,
      filename: "nina_5.png",
      publicId: "webtest/portfolio/girlsbandcry/nina/nina_5"
    });
  });

  test("saves static appended image metadata", async () => {
    const hash = await hashAdminPassword("secret");
    const env = createEnv([{ success: true }]);
    env.ADMIN_PASSWORD_HASH = hash;
    env.CLOUDINARY_CLOUD_NAME = "di76171b0";
    const cookie = await createAdminSessionCookie(env);
    const response = await handleCreateImagesRequest(new Request("https://example.com/api/admin/portfolio/images", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        targetType: "static",
        staticWorkId: "girlsbandcry",
        staticRoleId: "girlsbandcry-nina",
        images: [{
          publicId: "webtest/portfolio/girlsbandcry/nina/nina_5",
          secureUrl: "https://res.cloudinary.com/di76171b0/image/upload/v1/webtest/portfolio/girlsbandcry/nina/nina_5.png",
          coverThumbUrl: "",
          filename: "nina_5.png",
          alt: "Nina 5",
          sortOrder: 5
        }]
      })
    }), env, createStaticManifest());

    expect(response.status).toBe(201);
    expect(env.calls.some((call) => call.sql?.includes("INSERT INTO portfolio_static_images"))).toBe(true);
  });

  test("rejects missing static portfolio roles", async () => {
    const hash = await hashAdminPassword("secret");
    const env = createEnv();
    env.ADMIN_PASSWORD_HASH = hash;
    env.CLOUDINARY_CLOUD_NAME = "di76171b0";
    const cookie = await createAdminSessionCookie(env);
    const response = await handleCreateImagesRequest(new Request("https://example.com/api/admin/portfolio/images", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        targetType: "static",
        staticWorkId: "girlsbandcry",
        staticRoleId: "girlsbandcry-missing",
        images: []
      })
    }), env, createStaticManifest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("静态作品或角色不存在。");
    expect(env.calls.some((call) => call.sql?.includes("INSERT INTO portfolio_static_images"))).toBe(false);
  });

  test("rejects missing static portfolio works", async () => {
    const hash = await hashAdminPassword("secret");
    const env = createEnv();
    env.ADMIN_PASSWORD_HASH = hash;
    env.CLOUDINARY_CLOUD_NAME = "di76171b0";
    const cookie = await createAdminSessionCookie(env);
    const response = await handleImageUploadPlanRequest(new Request("https://example.com/api/admin/portfolio/images/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        targetType: "static",
        staticWorkId: "missing-work",
        staticRoleId: "missing-work-nina",
        files: [{ name: "A.png", type: "image/png" }]
      })
    }), env, createStaticManifest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("静态作品或角色不存在。");
  });

  test("ignores invalid static portfolio image counts", async () => {
    const hash = await hashAdminPassword("secret");
    const env = createEnv([{ max_order: 0 }]);
    env.ADMIN_PASSWORD_HASH = hash;
    env.CLOUDINARY_CLOUD_NAME = "di76171b0";
    const cookie = await createAdminSessionCookie(env);
    const response = await handleImageUploadPlanRequest(new Request("https://example.com/api/admin/portfolio/images/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        targetType: "static",
        staticWorkId: "girlsbandcry",
        staticRoleId: "girlsbandcry-nina",
        staticImageCount: "bad",
        files: [{ name: "A.png", type: "image/png" }]
      })
    }), env, createStaticManifest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.plan[0]).toMatchObject({
      index: 5,
      filename: "nina_5.png",
      publicId: "webtest/portfolio/girlsbandcry/nina/nina_5"
    });
  });

  test("reserves upload plans for valid admin sessions", async () => {
    const hash = await hashAdminPassword("secret");
    const env = createEnv([{ work_slug: "girlsbandcry", role_slug: "nina" }, { max_order: 4 }]);
    env.ADMIN_PASSWORD_HASH = hash;
    const cookie = await createAdminSessionCookie(env);
    const request = new Request("https://example.com/api/admin/portfolio/images/plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie
      },
      body: JSON.stringify({
        workId: 1,
        roleId: 2,
        files: [{ name: "A.png", type: "image/png" }]
      })
    });

    const response = await handleImageUploadPlanRequest(request, env);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.plan[0].filename).toBe("nina_5.png");
    expect(env.calls[0].sql).toContain("JOIN portfolio_works");
    expect(env.calls[0].values).toEqual([1, 2]);
    expect(env.calls[1].sql).toContain("MAX(sort_order)");
    expect(env.calls[1].values).toEqual([2]);
  });

  test("rejects upload plans when the role context does not exist", async () => {
    const hash = await hashAdminPassword("secret");
    const env = createEnv([undefined]);
    env.ADMIN_PASSWORD_HASH = hash;
    const cookie = await createAdminSessionCookie(env);
    const request = new Request("https://example.com/api/admin/portfolio/images/plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie
      },
      body: JSON.stringify({
        workId: 1,
        roleId: 2,
        files: [{ name: "A.png", type: "image/png" }]
      })
    });

    const response = await handleImageUploadPlanRequest(request, env);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Portfolio role was not found.");
    expect(env.calls).toHaveLength(1);
  });
});
