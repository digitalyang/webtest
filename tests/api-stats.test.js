import { describe, expect, test } from "vitest";

import { handleStats, normalizePath } from "../lib/server/stats.js";

function createEnv() {
  const calls = [];

  return {
    calls,
    DB: {
      prepare(sql) {
        const statement = {
          bind(...values) {
            calls.push({ sql, values });
            return statement;
          },
          async first() {
            if (sql.includes("date(created_at)")) return { count: 2 };
            return { count: 7 };
          },
          async all() {
            return { results: [{ path: "/", count: 4 }] };
          },
          async run() {
            return {};
          }
        };

        return statement;
      }
    }
  };
}

describe("stats API helpers", () => {
  test("normalizes page paths", () => {
    expect(normalizePath("/messages")).toBe("/messages");
    expect(normalizePath("messages")).toBe("/");
    expect(normalizePath(`/${"a".repeat(200)}`)).toHaveLength(120);
  });

  test("returns total, today, and top pages", async () => {
    const response = await handleStats(new Request("https://example.com/api/stats"), createEnv());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      total: 7,
      today: 2,
      pages: [{ path: "/", count: 4 }]
    });
  });

  test("records page views with normalized data", async () => {
    const env = createEnv();
    const request = new Request("https://example.com/api/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "vitest-agent" },
      body: JSON.stringify({ path: "bad", title: "Hello", referrer: "https://ref.example" })
    });

    const response = await handleStats(request, env, { country: "CN" });
    const body = await response.json();

    expect(body).toEqual({ ok: true });
    expect(env.calls[0].values).toEqual(["/", "Hello", "https://ref.example", "vitest-agent", "CN"]);
  });
});
