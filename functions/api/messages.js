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

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id, name, content, created_at AS time FROM messages ORDER BY created_at DESC LIMIT 50"
  ).all();

  return json({ messages: results || [] });
}

export async function onRequestPost({ request, env }) {
  let body;

  try {
    body = await request.json();
  } catch {
    return json({ error: "请求内容不是有效 JSON。" }, 400);
  }

  const name = cleanText(body.name, 20);
  const content = cleanText(body.content, 200);

  if (!name || !content) {
    return json({ error: "昵称和留言内容不能为空。" }, 400);
  }

  const result = await env.DB.prepare(
    "INSERT INTO messages (name, content) VALUES (?, ?) RETURNING id, name, content, created_at AS time"
  ).bind(name, content).first();

  return json({ message: result }, 201);
}
