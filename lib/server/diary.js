import { requireAdminSession } from "./admin-auth.js";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const DEFAULT_DIARY_ENTRIES = [
  {
    id: 1,
    title: "把站点整理成个人主页",
    entryDate: "2026-05-19",
    content: "今天把页面整理成更像个人博客的结构，新增了个人简介、作品集、日记和留言板。",
    isHidden: false,
    createdAt: "",
    updatedAt: ""
  },
  {
    id: 2,
    title: "第一次整理静态网页",
    entryDate: "2026-05-18",
    content: "从一个简单的 HTML 页面开始，逐步拆出页面、样式、脚本和资源目录。",
    isHidden: false,
    createdAt: "",
    updatedAt: ""
  }
];

export function diaryJson(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export function normalizeDiaryEntry(row) {
  return {
    id: Number(row.id),
    title: row.title,
    entryDate: row.entry_date,
    content: row.content,
    isHidden: Boolean(row.is_hidden),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listDiaryEntries(env, { includeHidden = false } = {}) {
  if (!env?.DB) {
    return includeHidden ? DEFAULT_DIARY_ENTRIES : DEFAULT_DIARY_ENTRIES.filter((entry) => !entry.isHidden);
  }

  const whereClause = includeHidden ? "" : " WHERE is_hidden = 0";
  const rows = await env.DB.prepare(
    `SELECT id, title, entry_date, content, is_hidden, created_at, updated_at
FROM diary_entries${whereClause}
ORDER BY entry_date DESC, id DESC`
  ).all();

  return (rows.results || []).map(normalizeDiaryEntry);
}

export async function createDiaryEntry(env, body) {
  const entry = normalizeDiaryBody(body);

  const row = await env.DB.prepare(
    `INSERT INTO diary_entries (title, entry_date, content, is_hidden)
VALUES (?, ?, ?, ?)
RETURNING id, title, entry_date, content, is_hidden, created_at, updated_at`
  ).bind(entry.title, entry.entryDate, entry.content, entry.isHidden ? 1 : 0).first();

  return normalizeDiaryEntry(row);
}

export async function updateDiaryEntry(env, entryId, body) {
  const id = cleanEntryId(entryId);
  const entry = normalizeDiaryBody(body);
  const row = await env.DB.prepare(
    `UPDATE diary_entries
SET title = ?, entry_date = ?, content = ?, is_hidden = ?, updated_at = CURRENT_TIMESTAMP
WHERE id = ?
RETURNING id, title, entry_date, content, is_hidden, created_at, updated_at`
  ).bind(entry.title, entry.entryDate, entry.content, entry.isHidden ? 1 : 0, id).first();

  if (!row) {
    throw new Error("Diary entry was not found");
  }

  return normalizeDiaryEntry(row);
}

export async function deleteDiaryEntry(env, entryId) {
  const id = cleanEntryId(entryId);
  await env.DB.prepare("DELETE FROM diary_entries WHERE id = ?").bind(id).run();
  return { ok: true };
}

export async function handleAdminDiaryRequest(request, env) {
  const unauthorized = await requireAdminOrJson(request, env);
  if (unauthorized) return unauthorized;

  return diaryJson({
    entries: await listDiaryEntries(env, { includeHidden: true })
  });
}

export async function handleCreateDiaryRequest(request, env) {
  const unauthorized = await requireAdminOrJson(request, env);
  if (unauthorized) return unauthorized;

  try {
    return diaryJson(await createDiaryEntry(env, await readJson(request)), 201);
  } catch (error) {
    return diaryJson({ error: error.message }, 400);
  }
}

export async function handleUpdateDiaryRequest(request, env, entryId) {
  const unauthorized = await requireAdminOrJson(request, env);
  if (unauthorized) return unauthorized;

  try {
    return diaryJson(await updateDiaryEntry(env, entryId, await readJson(request)));
  } catch (error) {
    return diaryJson({ error: error.message }, 400);
  }
}

export async function handleDeleteDiaryRequest(request, env, entryId) {
  const unauthorized = await requireAdminOrJson(request, env);
  if (unauthorized) return unauthorized;

  try {
    return diaryJson(await deleteDiaryEntry(env, entryId));
  } catch (error) {
    return diaryJson({ error: error.message }, 400);
  }
}

function normalizeDiaryBody(body) {
  return {
    title: cleanRequiredText(body?.title, "Diary title is required"),
    entryDate: cleanEntryDate(body?.entryDate || body?.entry_date),
    content: cleanRequiredText(body?.content, "Diary content is required"),
    isHidden: Boolean(body?.isHidden)
  };
}

function cleanRequiredText(value, message) {
  const text = String(value || "").trim();
  if (!text) {
    throw new Error(message);
  }

  return text;
}

function cleanEntryDate(value) {
  const date = String(value || "").trim();
  if (!DATE_PATTERN.test(date)) {
    throw new Error("Diary date must use YYYY-MM-DD");
  }

  return date;
}

function cleanEntryId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Diary entry id is required");
  }

  return id;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new Error("请求内容不是有效 JSON。");
  }
}

async function requireAdminOrJson(request, env) {
  if (await requireAdminSession(request, env)) {
    return undefined;
  }

  return diaryJson({ error: "管理员验证失败。" }, 401);
}
