import { requireAdminSession } from "./admin-auth.js";
import {
  applyStaticPortfolioExtensions,
  buildAdminPortfolioOptions,
  buildCloudinaryCoverUrl,
  buildImageUploadPlan,
  buildStaticImageUploadPlan,
  getStaticRoleSlug,
  isValidPortfolioSlug,
  mergePortfolioData,
  normalizeDynamicPortfolio,
  validateCloudinaryUpload
} from "../portfolio-admin.js";

export function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export async function handleAdminPortfolioRequest(request, env, staticManifest = {}) {
  const unauthorized = await requireAdminOrJson(request, env);
  if (unauthorized) return unauthorized;

  const rows = await getDynamicPortfolioRows(env, { includeHidden: true });
  return json({
    ...rows,
    adminOptions: buildAdminPortfolioOptions({
      staticManifest,
      dynamicRows: rows,
      staticRoles: rows.staticRoles
    }),
    cloudName: env.CLOUDINARY_CLOUD_NAME || "",
    uploadPreset: env.CLOUDINARY_UPLOAD_PRESET || ""
  });
}

export async function handleCreateWorkRequest(request, env, staticWorkIds = []) {
  const unauthorized = await requireAdminOrJson(request, env);
  if (unauthorized) return unauthorized;

  try {
    const body = await readJson(request);
    return json(await createPortfolioWork(env, body, staticWorkIds), 201);
  } catch (error) {
    return json({ error: error.message }, 400);
  }
}

export async function handleCreateRoleRequest(request, env) {
  const unauthorized = await requireAdminOrJson(request, env);
  if (unauthorized) return unauthorized;

  try {
    const body = await readJson(request);
    return json(await createPortfolioRole(env, body), 201);
  } catch (error) {
    return json({ error: error.message }, 400);
  }
}

export async function handleCreateImagesRequest(request, env, staticManifest) {
  const unauthorized = await requireAdminOrJson(request, env);
  if (unauthorized) return unauthorized;

  try {
    const body = await readJson(request);
    if (body?.targetType === "static") {
      return await handleCreateStaticImagesRequest(body, env, staticManifest);
    }

    const roleContext = await getPortfolioRoleContext(env, body);
    if (!roleContext) {
      return json({ error: "Portfolio role was not found." }, 400);
    }

    const images = Array.isArray(body?.images) ? body.images : [];
    for (const image of images) {
      const validation = validateCloudinaryUpload({
        cloudName: env.CLOUDINARY_CLOUD_NAME,
        publicId: image?.publicId,
        secureUrl: image?.secureUrl
      });
      const sortOrder = Number(image?.sortOrder);
      const hasValidSortOrder = image?.sortOrder != null &&
        String(image.sortOrder).trim() !== "" &&
        Number.isFinite(sortOrder);
      const expectedPublicId = `webtest/portfolio/${roleContext.work_slug}/${roleContext.role_slug}/${roleContext.role_slug}_${sortOrder}`;

      if (!validation.ok || !hasValidSortOrder || image?.publicId !== expectedPublicId) {
        return json({ error: "Cloudinary 上传信息无效。" }, 400);
      }
    }

    return json(await savePortfolioImages(env, {
      ...body,
      images: Array.isArray(body?.images)
        ? body.images.map((image) => ({
          ...image,
          coverThumbUrl: toCoverThumbUrl(env, image.publicId)
        }))
        : body?.images
    }), 201);
  } catch (error) {
    return json({ error: error.message }, 400);
  }
}

export async function handleImageUploadPlanRequest(request, env, staticManifest) {
  const unauthorized = await requireAdminOrJson(request, env);
  if (unauthorized) return unauthorized;

  try {
    const body = await readJson(request);
    if (body?.targetType === "static") {
      const staticContext = getStaticPortfolioRoleContext(staticManifest, body);
      const nextIndex = await getNextStaticImageIndex(env, staticContext.staticRoleId, staticContext.imageCount);
      const plan = buildStaticImageUploadPlan({
        staticWorkId: staticContext.staticWorkId,
        staticRoleId: staticContext.staticRoleId,
        startIndex: nextIndex,
        files: body?.files || []
      });

      return json({ plan });
    }

    const roleContext = await getPortfolioRoleContext(env, {
      workId: body?.workId,
      roleId: body?.roleId
    });
    if (!roleContext) {
      return json({ error: "Portfolio role was not found." }, 400);
    }

    const nextIndex = await getNextImageIndex(env, body?.roleId);
    const plan = buildImageUploadPlan({
      workSlug: roleContext.work_slug,
      roleSlug: roleContext.role_slug,
      startIndex: nextIndex,
      files: body?.files || []
    });

    return json({ plan });
  } catch (error) {
    return json({ error: error.message }, 400);
  }
}

export async function handleUpdateWorkRequest(request, env, workId) {
  return handleVisibilityRequest(request, env, "work", workId);
}

export async function handleUpdateRoleRequest(request, env, roleId) {
  return handleVisibilityRequest(request, env, "role", roleId);
}

export async function handleUpdateImageRequest(request, env, imageId) {
  return handleVisibilityRequest(request, env, "image", imageId);
}

export async function handleSetCoverRequest(request, env) {
  const unauthorized = await requireAdminOrJson(request, env);
  if (unauthorized) return unauthorized;

  try {
    const body = await readJson(request);
    return json(await setPortfolioCover(env, body));
  } catch (error) {
    return json({ error: error.message }, 400);
  }
}

export async function createPortfolioWork(env, body, staticWorkIds = []) {
  const title = cleanRequiredText(body?.title, "Work title is required");
  const slug = String(body?.slug || "").trim();

  if (!isValidPortfolioSlug(slug)) {
    throw new Error("Invalid work slug");
  }

  if (staticWorkIds.includes(slug)) {
    throw new Error("Work slug conflicts with an existing static work");
  }

  return env.DB.prepare(
    "INSERT INTO portfolio_works (title, slug) VALUES (?, ?) RETURNING id, title, slug, cover_image_id, sort_order, is_hidden, created_at, updated_at"
  ).bind(title, slug).first();
}

export async function createPortfolioRole(env, body) {
  const workId = Number(body?.workId);
  const title = cleanRequiredText(body?.title, "Role title is required");
  const slug = String(body?.slug || "").trim();

  if (!Number.isFinite(workId)) {
    throw new Error("Work id is required");
  }

  if (!isValidPortfolioSlug(slug)) {
    throw new Error("Invalid role slug");
  }

  return env.DB.prepare(
    "INSERT INTO portfolio_roles (work_id, title, slug) VALUES (?, ?, ?) RETURNING id, work_id, title, slug, cover_image_id, sort_order, is_hidden, created_at, updated_at"
  ).bind(workId, title, slug).first();
}

export async function getNextImageIndex(env, roleId) {
  const row = await env.DB.prepare(
    "SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM portfolio_images WHERE role_id = ?"
  ).bind(roleId).first();

  return Number(row?.max_order || 0) + 1;
}

export async function getNextStaticImageIndex(env, staticRoleId, staticImageCount = 0) {
  const row = await env.DB.prepare(
    "SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM portfolio_static_images WHERE static_role_id = ?"
  ).bind(staticRoleId).first();

  return Math.max(Number(staticImageCount || 0), Number(row?.max_order || 0)) + 1;
}

export async function getPortfolioRoleContext(env, { workId, roleId }) {
  const numericWorkId = cleanRequiredNumber(workId, "Work id is required");
  const numericRoleId = cleanRequiredNumber(roleId, "Role id is required");

  return env.DB.prepare(
    `SELECT w.slug AS work_slug, r.slug AS role_slug
FROM portfolio_roles r
JOIN portfolio_works w ON w.id = r.work_id
WHERE w.id = ? AND r.id = ?
LIMIT 1`
  ).bind(numericWorkId, numericRoleId).first();
}

export async function savePortfolioImages(env, { workId, roleId, images }) {
  const numericWorkId = cleanRequiredNumber(workId, "Work id is required");
  const numericRoleId = cleanRequiredNumber(roleId, "Role id is required");

  if (!Array.isArray(images)) {
    throw new Error("Images are required");
  }

  if (images.length === 0) {
    return { count: 0 };
  }

  const normalizedImages = images.map(normalizeImageMetadata);
  const statements = normalizedImages.map((image) =>
    env.DB.prepare(INSERT_PORTFOLIO_IMAGE_SQL).bind(
      numericWorkId,
      numericRoleId,
      image.publicId,
      image.secureUrl,
      image.coverThumbUrl,
      image.filename,
      image.alt,
      image.width,
      image.height,
      image.format,
      image.bytes,
      image.sortOrder
    )
  );

  if (env.DB.batch) {
    await env.DB.batch(statements);
  } else {
    for (const statement of statements) {
      await statement.run();
    }
  }

  return { count: images.length };
}

async function handleCreateStaticImagesRequest(body, env, staticManifest) {
  const staticContext = getStaticPortfolioRoleContext(staticManifest, body);
  const { staticWorkId, staticRoleId, roleSlug } = staticContext;
  const images = Array.isArray(body?.images) ? body.images : [];

  for (const image of images) {
    const sortOrder = Number(image?.sortOrder);
    const expectedPublicId = `webtest/portfolio/${staticWorkId}/${roleSlug}/${roleSlug}_${sortOrder}`;
    const validation = validateCloudinaryUpload({
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      publicId: image?.publicId,
      secureUrl: image?.secureUrl
    });
    if (!validation.ok || image?.publicId !== expectedPublicId || !Number.isFinite(sortOrder)) {
      return json({ error: "Cloudinary 上传信息无效。" }, 400);
    }
  }

  return json(await saveStaticPortfolioImages(env, {
    staticWorkId,
    staticRoleId,
    images: images.map((image) => ({
      ...image,
      coverThumbUrl: toCoverThumbUrl(env, image.publicId)
    }))
  }), 201);
}

function getStaticPortfolioRoleContext(staticManifest, { staticWorkId, staticRoleId }) {
  const requestedWorkId = String(staticWorkId || "").trim();
  const requestedRoleId = String(staticRoleId || "").trim();
  const work = Array.isArray(staticManifest?.photographyWorks)
    ? staticManifest.photographyWorks.find((item) => item?.id === requestedWorkId)
    : undefined;
  const role = Array.isArray(work?.roles)
    ? work.roles.find((item) => item?.id === requestedRoleId)
    : undefined;

  if (!requestedWorkId || !requestedRoleId || !work || !role) {
    throw new Error("静态作品或角色不存在。");
  }

  return {
    staticWorkId: work.id,
    staticRoleId: role.id,
    roleSlug: getStaticRoleSlug(role.id, work.id),
    imageCount: Array.isArray(role.images) ? role.images.length : 0
  };
}

export async function saveStaticPortfolioImages(env, { staticWorkId, staticRoleId, images }) {
  if (!Array.isArray(images)) throw new Error("Images are required");
  if (images.length === 0) return { count: 0 };
  const statements = images.map((image) => {
    const normalized = normalizeImageMetadata(image);
    return env.DB.prepare(INSERT_STATIC_PORTFOLIO_IMAGE_SQL).bind(
      staticWorkId,
      staticRoleId,
      normalized.publicId,
      normalized.secureUrl,
      normalized.coverThumbUrl,
      normalized.filename,
      normalized.alt,
      normalized.width,
      normalized.height,
      normalized.format,
      normalized.bytes,
      normalized.sortOrder
    );
  });
  if (env.DB.batch) await env.DB.batch(statements);
  else for (const statement of statements) await statement.run();
  return { count: images.length };
}

export async function setPortfolioCover(env, { targetType, targetId, imageId }) {
  const table = getCoverTable(targetType);

  return env.DB.prepare(
    `UPDATE ${table} SET cover_image_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(imageId, targetId).run();
}

export async function updatePortfolioVisibility(env, { targetType, targetId, isHidden }) {
  const table = getVisibilityTable(targetType);

  return env.DB.prepare(
    `UPDATE ${table} SET is_hidden = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(isHidden ? 1 : 0, targetId).run();
}

export async function getDynamicPortfolioRows(env, { includeHidden = false } = {}) {
  const whereClause = includeHidden ? "" : " WHERE is_hidden = 0";
  const [works, roles, images, staticImages, staticRoles, staticCoverOverrides] = await Promise.all([
    env.DB.prepare(`SELECT * FROM portfolio_works${whereClause} ORDER BY sort_order, id`).all(),
    env.DB.prepare(`SELECT * FROM portfolio_roles${whereClause} ORDER BY sort_order, id`).all(),
    env.DB.prepare(`SELECT * FROM portfolio_images${whereClause} ORDER BY sort_order, id`).all(),
    env.DB.prepare(`SELECT * FROM portfolio_static_images${whereClause} ORDER BY sort_order, id`).all(),
    env.DB.prepare(`SELECT * FROM portfolio_static_roles${whereClause} ORDER BY sort_order, id`).all(),
    env.DB.prepare("SELECT * FROM portfolio_static_cover_overrides ORDER BY target_type, target_id, id").all()
  ]);

  return {
    works: works.results || [],
    roles: roles.results || [],
    images: images.results || [],
    staticImages: staticImages.results || [],
    staticRoles: staticRoles.results || [],
    staticCoverOverrides: staticCoverOverrides.results || []
  };
}

export async function getMergedPortfolioData(env, staticManifest) {
  if (!env?.DB) return staticManifest;

  const rows = await getDynamicPortfolioRows(env);
  const extendedStaticManifest = applyStaticPortfolioExtensions(staticManifest, {
    staticImages: rows.staticImages,
    staticRoles: rows.staticRoles,
    coverOverrides: rows.staticCoverOverrides
  });
  return mergePortfolioData(extendedStaticManifest, normalizeDynamicPortfolio(rows));
}

export function toCoverThumbUrl(env, publicId) {
  return buildCloudinaryCoverUrl({
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    publicId
  });
}

const INSERT_PORTFOLIO_IMAGE_SQL = `INSERT INTO portfolio_images (
  work_id,
  role_id,
  cloudinary_public_id,
  secure_url,
  cover_thumb_url,
  filename,
  alt,
  width,
  height,
  format,
  bytes,
  sort_order
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const INSERT_STATIC_PORTFOLIO_IMAGE_SQL = `INSERT INTO portfolio_static_images (
  static_work_id,
  static_role_id,
  cloudinary_public_id,
  secure_url,
  cover_thumb_url,
  filename,
  alt,
  width,
  height,
  format,
  bytes,
  sort_order
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

function cleanRequiredText(value, message) {
  const text = String(value || "").trim();
  if (!text) {
    throw new Error(message);
  }

  return text;
}

function cleanRequiredNumber(value, message) {
  if (value == null || String(value).trim() === "") {
    throw new Error(message);
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(message);
  }

  return number;
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

  return json({ error: "管理员验证失败。" }, 401);
}

async function handleVisibilityRequest(request, env, targetType, targetId) {
  const unauthorized = await requireAdminOrJson(request, env);
  if (unauthorized) return unauthorized;

  try {
    const body = await readJson(request);
    return json(await updatePortfolioVisibility(env, {
      targetType,
      targetId,
      isHidden: body?.isHidden
    }));
  } catch (error) {
    return json({ error: error.message }, 400);
  }
}

function normalizeImageMetadata(image) {
  return {
    publicId: cleanRequiredText(image?.publicId, "Image publicId is required"),
    secureUrl: cleanRequiredText(image?.secureUrl, "Image secureUrl is required"),
    coverThumbUrl: cleanRequiredText(image?.coverThumbUrl, "Image coverThumbUrl is required"),
    filename: cleanRequiredText(image?.filename, "Image filename is required"),
    alt: cleanRequiredText(image?.alt, "Image alt is required"),
    width: image?.width ?? null,
    height: image?.height ?? null,
    format: image?.format ?? null,
    bytes: image?.bytes ?? null,
    sortOrder: cleanRequiredNumber(image?.sortOrder, "Image sortOrder is required")
  };
}

function getCoverTable(targetType) {
  if (targetType === "work") return "portfolio_works";
  if (targetType === "role") return "portfolio_roles";

  throw new Error("Invalid cover target type");
}

function getVisibilityTable(targetType) {
  if (targetType === "work") return "portfolio_works";
  if (targetType === "role") return "portfolio_roles";
  if (targetType === "image") return "portfolio_images";

  throw new Error("Invalid visibility target type");
}
