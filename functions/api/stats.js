function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

function normalizePath(path) {
  const value = String(path || "/").trim();
  return value.startsWith("/") ? value.slice(0, 120) : "/";
}

export async function onRequestGet({ env }) {
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

export async function onRequestPost({ request, env }) {
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
