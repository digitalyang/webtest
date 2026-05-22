import { afterEach, describe, expect, test, vi } from "vitest";

import { createAdminSessionCookie, hashAdminPassword } from "../lib/server/admin-auth.js";
import {
  handleAdminMessagesRequest,
  handleDeleteAdminMessageRequest
} from "../lib/server/message-admin.js";

const routeContext = vi.hoisted(() => ({ env: {} }));

vi.mock("../lib/server/cloudflare", () => ({
  getRequestContext: () => ({ env: routeContext.env })
}));

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("../lib/server/message-admin.js");
  routeContext.env = {};
});

function createEnv(responses = []) {
  const calls = [];

  return {
    calls,
    DB: {
      prepare(sql) {
        let boundValues = [];
        const statement = {
          bind(...values) {
            boundValues = values;
            calls.push({ sql, values });
            return statement;
          },
          async all() {
            if (boundValues.length === 0) {
              calls.push({ sql, values: [] });
            }
            return responses.shift() || { results: [] };
          },
          async first() {
            if (boundValues.length === 0) {
              calls.push({ sql, values: [] });
            }
            return responses.shift();
          },
          async run() {
            if (boundValues.length === 0) {
              calls.push({ sql, values: [] });
            }
            return responses.shift() || { success: true };
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
      Cookie: cookie
    }
  });
}

describe("message admin API helper", () => {
  test("rejects list requests without a valid admin session", async () => {
    const env = createEnv();
    env.ADMIN_PASSWORD_HASH = await hashAdminPassword("secret");

    const response = await handleAdminMessagesRequest(
      new Request("https://example.com/api/admin/messages"),
      env
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body.error).toBe("管理员登录已过期，请重新登录。");
    expect(env.calls).toEqual([]);
  });

  test("returns paginated messages ordered newest first", async () => {
    const env = createEnv([
      { count: 2 },
      {
        results: [
          { id: 2, name: "B", content: "second", time: "2026-05-22 10:02:00" },
          { id: 1, name: "A", content: "first", time: "2026-05-22 10:01:00" }
        ]
      }
    ]);
    const request = await createAuthedRequest(
      "https://example.com/api/admin/messages?page=1&pageSize=10",
      env
    );

    const response = await handleAdminMessagesRequest(request, env);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      messages: [
        { id: 2, name: "B", content: "second", time: "2026-05-22 10:02:00" },
        { id: 1, name: "A", content: "first", time: "2026-05-22 10:01:00" }
      ],
      total: 2,
      page: 1,
      pageSize: 10
    });
    expect(env.calls[0].sql).toContain("SELECT COUNT(*) AS count FROM messages");
    expect(env.calls[1].sql).toContain("ORDER BY created_at DESC");
    expect(env.calls[1].sql).toContain("LIMIT ? OFFSET ?");
    expect(env.calls[1].values).toEqual([10, 0]);
  });

  test("filters messages by nickname or content", async () => {
    const env = createEnv([
      { count: 1 },
      {
        results: [
          { id: 3, name: "摄影师小羊", content: "网站很好看", time: "2026-05-22 10:03:00" }
        ]
      }
    ]);
    const request = await createAuthedRequest(
      "https://example.com/api/admin/messages?q=%E6%91%84%E5%BD%B1&page=2&pageSize=5",
      env
    );

    const response = await handleAdminMessagesRequest(request, env);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.page).toBe(2);
    expect(body.pageSize).toBe(5);
    expect(env.calls[0].sql).toContain("WHERE (name LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\')");
    expect(env.calls[0].values).toEqual(["%摄影%", "%摄影%"]);
    expect(env.calls[1].values).toEqual(["%摄影%", "%摄影%", 5, 5]);
  });

  test("escapes wildcard characters in search queries", async () => {
    const env = createEnv([{ count: 0 }, { results: [] }]);
    const request = await createAuthedRequest(
      "https://example.com/api/admin/messages?q=100%25_%5C",
      env
    );

    await handleAdminMessagesRequest(request, env);

    expect(env.calls[0].values).toEqual(["%100\\%\\_\\\\%", "%100\\%\\_\\\\%"]);
    expect(env.calls[1].sql).toContain("WHERE (name LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\')");
    expect(env.calls[1].values).toEqual(["%100\\%\\_\\\\%", "%100\\%\\_\\\\%", 10, 0]);
  });

  test("rejects delete requests without a valid admin session", async () => {
    const env = createEnv();
    env.ADMIN_PASSWORD_HASH = await hashAdminPassword("secret");
    const request = new Request("https://example.com/api/admin/messages/9", {
      method: "DELETE"
    });

    const response = await handleDeleteAdminMessageRequest(request, env, "9");
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body.error).toBe("管理员登录已过期，请重新登录。");
    expect(env.calls).toEqual([]);
  });

  test("deletes an existing message permanently", async () => {
    const env = createEnv([{ success: true, meta: { changes: 1 } }]);
    const request = await createAuthedRequest(
      "https://example.com/api/admin/messages/9",
      env,
      { method: "DELETE" }
    );

    const response = await handleDeleteAdminMessageRequest(request, env, "9");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(env.calls).toHaveLength(1);
    expect(env.calls[0].sql).toContain("DELETE FROM messages WHERE id = ?");
    expect(env.calls[0].values).toEqual([9]);
  });

  test("returns 404 when deleting a missing message", async () => {
    const env = createEnv([{ success: true, meta: { changes: 0 } }]);
    const request = await createAuthedRequest(
      "https://example.com/api/admin/messages/404",
      env,
      { method: "DELETE" }
    );

    const response = await handleDeleteAdminMessageRequest(request, env, "404");
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("留言不存在或已被删除。");
    expect(env.calls).toHaveLength(1);
    expect(env.calls[0].sql).toContain("DELETE FROM messages WHERE id = ?");
    expect(env.calls[0].values).toEqual([404]);
  });

  test("rejects invalid message ids before querying D1", async () => {
    const env = createEnv();
    const request = await createAuthedRequest(
      "https://example.com/api/admin/messages/not-a-number",
      env,
      { method: "DELETE" }
    );

    const response = await handleDeleteAdminMessageRequest(request, env, "not-a-number");
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("留言 ID 无效。");
    expect(env.calls).toEqual([]);
  });
});

describe("message admin route handlers", () => {
  test("GET delegates to the admin message helper", async () => {
    const env = createEnv([{ count: 0 }, { results: [] }]);
    routeContext.env = env;
    const request = await createAuthedRequest("https://example.com/api/admin/messages", env);
    const handleAdminMessagesRequestMock = vi.fn(async () =>
      Response.json({ messages: [], total: 0, page: 1, pageSize: 20 })
    );

    vi.resetModules();
    vi.doMock("../lib/server/message-admin.js", () => ({
      handleAdminMessagesRequest: handleAdminMessagesRequestMock,
      handleDeleteAdminMessageRequest: vi.fn()
    }));
    const { GET } = await import("../app/api/admin/messages/route.js");

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.messages).toEqual([]);
    expect(handleAdminMessagesRequestMock).toHaveBeenCalledOnce();
    expect(handleAdminMessagesRequestMock).toHaveBeenCalledWith(request, env);
  });

  test("DELETE delegates to the admin message helper", async () => {
    const env = createEnv([{ id: 5 }, { success: true }]);
    routeContext.env = env;
    const request = await createAuthedRequest(
      "https://example.com/api/admin/messages/5",
      env,
      { method: "DELETE" }
    );
    const handleDeleteAdminMessageRequestMock = vi.fn(async () => Response.json({ ok: true }));

    vi.resetModules();
    vi.doMock("../lib/server/message-admin.js", () => ({
      handleAdminMessagesRequest: vi.fn(),
      handleDeleteAdminMessageRequest: handleDeleteAdminMessageRequestMock
    }));
    const { DELETE } = await import("../app/api/admin/messages/[messageId]/route.js");

    const response = await DELETE(request, { params: Promise.resolve({ messageId: "5" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(handleDeleteAdminMessageRequestMock).toHaveBeenCalledOnce();
    expect(handleDeleteAdminMessageRequestMock).toHaveBeenCalledWith(request, env, "5");
  });
});
