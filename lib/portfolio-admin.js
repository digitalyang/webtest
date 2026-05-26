import { isStaticCoverOnlyImage } from "./portfolio-static-images.js";

const CLOUDINARY_PUBLIC_ID_PREFIX = "webtest/portfolio/";

export function isValidPortfolioSlug(value) {
  return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function getExtensionFromFile(file = {}) {
  const name = file.name || "";
  const filenameExtension = name.split(/[\\/]/).pop()?.match(/\.([a-z0-9]+)$/i)?.[1];
  const mimeExtension = file.type?.startsWith("image/") ? file.type.split("/").pop()?.split("+")[0] : undefined;
  const extension = (filenameExtension || mimeExtension || "jpg").toLowerCase();

  return extension === "jpeg" ? "jpg" : extension;
}

export function buildImageUploadPlan({ workSlug, roleSlug, startIndex = 1, files = [] }) {
  if (!isValidPortfolioSlug(workSlug) || !isValidPortfolioSlug(roleSlug)) {
    throw new Error("Invalid portfolio slug");
  }

  return Array.from(files, (file, offset) => {
    const index = startIndex + offset;
    const basename = `${roleSlug}_${index}`;

    return {
      index,
      filename: `${basename}.${getExtensionFromFile(file)}`,
      publicId: `${CLOUDINARY_PUBLIC_ID_PREFIX}${workSlug}/${roleSlug}/${basename}`
    };
  });
}

export function buildStaticRoleId(staticWorkId, roleSlug) {
  return `${staticWorkId}-${roleSlug}`;
}

export function getStaticRoleSlug(staticRoleId, staticWorkId) {
  const prefix = `${staticWorkId}-`;
  return String(staticRoleId).startsWith(prefix) ? String(staticRoleId).slice(prefix.length) : staticRoleId;
}

export function buildStaticImageUploadPlan({ staticWorkId, staticRoleId, startIndex = 1, files = [] }) {
  return buildImageUploadPlan({
    workSlug: staticWorkId,
    roleSlug: getStaticRoleSlug(staticRoleId, staticWorkId),
    startIndex,
    files
  });
}

export function buildCloudinaryCoverUrl({ cloudName, publicId }) {
  return `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,w_480,f_webp,q_auto/${publicId}.webp`;
}

export function validateCloudinaryUpload({ cloudName, publicId, secureUrl }) {
  if (!cloudName || !publicId?.startsWith(CLOUDINARY_PUBLIC_ID_PREFIX) || !secureUrl) {
    return { ok: false };
  }

  try {
    const url = new URL(secureUrl);
    const isExpectedHost = url.protocol === "https:" && url.hostname === "res.cloudinary.com";
    const assetPublicId = isExpectedHost ? extractCloudinaryAssetPublicId(url.pathname, cloudName) : undefined;

    return { ok: assetPublicId === publicId };
  } catch {
    return { ok: false };
  }
}

export function resolveCoverImage(images = [], coverImageId) {
  const visibleImages = images.filter((image) => !isHidden(image));
  const selectedImage = visibleImages.find((image) => coverImageId != null && idsMatch(image.id, coverImageId));

  return selectedImage || visibleImages[0];
}

export function normalizeDynamicPortfolio({ works = [], roles = [], images = [], imageCredits = [] } = {}) {
  const visibleImages = images.filter((image) => !isHidden(image)).sort(compareRows);
  const visibleRoles = roles.filter((role) => !isHidden(role)).sort(compareRows);
  const creditMap = buildImageCreditMap(imageCredits);

  return {
    photographyWorks: works
      .filter((work) => !isHidden(work))
      .sort(compareRows)
      .map((work) => {
        const workRoles = visibleRoles.filter((role) => idsMatch(role.work_id, work.id));
        const publicWorkImages = visibleImages.filter((image) =>
          workRoles.some((role) => idsMatch(image.role_id, role.id))
        );
        const publicRoles = workRoles
          .map((role) => normalizeRole(work, role, publicWorkImages, creditMap))
          .filter((role) => role.imageCount > 0);
        const explicitWorkCover = findExplicitWorkCover(work, publicWorkImages);
        const fallbackCoverThumb = publicRoles.find((role) => role.coverThumb)?.coverThumb || "";
        const imageCount = publicRoles.reduce((count, role) => count + role.imageCount, 0);

        return {
          id: work.slug,
          title: work.title,
          coverThumb: explicitWorkCover?.coverThumb || fallbackCoverThumb,
          roleCount: publicRoles.length,
          imageCount,
          roles: publicRoles
        };
      })
      .filter((work) => work.imageCount > 0)
  };
}

export function mergePortfolioData(staticManifest = {}, dynamicPortfolio = {}) {
  const staticWorks = staticManifest.photographyWorks || [];
  const dynamicWorks = dynamicPortfolio.photographyWorks || [];
  const workIds = new Set(staticWorks.map((work) => work.id));
  const roleIds = new Set(staticWorks.flatMap((work) => (work.roles || []).map((role) => role.id)));

  for (const work of dynamicWorks) {
    if (workIds.has(work.id)) {
      throw new Error(`Duplicate portfolio work id: ${work.id}`);
    }
    workIds.add(work.id);

    for (const role of work.roles || []) {
      if (roleIds.has(role.id)) {
        throw new Error(`Duplicate portfolio role id: ${role.id}`);
      }
      roleIds.add(role.id);
    }
  }

  return {
    ...staticManifest,
    photographyWorks: [...staticWorks, ...dynamicWorks]
  };
}

export function applyStaticPortfolioExtensions(
  staticManifest = {},
  { staticImages = [], staticRoles = [], coverOverrides = [], imageCredits = [] } = {}
) {
  const visibleStaticImages = staticImages.filter((image) => !isHidden(image)).sort(compareRows);
  const appendedImages = visibleStaticImages.filter((image) => !isStaticCoverOnlyImage(image));
  const appendedRoles = staticRoles.filter((role) => !isHidden(role)).sort(compareRows);
  const creditMap = buildImageCreditMap(imageCredits);
  const coverImagesById = new Map(visibleStaticImages.map((image) => [String(image.id), normalizeImage(image, creditMap, "static-image")]));
  const roleCoverOverrides = new Map(
    coverOverrides
      .filter((override) => override.target_type === "role")
      .map((override) => [String(override.target_id), coverImagesById.get(String(override.image_id))])
      .filter(([, image]) => image)
  );
  const workCoverOverrides = new Map(
    coverOverrides
      .filter((override) => override.target_type === "work")
      .map((override) => [String(override.target_id), coverImagesById.get(String(override.image_id))])
      .filter(([, image]) => image)
  );

  return {
    ...staticManifest,
    photographyWorks: (staticManifest.photographyWorks || []).map((work) => {
      const existingRoles = (work.roles || []).map((role) => ({
        ...role,
        images: buildStaticRoleGalleryImages(role, appendedImages, creditMap)
      }));
      const existingRoleIds = new Set(existingRoles.map((role) => String(role.id)));
      const newRoles = appendedRoles
        .filter((role) => idsMatch(role.static_work_id, work.id))
        .filter((role) => !existingRoleIds.has(buildStaticRoleId(role.static_work_id, role.slug)))
        .map((role) => ({
          id: buildStaticRoleId(role.static_work_id, role.slug),
          workId: role.static_work_id,
          title: role.title,
          coverThumb: "",
          imageCount: 0,
          images: [],
          isAppendedStaticRole: true
        }));
      const roles = [...existingRoles, ...newRoles].map((role) => {
        const images = buildStaticRoleGalleryImages(role, appendedImages, creditMap);
        const coverOverride = roleCoverOverrides.get(String(role.id));
        const fallbackCoverThumb = resolveRoleGalleryCoverThumb(role.id, appendedImages);

        return {
          ...role,
          coverThumb: coverOverride?.coverThumb || fallbackCoverThumb,
          imageCount: images.length,
          images
        };
      })
        .filter((role) => !role.isAppendedStaticRole || role.imageCount > 0)
        .map(({ isAppendedStaticRole, ...role }) => role);
      const imageCount = roles.reduce((count, role) => count + role.imageCount, 0);
      const workCoverOverride = workCoverOverrides.get(String(work.id));
      const fallbackWorkCoverThumb = roles.find((role) => role.coverThumb)?.coverThumb || "";

      return {
        ...work,
        coverThumb: workCoverOverride?.coverThumb || fallbackWorkCoverThumb,
        roleCount: roles.length,
        imageCount,
        roles
      };
    })
  };
}

function buildStaticRoleGalleryImages(role, galleryImages, creditMap) {
  const cloudImages = galleryImages
    .filter((image) => idsMatch(image.static_role_id, role.id))
    .sort(compareRows)
    .map((image) => {
      const normalizedImage = normalizeImage(image, creditMap, "static-image");
      return addCoserName({ src: normalizedImage.src, alt: normalizedImage.alt }, normalizedImage.coserName);
    });

  if (cloudImages.length > 0 || !allowLocalStaticFallback()) {
    return cloudImages;
  }

  return (role.images || []).map((image) => addCoserName(image, getImageCredit(creditMap, "static-local", image.src)));
}

function resolveRoleGalleryCoverThumb(roleId, galleryImages) {
  const image = galleryImages
    .filter((row) => idsMatch(row.static_role_id, roleId))
    .filter((row) => !isHidden(row))
    .filter((row) => !isStaticCoverOnlyImage(row))
    .sort(compareRows)[0];

  return image?.cover_thumb_url || "";
}

function allowLocalStaticFallback() {
  return process.env.ALLOW_LOCAL_STATIC_FALLBACK === "1";
}

export function buildAdminPortfolioOptions({ staticManifest = {}, dynamicRows = {}, staticRoles = [] } = {}) {
  const staticWorks = (staticManifest.photographyWorks || []).filter((work) => !isHidden(work));
  const dynamicWorks = (dynamicRows.works || []).filter((work) => !isHidden(work)).sort(compareRows);
  const dynamicRoles = (dynamicRows.roles || []).filter((role) => !isHidden(role)).sort(compareRows);
  const visibleStaticRoles = staticRoles.filter((role) => !isHidden(role)).sort(compareRows);
  const rolesByWork = {};

  for (const work of staticWorks) {
    const workKey = `static:${work.id}`;
    const manifestRoles = (work.roles || []).filter((role) => !isHidden(role));
    const manifestRoleIds = new Set(manifestRoles.map((role) => String(role.id)));
    const workStaticRoles = visibleStaticRoles
      .filter((role) => idsMatch(role.static_work_id, work.id))
      .filter((role) => !manifestRoleIds.has(buildStaticRoleId(role.static_work_id, role.slug)));

    rolesByWork[workKey] = [
      ...manifestRoles.map((role) =>
        buildRoleOption({
          source: "static",
          workSource: "static",
          workId: work.id,
          id: role.id,
          slug: role.slug || getStaticRoleSlug(role.id, work.id),
          title: role.title
        })
      ),
      ...workStaticRoles.map((role) =>
        buildRoleOption({
          source: "static-dynamic",
          workSource: "static",
          workId: work.id,
          id: buildStaticRoleId(role.static_work_id, role.slug),
          slug: role.slug,
          title: role.title
        })
      )
    ];
  }

  for (const work of dynamicWorks) {
    const workKey = `dynamic:${work.id}`;
    rolesByWork[workKey] = dynamicRoles
      .filter((role) => idsMatch(role.work_id, work.id))
      .map((role) =>
        buildRoleOption({
          source: "dynamic",
          workSource: "dynamic",
          workId: work.id,
          id: role.id,
          slug: role.slug,
          title: role.title
        })
      );
  }

  return {
    works: [
      ...staticWorks.map((work) => buildWorkOption({ source: "static", id: work.id, slug: work.id, title: work.title })),
      ...dynamicWorks.map((work) =>
        buildWorkOption({ source: "dynamic", id: work.id, slug: work.slug, title: work.title })
      )
    ],
    rolesByWork
  };
}

export function buildStaticLocalImageOptions(staticManifest = {}) {
  return (staticManifest.photographyWorks || []).flatMap((work) =>
    (work.roles || []).flatMap((role) =>
      (role.images || [])
        .filter((image) => image?.src && !image.src.includes(".thumb."))
        .map((image) => ({
          imageSource: "static-local",
          imageKey: image.src,
          workId: work.id,
          workTitle: work.title,
          roleId: role.id,
          roleTitle: role.title,
          filename: filenameFromPath(image.src),
          label: filenameFromPath(image.src),
          value: `static-local:${image.src}`
        }))
    )
  );
}

function normalizeRole(work, role, visibleImages, creditMap) {
  const roleImages = visibleImages
    .filter((image) => idsMatch(image.role_id, role.id))
    .map((image) => normalizeImage(image, creditMap, "dynamic"));
  const coverImage = resolveCoverImage(roleImages, role.cover_image_id);

  return {
    id: `${work.slug}-${role.slug}`,
    title: role.title,
    coverThumb: coverImage?.coverThumb || "",
    imageCount: roleImages.length,
    images: roleImages.map(({ src, alt, coserName }) => addCoserName({ src, alt }, coserName))
  };
}

function normalizeImage(image, creditMap, imageSource) {
  return {
    id: image.id,
    src: image.secure_url,
    alt: image.alt || "",
    coverThumb: image.cover_thumb_url,
    coserName: getImageCredit(creditMap, imageSource, image.id),
    isHidden: isHidden(image)
  };
}

function buildImageCreditMap(imageCredits = []) {
  return new Map(
    imageCredits
      .map((credit) => {
        const name = normalizeCoserName(credit?.coser_name ?? credit?.coserName);
        if (!name) return undefined;
        return [`${credit.image_source ?? credit.imageSource}:${credit.image_key ?? credit.imageKey}`, name];
      })
      .filter(Boolean)
  );
}

function getImageCredit(creditMap, imageSource, imageKey) {
  return creditMap?.get(`${imageSource}:${imageKey}`) || "";
}

function addCoserName(image, coserName) {
  return coserName ? { ...image, coserName } : image;
}

function normalizeCoserName(value) {
  const text = String(value || "").trim();
  return text && text !== "佚名" ? text : "";
}

function filenameFromPath(src = "") {
  return String(src).split("/").pop() || String(src);
}

function buildWorkOption({ source, id, slug, title }) {
  return {
    source,
    id,
    slug,
    title,
    label: title,
    value: `${source}:${id}`
  };
}

function buildRoleOption({ source, workSource, workId, id, slug, title }) {
  return {
    source,
    workSource,
    workId,
    id,
    slug,
    title,
    label: title,
    value: `${source}:${id}`
  };
}

function extractCloudinaryAssetPublicId(pathname, cloudName) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== cloudName || segments[1] !== "image" || segments[2] !== "upload") {
    return undefined;
  }

  const uploadSegments = segments.slice(3);
  const assetSegments = /^v\d+$/.test(uploadSegments[0]) ? uploadSegments.slice(1) : uploadSegments;
  if (assetSegments.length === 0) return undefined;

  const assetPath = assetSegments.join("/");
  return decodeURIComponent(assetPath).replace(/\.[^/.]+$/, "");
}

function findExplicitWorkCover(work, visibleImages) {
  if (work.cover_image_id == null) return undefined;

  return visibleImages
    .filter((image) => idsMatch(image.work_id, work.id))
    .map((image) => normalizeImage(image))
    .find((image) => idsMatch(image.id, work.cover_image_id));
}

function compareRows(left, right) {
  const sortDifference = getSortOrder(left) - getSortOrder(right);
  if (sortDifference !== 0) return sortDifference;

  return compareIds(left.id, right.id);
}

function getSortOrder(row) {
  const sortOrder = Number(row?.sort_order);
  return Number.isFinite(sortOrder) ? sortOrder : 0;
}

function compareIds(left, right) {
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }

  return String(left).localeCompare(String(right));
}

function idsMatch(left, right) {
  return String(left) === String(right);
}

function isHidden(row) {
  return row?.isHidden === true || row?.is_hidden === true || row?.is_hidden === 1;
}
