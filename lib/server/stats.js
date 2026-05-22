import { json } from "./messages.js";

export function normalizePath(path) {
  const value = String(path || "/").trim();
  return value.startsWith("/") ? value.slice(0, 120) : "/";
}

export async function handleStats(request, env, cf = {}) {
  if (request.method === "GET") {
    return json({ error: "访问统计不公开。" }, 405);
  }

  if (request.method === "POST") {
    let body = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const path = normalizePath(body.path);
    const title = String(body.title || "").trim().slice(0, 80);
    const referrer = String(body.referrer || "").trim().slice(0, 200);
    const userAgent = request.headers.get("User-Agent") || "";
    const country = cf?.country || "";

    await env.DB.prepare(
      "INSERT INTO page_views (path, title, referrer, user_agent, country) VALUES (?, ?, ?, ?, ?)"
    ).bind(path, title, referrer, userAgent.slice(0, 200), country).run();

    return json({ ok: true });
  }

  return json({ error: "Method not allowed." }, 405);
}
