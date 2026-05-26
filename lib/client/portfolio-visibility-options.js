const TARGET_TYPES_REQUIRING_ROLE = new Set(["role", "image", "static-image"]);
const TARGET_TYPES_REQUIRING_IMAGE = new Set(["image", "static-image"]);
const VALID_TARGET_TYPES = new Set(["work", "role", "image", "static-image"]);

export function buildVisibilityWorkOptions(snapshot = {}) {
  const dynamicWorks = (snapshot.works || []).map((work) => ({
    source: "dynamic",
    id: work.id,
    value: `dynamic:${work.id}`,
    label: withHiddenSuffix(work.title || work.slug || `#${work.id}`, isHidden(work))
  }));
  const dynamicValues = new Set(dynamicWorks.map((work) => work.value));
  const staticWorks = (snapshot.adminOptions?.works || [])
    .filter((work) => work.source === "static" && !dynamicValues.has(work.value))
    .map((work) => ({
      source: "static",
      id: work.id,
      value: work.value || `static:${work.id}`,
      label: withHiddenSuffix(
        sanitizeSourceLabel(work.label || work.title || String(work.id), String(work.id)),
        isHidden(work)
      )
    }));

  return [...dynamicWorks, ...staticWorks];
}

export function buildVisibilityRoleOptions(snapshot = {}, workKey = "") {
  const work = parseOptionKey(workKey);
  if (!work) return [];

  if (work.source === "dynamic") {
    return (snapshot.roles || [])
      .filter((role) => String(role.work_id) === String(work.id))
      .map((role) => ({
        source: "dynamic",
        workSource: "dynamic",
        id: role.id,
        value: `dynamic:${role.id}`,
        label: withHiddenSuffix(role.title || role.slug || `#${role.id}`, isHidden(role))
      }));
  }

  const staticRoleRows = new Map(
    (snapshot.staticRoles || []).map((role) => [buildStaticPublicRoleId(role), role])
  );
  const matchedStaticRoleIds = new Set();

  const adminRoleOptions = (snapshot.adminOptions?.rolesByWork?.[workKey] || []).map((role) => {
    const publicRoleId = String(role.id);
    const staticRole = staticRoleRows.get(publicRoleId);
    if (staticRole) {
      matchedStaticRoleIds.add(publicRoleId);
      return buildStaticRoleOption(staticRole, publicRoleId, role.label);
    }

    return {
      source: "static-manifest",
      workSource: "static",
      id: publicRoleId,
      value: `static-manifest:${publicRoleId}`,
      label: role.label || publicRoleId
    };
  });

  const staticRowOptions = (snapshot.staticRoles || [])
    .filter((role) => String(role.static_work_id) === String(work.id))
    .map((role) => [buildStaticPublicRoleId(role), role])
    .filter(([publicRoleId]) => !matchedStaticRoleIds.has(publicRoleId))
    .map(([publicRoleId, role]) => buildStaticRoleOption(role, publicRoleId));

  return [...adminRoleOptions, ...staticRowOptions];
}

export function buildVisibilityImageOptions(snapshot = {}, targetType = "", roleKey = "") {
  const role = parseOptionKey(roleKey);
  if (!role) return [];

  if (targetType === "image" && role.source === "dynamic") {
    return (snapshot.images || [])
      .filter((image) => String(image.role_id) === String(role.id))
      .map((image) => ({
        source: "dynamic",
        id: image.id,
        value: `dynamic:${image.id}`,
        label: withHiddenSuffix(getImageLabel(image), isHidden(image))
      }));
  }

  if (targetType === "static-image") {
    const staticRoleId = role.source === "static-role"
      ? findStaticRolePublicId(snapshot, role.id)
      : role.id;

    return (snapshot.staticImages || [])
      .filter((image) => String(image.static_role_id) === String(staticRoleId))
      .map((image) => ({
        source: "static",
        id: image.id,
        value: `static:${image.id}`,
        label: withHiddenSuffix(getImageLabel(image), isHidden(image))
      }));
  }

  return [];
}

export function getVisibilityPayload({
  targetType,
  workKey = "",
  roleKey = "",
  imageKey = "",
  isHidden
}) {
  if (!VALID_TARGET_TYPES.has(targetType)) {
    throw new Error("隐藏目标类型无效。");
  }

  const work = parseOptionKey(workKey);
  if (!work) {
    throw new Error("请选择作品。");
  }

  const role = parseOptionKey(roleKey);
  if (TARGET_TYPES_REQUIRING_ROLE.has(targetType) && !role) {
    throw new Error("请选择角色。");
  }

  const image = parseOptionKey(imageKey);
  if (TARGET_TYPES_REQUIRING_IMAGE.has(targetType) && !image) {
    throw new Error("请选择图片。");
  }

  if (targetType === "work") {
    assertOptionSource(work, ["dynamic", "static"]);

    return {
      targetType: work.source === "static" ? "static-work" : "work",
      targetId: work.id,
      isHidden: Boolean(isHidden)
    };
  }

  if (targetType === "role") {
    if (role.source === "static-manifest") {
      throw new Error("该静态角色不能直接隐藏，请选择追加图片或追加角色。");
    }
    assertOptionSource(role, ["dynamic", "static-role"]);

    return {
      targetType: role.source === "static-role" ? "static-role" : "role",
      targetId: role.id,
      isHidden: Boolean(isHidden)
    };
  }

  if (targetType === "image") {
    assertOptionSource(image, ["dynamic"]);
    return { targetType: "image", targetId: image.id, isHidden: Boolean(isHidden) };
  }

  assertOptionSource(image, ["static"]);
  return { targetType: "static-image", targetId: `static:${image.id}`, isHidden: Boolean(isHidden) };
}

function parseOptionKey(value) {
  const [source, ...idParts] = String(value || "").split(":");
  const id = idParts.join(":");
  if (!source || !id) return undefined;

  return {
    source,
    id: shouldUseNumericId(source, id) ? Number(id) : id
  };
}

function shouldUseNumericId(source, id) {
  return (source === "dynamic" || source === "static-role" || source === "static") && /^\d+$/.test(id);
}

function buildStaticPublicRoleId(role) {
  return `${role.static_work_id}-${role.slug}`;
}

function buildStaticRoleOption(role, publicRoleId, label) {
  return {
    source: "static-role",
    workSource: "static",
    id: role.id,
    roleId: publicRoleId,
    value: `static-role:${role.id}`,
    label: withHiddenSuffix(label || role.title || role.slug || publicRoleId, isHidden(role))
  };
}

function findStaticRolePublicId(snapshot, staticRoleRowId) {
  const row = (snapshot.staticRoles || []).find((role) => String(role.id) === String(staticRoleRowId));
  return row ? buildStaticPublicRoleId(row) : staticRoleRowId;
}

function getImageLabel(image) {
  return image.filename || image.cloudinary_public_id || `#${image.id}`;
}

function withHiddenSuffix(label, hidden) {
  return hidden ? `${label}（隐藏）` : label;
}

function sanitizeSourceLabel(label, fallback) {
  const cleaned = String(label || "")
    .trim()
    .replace(/^(?:\s*(?:static|dynamic|old[\s_-]+work|old[\s_-]+album|旧作品|旧相册)\s*[:：/|()[\]{}\-_.]+\s*)+/i, "")
    .replace(/^[\s:：/|()[\]{}\-_.]+|[\s:：/|()[\]{}\-_.]+$/g, "");

  if (cleaned && !isOnlySourceLabel(cleaned)) {
    return cleaned;
  }

  return fallback;
}

function isOnlySourceLabel(label) {
  return /^(?:static|dynamic|old[\s_-]+work|old[\s_-]+album|旧作品|旧相册)$/i.test(label.trim());
}

function isHidden(row) {
  return row?.isHidden === true || row?.is_hidden === true || row?.is_hidden === 1;
}

function assertOptionSource(option, allowedSources) {
  if (!allowedSources.includes(option.source)) {
    throw new Error("隐藏目标类型无效。");
  }
}
