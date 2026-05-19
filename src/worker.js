function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function hasDangerousContent(value) {
  return /<\s*\/?\s*script|javascript\s*:|onerror\s*=|onclick\s*=|<\s*iframe|<\s*object|<\s*embed/i.test(value);
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(value) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return toHex(digest);
}

async function getClientKey(request) {
  const ip = request.headers.get("CF-Connecting-IP");
  const userAgent = request.headers.get("User-Agent") || "unknown";
  return sha256(ip || userAgent);
}

function normalizePath(path) {
  const value = String(path || "/").trim();
  return value.startsWith("/") ? value.slice(0, 120) : "/";
}

async function handleMessages(request, env) {
  if (request.method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT id, name, content, created_at AS time FROM messages ORDER BY created_at DESC LIMIT 50"
    ).all();

    return json({ messages: results || [] });
  }

  if (request.method === "POST") {
    let body;

    try {
      body = await request.json();
    } catch {
      return json({ error: "请求内容不是有效 JSON。" }, 400);
    }

    if (cleanText(body.website, 120)) {
      return json({ error: "检测到异常提交，请刷新页面后重试。" }, 400);
    }

    const name = cleanText(body.name, 20);
    const content = cleanText(body.content, 3000);

    if (!name || !content) {
      return json({ error: "昵称和留言内容不能为空。" }, 400);
    }

    if (hasDangerousContent(name) || hasDangerousContent(content)) {
      return json({ error: "留言包含不支持的代码片段，请修改后再提交。" }, 400);
    }

    const clientKey = await getClientKey(request);
    const contentHash = await sha256(content);
    const recent = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM message_events WHERE client_key = ? AND created_at >= datetime('now', '-60 seconds')"
    ).bind(clientKey).first();

    if ((recent?.count || 0) >= 5) {
      return json({ error: "留言太频繁了，请稍后再试。" }, 429);
    }

    const duplicate = await env.DB.prepare(
      "SELECT id FROM message_events WHERE client_key = ? AND content_hash = ? AND created_at >= datetime('now', '-5 minutes') LIMIT 1"
    ).bind(clientKey, contentHash).first();

    if (duplicate) {
      return json({ error: "请不要重复提交相同留言。" }, 429);
    }

    const result = await env.DB.prepare(
      "INSERT INTO messages (name, content) VALUES (?, ?) RETURNING id, name, content, created_at AS time"
    ).bind(name, content).first();

    await env.DB.prepare(
      "INSERT INTO message_events (client_key, content_hash) VALUES (?, ?)"
    ).bind(clientKey, contentHash).run();

    return json({ message: result }, 201);
  }

  return json({ error: "Method not allowed." }, 405);
}

async function handleStats(request, env) {
  if (request.method === "GET") {
    const total = await env.DB.prepare("SELECT COUNT(*) AS count FROM page_views").first();
    const today = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM page_views WHERE date(created_at) = date('now')"
    ).first();
    const { results: pages } = await env.DB.prepare(
      "SELECT path, COUNT(*) AS count FROM page_views GROUP BY path ORDER BY count DESC LIMIT 10"
    ).all();

    return json({
      total: total?.count || 0,
      today: today?.count || 0,
      pages: pages || []
    });
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
    const country = request.cf?.country || "";

    await env.DB.prepare(
      "INSERT INTO page_views (path, title, referrer, user_agent, country) VALUES (?, ?, ?, ?, ?)"
    ).bind(path, title, referrer, userAgent.slice(0, 200), country).run();

    return json({ ok: true });
  }

  return json({ error: "Method not allowed." }, 405);
}

async function handleRequest(request, env) {
  const url = new URL(request.url);

  if (url.pathname === "/api/messages") {
    return handleMessages(request, env);
  }

  if (url.pathname === "/api/stats") {
    return handleStats(request, env);
  }

  return env.ASSETS.fetch(request);
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  }
};
