export function buildCnPhotoOptions(role, snapshot = {}) {
  if (!role) return [];

  if (role.workSource === "dynamic") {
    return (snapshot.images || [])
      .filter((image) => String(image.role_id) === String(role.id))
      .map((image) => buildPhotoOption({
        imageSource: "dynamic",
        imageKey: image.id,
        label: image.filename || image.cloudinary_public_id || `#${image.id}`,
        snapshot
      }));
  }

  const staticLocalOptions = (snapshot.staticLocalImages || [])
    .filter((image) => String(image.roleId) === String(role.id))
    .map((image) => buildPhotoOption({
      imageSource: "static-local",
      imageKey: image.imageKey,
      label: image.label || image.filename || image.imageKey,
      snapshot
    }));
  const staticImageOptions = (snapshot.staticImages || [])
    .filter((image) => String(image.static_role_id) === String(role.id))
    .map((image) => buildPhotoOption({
      imageSource: "static-image",
      imageKey: image.id,
      label: image.filename || image.cloudinary_public_id || `#${image.id}`,
      snapshot
    }));

  return [...staticLocalOptions, ...staticImageOptions];
}

export function getImageCreditName(snapshot = {}, imageSource, imageKey) {
  const credit = (snapshot.imageCredits || []).find((item) =>
    String(item.image_source ?? item.imageSource) === String(imageSource) &&
    String(item.image_key ?? item.imageKey) === String(imageKey)
  );
  const name = String(credit?.coser_name ?? credit?.coserName ?? "").trim();

  return name && name !== "佚名" ? name : "";
}

function buildPhotoOption({ imageSource, imageKey, label, snapshot }) {
  return {
    imageSource,
    imageKey: String(imageKey),
    label,
    value: `${imageSource}:${imageKey}`,
    coserName: getImageCreditName(snapshot, imageSource, imageKey)
  };
}
