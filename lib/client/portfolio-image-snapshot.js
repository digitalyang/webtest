import { filterGalleryStaticImages } from "../portfolio-static-images.js";

function isHidden(row) {
  return row?.isHidden === true || row?.is_hidden === true || row?.is_hidden === 1;
}

export function buildPortfolioImageSnapshotItems(snapshot = {}) {
  const dynamicItems = (snapshot.images || []).map((image) => ({
    key: `dynamic-${image.id}`,
    rowKind: "dynamic",
    id: image.id,
    roleLabel: `role:${image.role_id}`,
    label: image.filename || image.cloudinary_public_id || `#${image.id}`,
    isHidden: isHidden(image),
    hideTargetType: "image",
    hideTargetId: image.id
  }));

  const staticItems = filterGalleryStaticImages(snapshot.staticImages).map((image) => ({
    key: `static-${image.id}`,
    rowKind: "static",
    id: image.id,
    roleLabel: `role:${image.static_role_id}`,
    label: image.filename || image.cloudinary_public_id || `#${image.id}`,
    isHidden: isHidden(image),
    hideTargetType: "static-image",
    hideTargetId: `static:${image.id}`
  }));

  return [...dynamicItems, ...staticItems];
}
