import { requireAdminSession } from "./admin-auth.js";

const UNAUTHORIZED_ERROR = "管理员登录已过期，请重新登录。";
const ADMIN_MESSAGES_ERROR = "留言管理请求失败，请稍后重试。";

export function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export function escapeLike(value) {
  return String(value ?? "").trim().replace(/[\\%_]/g, "\\$&");
}

export async function handleAdminMessagesRequest(request, env) {
  if (!(await requireAdminSession(request, env))) {
    return json({ error: UNAUTHORIZED_ERROR }, 401);
  }

  try {
    const url = new URL(request.url);
    const page = parsePositiveInteger(url.searchParams.get("page"), 1);
    const pageSize = Math.min(parsePositiveInteger(url.searchParams.get("pageSize"), 10), 50);
    const offset = (page - 1) * pageSize;
    const query = escapeLike(url.searchParams.get("q"));

    let countRow;
    let messagesResult;

    if (query) {
      const likeQuery = `%${query}%`;
      countRow = await env.DB.prepare(
        "SELECT COUNT(*) AS count FROM messages WHERE (name LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\')"
      ).bind(likeQuery, likeQuery).first();
      messagesResult = await env.DB.prepare(
        "SELECT id, name, content, created_at AS time FROM messages WHERE (name LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\') ORDER BY created_at DESC LIMIT ? OFFSET ?"
      ).bind(likeQuery, likeQuery, pageSize, offset).all();
    } else {
      countRow = await env.DB.prepare("SELECT COUNT(*) AS count FROM messages").first();
      messagesResult = await env.DB.prepare(
        "SELECT id, name, content, created_at AS time FROM messages ORDER BY created_at DESC LIMIT ? OFFSET ?"
      ).bind(pageSize, offset).all();
    }

    return json({
      messages: messagesResult?.results || [],
      total: Number(countRow?.count || 0),
      page,
      pageSize
    });
  } catch {
    return json({ error: ADMIN_MESSAGES_ERROR }, 500);
  }
}

export async function handleDeleteAdminMessageRequest(request, env, messageId) {
  if (!(await requireAdminSession(request, env))) {
    return json({ error: UNAUTHORIZED_ERROR }, 401);
  }

  const numericMessageId = Number(messageId);
  if (!Number.isInteger(numericMessageId) || numericMessageId < 1) {
    return json({ error: "留言 ID 无效。" }, 400);
  }

  try {
    const result = await env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(numericMessageId).run();
    if ((result?.meta?.changes || 0) > 0) {
      return json({ ok: true });
    }

    return json({ error: "留言不存在或已被删除。" }, 404);
  } catch {
    return json({ error: ADMIN_MESSAGES_ERROR }, 500);
  }
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}
