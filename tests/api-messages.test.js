import { describe, expect, test } from "vitest";

import { cleanText, handleMessages, hasDangerousContent } from "../lib/server/messages.js";

function createEnv(responses = []) {
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
          async all() {
            return responses.shift() || { results: [] };
          },
          async first() {
            return responses.shift();
          },
          async run() {
            return responses.shift() || {};
          }
        };

        return statement;
      }
    }
  };
}

describe("messages API helpers", () => {
  test("cleans text by trimming and truncating", () => {
    expect(cleanText("  abc  ", 5)).toBe("abc");
    expect(cleanText("abcdef", 3)).toBe("abc");
  });

  test("detects unsupported dangerous content", () => {
    expect(hasDangerousContent("<script>alert(1)</script>")).toBe(true);
    expect(hasDangerousContent("[x](javascript:alert(1))")).toBe(true);
    expect(hasDangerousContent('<img src=x onerror="alert(1)">')).toBe(true);
    expect(hasDangerousContent("<iframe></iframe>")).toBe(true);
    expect(hasDangerousContent("普通留言")).toBe(false);
  });

  test("rejects rapid submissions with the original error message", async () => {
    const env = createEnv([{ count: 5 }]);
    const request = new Request("https://example.com/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "vitest" },
      body: JSON.stringify({ name: "A", content: "hello" })
    });

    const response = await handleMessages(request, env);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe("留言太频繁了，请稍后再试。");
  });

  test("rejects duplicate submissions with the original error message", async () => {
    const env = createEnv([{ count: 0 }, { id: 1 }]);
    const request = new Request("https://example.com/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "vitest" },
      body: JSON.stringify({ name: "A", content: "hello" })
    });

    const response = await handleMessages(request, env);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe("请不要重复提交相同留言。");
  });
});
