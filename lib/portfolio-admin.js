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

export function normalizeDynamicPortfolio({ works = [], roles = [], images = [] } = {}) {
  const visibleImages = images.filter((image) => !isHidden(image)).sort(compareRows);
  const visibleRoles = roles.filter((role) => !isHidden(role)).sort(compareRows);

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
          .map((role) => normalizeRole(work, role, publicWorkImages))
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

function normalizeRole(work, role, visibleImages) {
  const roleImages = visibleImages
    .filter((image) => idsMatch(image.role_id, role.id))
    .map((image) => normalizeImage(image));
  const coverImage = resolveCoverImage(roleImages, role.cover_image_id);

  return {
    id: `${work.slug}-${role.slug}`,
    title: role.title,
    coverThumb: coverImage?.coverThumb || "",
    imageCount: roleImages.length,
    images: roleImages.map(({ src, alt }) => ({ src, alt }))
  };
}

function normalizeImage(image) {
  return {
    id: image.id,
    src: image.secure_url,
    alt: image.alt || "",
    coverThumb: image.cover_thumb_url,
    isHidden: isHidden(image)
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
