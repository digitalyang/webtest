import { describe, expect, test } from "vitest";

import { DEFAULT_ABOUT_PROFILE } from "../lib/about-profile.js";
import { createAdminSessionCookie, hashAdminPassword } from "../lib/server/admin-auth.js";
import {
  aboutAdminJson,
  getAdminAboutState,
  getPublishedAboutProfile,
  handleAdminAboutRequest,
  handlePublishAboutProfileRequest,
  handleSaveAboutDraftRequest,
  publishAboutDraft,
  saveAboutDraft
} from "../lib/server/about-profile.js";

function createRow(status, profile, id = status === "published" ? 2 : 1) {
  return {
    id,
    status,
    content_json: JSON.stringify(profile),
    created_at: "2026-05-22 10:00:00",
    updated_at: "2026-05-22 10:00:00",
    published_at: status === "published" ? "2026-05-22 10:00:00" : null
  };
}

function createEnv(rows = {}) {
  const state = {
    draft: rows.draft,
    published: rows.published,
    calls: []
  };

  return {
    state,
    DB: {
      prepare(sql) {
        let values = [];
        const statement = {
          bind(...nextValues) {
            values = nextValues;
            state.calls.push({ sql, values });
            return statement;
          },
          async first() {
            state.calls.push({ sql, values });
            if (sql.includes("status = 'published'") || values.includes("published")) return state.published;
            if (sql.includes("status = 'draft'") || values.includes("draft")) return state.draft;
            return undefined;
          },
          async run() {
            state.calls.push({ sql, values });
            if (sql.includes("about_profile_versions")) {
              const contentJson = values.find((value) => typeof value === "string" && value.includes("\"identity\""));
              const status = values.includes("published") || sql.includes("'published'") ? "published" : "draft";
              const existing = state[status];

              state[status] = {
                id: existing?.id || (status === "published" ? 2 : 1),
                status,
                content_json: contentJson || existing?.content_json,
                created_at: existing?.created_at || "2026-05-22 10:00:00",
                updated_at: "2026-05-22 10:00:00",
                published_at: status === "published" ? "2026-05-22 10:00:00" : null
              };
            }
            return { success: true };
          }
        };
        return statement;
      }
    }
  };
}

async function createAuthedRequest(url, env, init = {}) {
  env.ADMIN_PASSWORD_HASH = await hashAdminPassword("secret");
  const cookie = await createAdminSessionCookie(env);
  return new Request(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Cookie: cookie,
      "Content-Type": "application/json"
    }
  });
}

describe("about profile server helper", () => {
  test("returns no-store admin JSON responses", async () => {
    const response = aboutAdminJson({ ok: true }, 201);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toEqual({ ok: true });
  });

  test("returns default profile when D1 is unavailable", async () => {
    await expect(getPublishedAboutProfile(undefined)).resolves.toEqual(DEFAULT_ABOUT_PROFILE);
  });

  test("rejects admin state reads when D1 is unavailable", async () => {
    await expect(getAdminAboutState(undefined)).rejects.toThrow("数据库未绑定，无法加载个人简介草稿。");
  });

  test("returns published profile when D1 has one", async () => {
    const env = createEnv({
      published: createRow("published", {
        ...DEFAULT_ABOUT_PROFILE,
        identity: { ...DEFAULT_ABOUT_PROFILE.identity, headline: "数据库标题" }
      })
    });

    const profile = await getPublishedAboutProfile(env);

    expect(profile.identity.headline).toBe("数据库标题");
  });

  test("does not expose draft through public profile reads", async () => {
    const env = createEnv({
      draft: createRow("draft", {
        ...DEFAULT_ABOUT_PROFILE,
        identity: { ...DEFAULT_ABOUT_PROFILE.identity, headline: "草稿标题" }
      })
    });

    const profile = await getPublishedAboutProfile(env);

    expect(profile).toEqual(DEFAULT_ABOUT_PROFILE);
  });

  test("uses published profile as the admin draft fallback", async () => {
    const env = createEnv({
      published: createRow("published", {
        ...DEFAULT_ABOUT_PROFILE,
        identity: { ...DEFAULT_ABOUT_PROFILE.identity, headline: "已发布标题" }
      })
    });

    const state = await getAdminAboutState(env);

    expect(state.draft.profile.identity.headline).toBe("已发布标题");
    expect(state.draft.status).toBe("draft");
    expect(state.published.profile.identity.headline).toBe("已发布标题");
  });

  test("rejects admin reads without a valid session", async () => {
    const env = createEnv();
    env.ADMIN_PASSWORD_HASH = await hashAdminPassword("secret");

    const response = await handleAdminAboutRequest(new Request("https://example.com/api/admin/about"), env);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("管理员登录已过期，请重新登录。");
  });

  test("returns a no-store admin error when D1 is unavailable", async () => {
    const env = {};
    const request = await createAuthedRequest("https://example.com/api/admin/about", env);

    const response = await handleAdminAboutRequest(request, env);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body.error).toBe("数据库未绑定，无法加载个人简介草稿。");
  });

  test("saves a valid draft without publishing it", async () => {
    const env = createEnv();
    const request = await createAuthedRequest("https://example.com/api/admin/about/draft", env, {
      method: "PUT",
      body: JSON.stringify({
        profile: {
          ...DEFAULT_ABOUT_PROFILE,
          identity: { ...DEFAULT_ABOUT_PROFILE.identity, headline: "草稿标题" }
        }
      })
    });

    const response = await handleSaveAboutDraftRequest(request, env);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.draft.profile.identity.headline).toBe("草稿标题");
    expect(env.state.draft.content_json).toContain("草稿标题");
    expect(env.state.published).toBeUndefined();
  });

  test("rejects invalid draft content", async () => {
    const env = createEnv();
    const request = await createAuthedRequest("https://example.com/api/admin/about/draft", env, {
      method: "PUT",
      body: JSON.stringify({
        profile: {
          ...DEFAULT_ABOUT_PROFILE,
          identity: { ...DEFAULT_ABOUT_PROFILE.identity, headline: "" }
        }
      })
    });

    const response = await handleSaveAboutDraftRequest(request, env);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("个人简介标题不能为空。");
  });

  test("rejects invalid JSON draft requests", async () => {
    const env = createEnv();
    const request = await createAuthedRequest("https://example.com/api/admin/about/draft", env, {
      method: "PUT",
      body: "{"
    });

    const response = await handleSaveAboutDraftRequest(request, env);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("请求内容不是有效 JSON。");
  });

  test("saves drafts through the direct helper", async () => {
    const env = createEnv();

    const draft = await saveAboutDraft(env, {
      ...DEFAULT_ABOUT_PROFILE,
      identity: { ...DEFAULT_ABOUT_PROFILE.identity, headline: "直接保存草稿" }
    });

    expect(draft.status).toBe("draft");
    expect(draft.profile.identity.headline).toBe("直接保存草稿");
  });

  test("publishes the active draft into the public slot", async () => {
    const env = createEnv({
      draft: createRow("draft", {
        ...DEFAULT_ABOUT_PROFILE,
        identity: { ...DEFAULT_ABOUT_PROFILE.identity, headline: "发布标题" }
      })
    });
    const request = await createAuthedRequest("https://example.com/api/admin/about/publish", env, {
      method: "POST"
    });

    const response = await handlePublishAboutProfileRequest(request, env);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.published.profile.identity.headline).toBe("发布标题");
    expect(env.state.draft.content_json).toContain("发布标题");
    expect(env.state.published.content_json).toContain("发布标题");
  });

  test("rejects publishing when no draft exists", async () => {
    const env = createEnv();

    await expect(publishAboutDraft(env)).rejects.toThrow("请先保存草稿后再发布。");
  });
});
