export const ROLE_IMAGE_BATCH_SIZE = 5;

export function resolveImageSrc(src = "") {
  if (src.startsWith("/")) return src;
  return `/${src.replace(/^\.\.\//, "")}`;
}

export function getWorkHref(workId) {
  return `/portfolio/work/${encodeURIComponent(workId)}`;
}

export function getRoleHref(roleId) {
  return `/portfolio/role/${encodeURIComponent(roleId)}`;
}

export function getProjectHref(href = "") {
  const routes = {
    "../index.html": "/",
    "nailong.html": "/nailong",
    "genshin.html": "/genshin"
  };

  return routes[href] || href;
}

export function findWorkById(manifest, workId) {
  return (manifest?.photographyWorks || []).find((work) => work.id === workId);
}

export function findRoleById(manifest, roleId) {
  for (const work of manifest?.photographyWorks || []) {
    const role = (work.roles || []).find((candidate) => candidate.id === roleId);
    if (role) return { work, role };
  }

  return undefined;
}

export function getImageBatch(images = [], start = 0, size = ROLE_IMAGE_BATCH_SIZE) {
  return images.slice(start, start + size);
}

export function withoutThumbnails(images = []) {
  return images.filter((image) => !image.src.includes(".thumb."));
}

export function renderPhotographyWorks(works = []) {
  if (!works.length) return '<p class="muted">暂无摄影作品</p>';

  return `<div class="portfolio-grid portfolio-work-grid">${works
    .map(
      (work, index) => `
        <a class="portfolio-thumb portfolio-work-card" href="${getWorkHref(work.id)}">
          <img
            src="${resolveImageSrc(work.coverThumb)}"
            alt="${work.title} 封面"
            loading="${index === 0 ? "eager" : "lazy"}"
            width="480"
            height="360"
            ${index === 0 ? 'fetchpriority="high"' : ""}
          >
          <span class="portfolio-card-text">
            <strong>${work.title}</strong>
            <small>${work.roleCount} 个角色 / ${work.imageCount} 张图片</small>
          </span>
        </a>`
    )
    .join("")}</div>`;
}

export function renderWorkRoles(work) {
  const roles = work?.roles || [];
  if (!roles.length) return '<p class="muted">这个作品暂时没有角色。</p>';

  return `<div class="portfolio-grid portfolio-role-grid">${roles
    .map(
      (role, index) => `
        <a class="portfolio-thumb portfolio-role-card" href="${getRoleHref(role.id)}">
          <img
            src="${resolveImageSrc(role.coverThumb)}"
            alt="${work.title} ${role.title} 封面"
            loading="${index === 0 ? "eager" : "lazy"}"
            width="480"
            height="360"
            ${index === 0 ? 'fetchpriority="high"' : ""}
          >
          <span class="portfolio-card-text">
            <strong>${role.title}</strong>
            <small>${role.imageCount} 张图片</small>
          </span>
        </a>`
    )
    .join("")}</div>`;
}

export function renderRoleImages(images = []) {
  return withoutThumbnails(images)
    .map(
      (image) => `
        <a class="portfolio-thumb portfolio-original-thumb" href="${resolveImageSrc(image.src)}" target="_blank" rel="noopener noreferrer">
          <img src="${resolveImageSrc(image.src)}" alt="${image.alt}" loading="lazy" width="480" height="640">
        </a>`
    )
    .join("");
}
