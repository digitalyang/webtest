import { resolveImageSrc } from "./portfolio.js";

export function getRoleHref(roleId) {
  return `portfolio-role.html?id=${encodeURIComponent(roleId)}`;
}

export function findWorkById(manifest, workId) {
  return (manifest?.photographyWorks || []).find((work) => work.id === workId);
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

function getCurrentId() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("id");
}

export async function initPortfolioWork(root = typeof document !== "undefined" ? document : undefined) {
  if (!root) return;

  const container = root.querySelector("#portfolioWorkApp");
  if (!container) return;

  const workId = getCurrentId();
  if (!workId) {
    container.innerHTML = '<p class="muted">没有指定作品。</p><p class="muted"><a href="portfolio.html">返回作品集</a></p>';
    return;
  }

  try {
    const res = await fetch("../assets/data/portfolio.json");
    if (!res.ok) throw new Error(`Failed to load portfolio manifest: ${res.status}`);

    const manifest = await res.json();
    const work = findWorkById(manifest, workId);

    if (!work) {
      container.innerHTML = '<p class="muted">没有找到这个作品。</p><p class="muted"><a href="portfolio.html">返回作品集</a></p>';
      return;
    }

    const title = root.querySelector("#workTitle");
    const subtitle = root.querySelector("#workSubtitle");
    if (title) title.textContent = work.title;
    if (subtitle) subtitle.textContent = `${work.roleCount} 个角色 / ${work.imageCount} 张图片`;
    container.innerHTML = renderWorkRoles(work);
  } catch (error) {
    container.innerHTML = '<p class="muted">作品加载失败，请稍后重试。</p>';
    console.error(error);
  }
}

if (typeof document !== "undefined" && document.querySelector("#portfolioWorkApp")) {
  initPortfolioWork();
}
