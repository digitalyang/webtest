import { describe, expect, test, vi } from "vitest";

import {
  createDiaryEntry,
  deleteDiaryEntry,
  listDiaryEntries,
  updateDiaryEntry
} from "../lib/server/diary.js";
import { createAdminSessionCookie, hashAdminPassword } from "../lib/server/admin-auth.js";

const routeContext = vi.hoisted(() => ({ env: {} }));

vi.mock("../lib/server/cloudflare", () => ({
  getRequestContext: () => ({ env: routeContext.env })
}));

function createEnv(responses = []) {
  const calls = [];
  const DB = {
    prepare(sql) {
      let values = [];
      const statement = {
        bind(...boundValues) {
          values = boundValues;
          calls.push({ sql, values });
          return statement;
        },
        async all() {
          if (values.length === 0) {
            calls.push({ sql, values });
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

  return { calls, DB };
}

function diaryRow(overrides = {}) {
  return {
    id: 1,
    title: "把站点整理成个人主页",
    entry_date: "2026-05-19",
    content: "**今天**记录一点想法。",
    is_hidden: 0,
    created_at: "2026-05-19 10:00:00",
    updated_at: "2026-05-19 10:00:00",
    ...overrides
  };
}

describe("diary D1 helpers", () => {
  test("lists visible entries newest first with camelCase fields", async () => {
    const env = createEnv([{ results: [diaryRow({ id: 2, entry_date: "2026-05-20" })] }]);

    await expect(listDiaryEntries(env)).resolves.toEqual([
      {
        id: 2,
        title: "把站点整理成个人主页",
        entryDate: "2026-05-20",
        content: "**今天**记录一点想法。",
        isHidden: false,
        createdAt: "2026-05-19 10:00:00",
        updatedAt: "2026-05-19 10:00:00"
      }
    ]);

    expect(env.calls[0].sql).toContain("WHERE is_hidden = 0");
    expect(env.calls[0].sql).toContain("ORDER BY entry_date DESC, id DESC");
  });

  test("creates diary entries after validating required fields", async () => {
    const env = createEnv([diaryRow({ id: 3, title: "Markdown 日记", entry_date: "2026-05-21" })]);

    await expect(createDiaryEntry(env, { title: "Bad", entryDate: "2026/05/21", content: "正文" }))
      .rejects.toThrow("Diary date must use YYYY-MM-DD");

    await expect(createDiaryEntry(env, {
      title: "Markdown 日记",
      entryDate: "2026-05-21",
      content: "## 标题\n\n- 事项"
    })).resolves.toMatchObject({
      id: 3,
      title: "Markdown 日记",
      entryDate: "2026-05-21"
    });

    expect(env.calls.at(-1).sql).toContain("INSERT INTO diary_entries");
    expect(env.calls.at(-1).values).toEqual(["Markdown 日记", "2026-05-21", "## 标题\n\n- 事项", 0]);
  });

  test("updates and deletes diary entries by id", async () => {
    const env = createEnv([
      diaryRow({ id: 4, title: "更新后的日记", is_hidden: 1 }),
      { success: true }
    ]);

    await expect(updateDiaryEntry(env, 4, {
      title: "更新后的日记",
      entryDate: "2026-05-22",
      content: "新的 **Markdown** 正文",
      isHidden: true
    })).resolves.toMatchObject({
      id: 4,
      title: "更新后的日记",
      isHidden: true
    });

    await expect(deleteDiaryEntry(env, 4)).resolves.toEqual({ ok: true });

    expect(env.calls[0].sql).toContain("UPDATE diary_entries");
    expect(env.calls[0].values).toEqual(["更新后的日记", "2026-05-22", "新的 **Markdown** 正文", 1, 4]);
    expect(env.calls[1].sql).toContain("DELETE FROM diary_entries");
    expect(env.calls[1].values).toEqual([4]);
  });
});

describe("diary admin API", () => {
  test("rejects diary admin snapshots without a session", async () => {
    const env = createEnv();
    env.ADMIN_PASSWORD_HASH = await hashAdminPassword("secret");
    routeContext.env = env;

    const { GET } = await import("../app/api/admin/diary/route.js");
    const response = await GET(new Request("https://example.com/api/admin/diary"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body.error).toBe("管理员验证失败。");
  });

  test("creates, updates, and deletes diary entries through protected routes", async () => {
    const env = createEnv([
      diaryRow({ id: 5, title: "后台新建日记" }),
      diaryRow({ id: 5, title: "后台编辑日记" }),
      { success: true }
    ]);
    env.ADMIN_PASSWORD_HASH = await hashAdminPassword("secret");
    routeContext.env = env;
    const cookie = await createAdminSessionCookie(env);

    const { POST } = await import("../app/api/admin/diary/route.js");
    const { PUT, DELETE } = await import("../app/api/admin/diary/[entryId]/route.js");

    const createResponse = await POST(new Request("https://example.com/api/admin/diary", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        title: "后台新建日记",
        entryDate: "2026-05-22",
        content: "支持 **Markdown**"
      })
    }));
    const updateResponse = await PUT(new Request("https://example.com/api/admin/diary/5", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        title: "后台编辑日记",
        entryDate: "2026-05-22",
        content: "重新编辑正文",
        isHidden: true
      })
    }), {
      params: Promise.resolve({ entryId: "5" })
    });
    const deleteResponse = await DELETE(new Request("https://example.com/api/admin/diary/5", {
      method: "DELETE",
      headers: { Cookie: cookie }
    }), {
      params: Promise.resolve({ entryId: "5" })
    });

    expect(createResponse.status).toBe(201);
    expect(updateResponse.status).toBe(200);
    expect(deleteResponse.status).toBe(200);
    expect(env.calls[0].sql).toContain("INSERT INTO diary_entries");
    expect(env.calls[1].sql).toContain("UPDATE diary_entries");
    expect(env.calls[2].sql).toContain("DELETE FROM diary_entries");
  });
});
