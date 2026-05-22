import { DEFAULT_ABOUT_PROFILE, normalizeAboutProfile } from "../about-profile.js";
import { requireAdminSession } from "./admin-auth.js";

const UNAUTHORIZED_ERROR = "管理员登录已过期，请重新登录。";
const DB_UNAVAILABLE_ERROR = "数据库暂不可用，请稍后重试。";
const ADMIN_DRAFT_DB_UNAVAILABLE_ERROR = "数据库未绑定，无法加载个人简介草稿。";
const NO_DRAFT_ERROR = "请先保存草稿后再发布。";

export function aboutAdminJson(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export async function getPublishedAboutProfile(env) {
  if (!env?.DB) {
    return DEFAULT_ABOUT_PROFILE;
  }

  try {
    const row = await getAboutProfileRow(env, "published");
    if (!row) {
      return DEFAULT_ABOUT_PROFILE;
    }

    return parseAboutProfileRow(row).profile;
  } catch {
    return DEFAULT_ABOUT_PROFILE;
  }
}

export async function getAdminAboutState(env) {
  if (!env?.DB) {
    throw new Error(ADMIN_DRAFT_DB_UNAVAILABLE_ERROR);
  }

  const [draftRow, publishedRow] = await Promise.all([
    getAboutProfileRow(env, "draft"),
    getAboutProfileRow(env, "published")
  ]);
  const published = publishedRow ? parseAboutProfileRow(publishedRow) : null;
  const draft = draftRow
    ? parseAboutProfileRow(draftRow)
    : createProfileState("draft", published?.profile || DEFAULT_ABOUT_PROFILE);

  return { draft, published };
}

export async function saveAboutDraft(env, profileInput) {
  assertDb(env);

  const profile = normalizeAboutProfile(profileInput);
  const contentJson = JSON.stringify(profile);
  const existingDraft = await getAboutProfileRow(env, "draft");

  if (existingDraft) {
    await env.DB.prepare(
      "UPDATE about_profile_versions SET content_json = ?, updated_at = CURRENT_TIMESTAMP WHERE status = ?"
    ).bind(contentJson, "draft").run();
  } else {
    await env.DB.prepare(
      "INSERT INTO about_profile_versions (status, content_json) VALUES (?, ?)"
    ).bind("draft", contentJson).run();
  }

  return parseAboutProfileRow(await getAboutProfileRow(env, "draft"));
}

export async function publishAboutDraft(env) {
  assertDb(env);

  const draftRow = await getAboutProfileRow(env, "draft");
  if (!draftRow) {
    throw new Error(NO_DRAFT_ERROR);
  }

  const draft = parseAboutProfileRow(draftRow);
  const contentJson = JSON.stringify(draft.profile);
  const existingPublished = await getAboutProfileRow(env, "published");

  if (existingPublished) {
    await env.DB.prepare(
      `UPDATE about_profile_versions
SET content_json = ?, updated_at = CURRENT_TIMESTAMP, published_at = CURRENT_TIMESTAMP
WHERE status = ?`
    ).bind(contentJson, "published").run();
  } else {
    await env.DB.prepare(
      "INSERT INTO about_profile_versions (status, content_json, published_at) VALUES (?, ?, CURRENT_TIMESTAMP)"
    ).bind("published", contentJson).run();
  }

  return parseAboutProfileRow(await getAboutProfileRow(env, "published"));
}

export async function handleAdminAboutRequest(request, env) {
  if (!(await requireAdminSession(request, env))) {
    return aboutAdminJson({ error: UNAUTHORIZED_ERROR }, 401);
  }

  try {
    return aboutAdminJson(await getAdminAboutState(env));
  } catch (error) {
    return aboutAdminJson({ error: error.message }, 400);
  }
}

export async function handleSaveAboutDraftRequest(request, env) {
  if (!(await requireAdminSession(request, env))) {
    return aboutAdminJson({ error: UNAUTHORIZED_ERROR }, 401);
  }

  try {
    const body = await readJson(request);
    const draft = await saveAboutDraft(env, body?.profile);
    return aboutAdminJson({ draft });
  } catch (error) {
    return aboutAdminJson({ error: error.message }, 400);
  }
}

export async function handlePublishAboutProfileRequest(request, env) {
  if (!(await requireAdminSession(request, env))) {
    return aboutAdminJson({ error: UNAUTHORIZED_ERROR }, 401);
  }

  try {
    const published = await publishAboutDraft(env);
    return aboutAdminJson({ published });
  } catch (error) {
    return aboutAdminJson({ error: error.message }, 400);
  }
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new Error("请求内容不是有效 JSON。");
  }
}

function assertDb(env) {
  if (!env?.DB) {
    throw new Error(DB_UNAVAILABLE_ERROR);
  }
}

async function getAboutProfileRow(env, status) {
  return env.DB.prepare(
    `SELECT id, status, content_json, created_at, updated_at, published_at
FROM about_profile_versions
WHERE status = ?
LIMIT 1`
  ).bind(status).first();
}

function parseAboutProfileRow(row) {
  return createProfileState(row.status, normalizeAboutProfile(JSON.parse(row.content_json)), {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at
  });
}

function createProfileState(status, profile, row = {}) {
  return {
    id: row.id ?? null,
    status,
    profile,
    createdAt: row.createdAt ?? null,
    updatedAt: row.updatedAt ?? null,
    publishedAt: row.publishedAt ?? null
  };
}
