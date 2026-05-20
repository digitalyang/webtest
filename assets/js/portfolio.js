export function resolveImageSrc(src) {
  return src.startsWith("../") ? src : `../${src}`;
}

export function getWorkHref(workId) {
  return `portfolio-work.html?id=${encodeURIComponent(workId)}`;
}

function renderProjectCard(project) {
  const link = project.href
    ? `<p><a class="button" href="${project.href}">查看</a></p>`
    : "";
  return `
    <article class="card">
      <div class="card-content">
        <h2>${project.title}</h2>
        <p>${project.description}</p>
        ${link}
      </div>
    </article>`;
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

function renderCategoryPanel(id, bodyHtml) {
  return `<div class="portfolio-panel" data-category="${id}" hidden>${bodyHtml}</div>`;
}

export async function initPortfolio(root = typeof document !== "undefined" ? document : undefined) {
  if (!root) return;

  const container = root.querySelector("#portfolioApp");
  if (!container) return;

  try {
    const res = await fetch("../assets/data/portfolio.json");
    if (!res.ok) throw new Error(`Failed to load portfolio manifest: ${res.status}`);
    const data = await res.json();

    const tabs = data.categories
      .map(
        (c, i) =>
          `<button type="button" class="portfolio-tab${i === 0 ? " is-active" : ""}" data-tab="${c.id}">${c.title}</button>`
      )
      .join("");

    const codeProjects = (data.projects || []).filter((p) => p.category === "code");

    const panels = data.categories
      .map((cat) => {
        if (cat.id === "photography") {
          return renderCategoryPanel(cat.id, renderPhotographyWorks(data.photographyWorks || []));
        }
        if (cat.id === "code") {
          const cards = codeProjects.map(renderProjectCard).join("");
          return renderCategoryPanel(cat.id, `<div class="card-grid">${cards}</div>`);
        }
        if (cat.id === "drawing") {
          return renderCategoryPanel(cat.id, '<p class="muted">手绘作品即将上传</p>');
        }
        return renderCategoryPanel(cat.id, "");
      })
      .join("");

    container.innerHTML = `<div class="portfolio-tabs">${tabs}</div>${panels}`;

    const tabButtons = container.querySelectorAll(".portfolio-tab");
    const panelNodes = container.querySelectorAll(".portfolio-panel");

    function activate(tabId) {
      tabButtons.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.tab === tabId));
      panelNodes.forEach((panel) => {
        panel.hidden = panel.dataset.category !== tabId;
      });
    }

    tabButtons.forEach((btn) => btn.addEventListener("click", () => activate(btn.dataset.tab)));
    activate(data.categories[0].id);
  } catch (error) {
    container.innerHTML = '<p class="muted">作品集加载失败，请稍后重试。</p>';
    console.error(error);
  }
}

if (typeof document !== "undefined" && document.querySelector("#portfolioApp")) {
  initPortfolio();
}
