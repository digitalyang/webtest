export function isStaticCoverOnlyImage(image) {
  return String(image?.cloudinary_public_id || "").startsWith("webtest/portfolio-covers/");
}

export function filterGalleryStaticImages(images) {
  return (images || []).filter((image) => !isStaticCoverOnlyImage(image));
}
