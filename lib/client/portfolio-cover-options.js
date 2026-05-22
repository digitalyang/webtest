export function buildCoverPhotoOptions(role, snapshot = {}) {
  if (!role) return [];

  if (role.workSource === "dynamic") {
    return (snapshot.images || [])
      .filter((image) => String(image.role_id) === String(role.id))
      .map((image) => ({
        source: "dynamic",
        id: image.id,
        label: image.filename || image.cloudinary_public_id || `#${image.id}`,
        value: `dynamic:${image.id}`
      }));
  }

  return (snapshot.staticImages || [])
    .filter((image) => String(image.static_role_id) === String(role.id))
    .map((image) => ({
      source: "static",
      id: image.id,
      label: image.filename || image.cloudinary_public_id || `#${image.id}`,
      value: `static:${image.id}`
    }));
}

export function getCoverPayload({
  coverTargetType,
  selectedCoverWork,
  selectedCoverRole,
  selectedCoverPhoto
}) {
  if (!selectedCoverWork) {
    throw new Error("请选择作品。");
  }
  if (!selectedCoverRole) {
    throw new Error("请选择角色。");
  }
  if (!selectedCoverPhoto) {
    throw new Error("请选择封面照片。");
  }

  const imageId = selectedCoverPhoto.id;
  if (coverTargetType === "work") {
    return selectedCoverWork.source === "dynamic"
      ? { targetType: "work", targetId: selectedCoverWork.id, imageId }
      : { targetType: "static-work", targetId: selectedCoverWork.id, imageId };
  }

  return selectedCoverRole.workSource === "dynamic"
    ? { targetType: "role", targetId: selectedCoverRole.id, imageId }
    : { targetType: "static-role", targetId: selectedCoverRole.id, imageId };
}
