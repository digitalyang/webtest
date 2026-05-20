import { resolveImageSrc } from "./portfolio.js";

const BATCH_SIZE = 5;

export function getImageBatch(images = [], start = 0, size = BATCH_SIZE) {
  return images.slice(start, start + size);
}

export function findRoleById(manifest, roleId) {
  for (const work of manifest?.photographyWorks || []) {
    const role = (work.roles || []).find((candidate) => candidate.id === roleId);
    if (role) return { work, role };
  }

  return undefined;
}

export function renderRoleImages(images = []) {
  return images
    .filter((image) => !image.src.includes(".thumb."))
    .map(
      (image) => `
        <a class="portfolio-thumb portfolio-original-thumb" href="${resolveImageSrc(image.src)}" target="_blank" rel="noopener noreferrer">
          <img src="${resolveImageSrc(image.src)}" alt="${image.alt}" loading="lazy" width="480" height="640">
        </a>`
    )
    .join("");
}

function getCurrentId() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("id");
}

function getWorkHref(workId) {
  return `portfolio-work.html?id=${encodeURIComponent(workId)}`;
}

export async function initPortfolioRole(root = typeof document !== "undefined" ? document : undefined) {
  if (!root) return;

  const container = root.querySelector("#portfolioRoleApp");
  if (!container) return;

  const roleId = getCurrentId();
  if (!roleId) {
    container.innerHTML = '<p class="muted">没有指定角色。</p><p class="muted"><a href="portfolio.html">返回作品集</a></p>';
    return;
  }

  try {
    const res = await fetch("../assets/data/portfolio.json");
    if (!res.ok) throw new Error(`Failed to load portfolio manifest: ${res.status}`);

    const manifest = await res.json();
    const result = findRoleById(manifest, roleId);

    if (!result) {
      container.innerHTML = '<p class="muted">没有找到这个角色。</p><p class="muted"><a href="portfolio.html">返回作品集</a></p>';
      return;
    }

    const { work, role } = result;
    const images = (role.images || []).filter((image) => !image.src.includes(".thumb."));
    const title = root.querySelector("#roleTitle");
    const subtitle = root.querySelector("#roleSubtitle");
    const backLink = root.querySelector("#backToWorkLink");

    if (title) title.textContent = `${work.title} · ${role.title}`;
    if (subtitle) subtitle.textContent = `${images.length} 张原图，每次加载 5 张。`;
    if (backLink) {
      backLink.href = getWorkHref(work.id);
      backLink.textContent = `返回 ${work.title}`;
    }

    let loaded = 0;
    container.innerHTML = `
      <div class="portfolio-grid portfolio-original-grid" id="roleImageGrid"></div>
      <div class="portfolio-load-more">
        <button class="button" type="button" id="loadMoreImages">继续加载 ${Math.min(BATCH_SIZE, images.length)} 张</button>
        <p class="muted" id="loadStatus"></p>
      </div>`;

    const grid = root.querySelector("#roleImageGrid");
    const button = root.querySelector("#loadMoreImages");
    const status = root.querySelector("#loadStatus");

    function loadNextBatch() {
      const batch = getImageBatch(images, loaded, BATCH_SIZE);
      grid.insertAdjacentHTML("beforeend", renderRoleImages(batch));
      loaded += batch.length;

      if (loaded >= images.length) {
        button.hidden = true;
        status.textContent = "已加载全部图片";
      } else {
        const remaining = images.length - loaded;
        button.textContent = `继续加载 ${Math.min(BATCH_SIZE, remaining)} 张`;
        status.textContent = `已加载 ${loaded} / ${images.length} 张`;
      }
    }

    button.addEventListener("click", loadNextBatch);
    loadNextBatch();
  } catch (error) {
    container.innerHTML = '<p class="muted">角色图片加载失败，请稍后重试。</p>';
    console.error(error);
  }
}

if (typeof document !== "undefined" && document.querySelector("#portfolioRoleApp")) {
  initPortfolioRole();
}
