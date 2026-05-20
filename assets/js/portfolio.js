export function resolveImageSrc(src) {
  return src.startsWith("../") ? src : `../${src}`;
}

export function groupAlbumsByCategory(albums) {
  return albums.reduce((acc, album) => {
    const key = album.category || "photography";
    if (!acc[key]) acc[key] = [];
    acc[key].push(album);
    return acc;
  }, {});
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

function renderAlbum(album) {
  const thumbs = album.images
    .map(
      (img) =>
        `<a class="portfolio-thumb" href="${resolveImageSrc(img.src)}" target="_blank" rel="noopener noreferrer">
          <img src="${resolveImageSrc(img.src)}" alt="${img.alt}" loading="lazy" width="320" height="240">
        </a>`
    )
    .join("");
  return `
    <section class="portfolio-album">
      <h3>${album.title}</h3>
      <div class="portfolio-grid">${thumbs}</div>
    </section>`;
}

function renderCategoryPanel(id, bodyHtml) {
  return `<div class="portfolio-panel" data-category="${id}" hidden>${bodyHtml}</div>`;
}

export async function initPortfolio(root = document) {
  const res = await fetch("../assets/data/portfolio.json");
  if (!res.ok) throw new Error(`Failed to load portfolio manifest: ${res.status}`);
  const data = await res.json();
  const container = root.querySelector("#portfolioApp");
  if (!container) return;

  const tabs = data.categories
    .map(
      (c, i) =>
        `<button type="button" class="portfolio-tab${i === 0 ? " is-active" : ""}" data-tab="${c.id}">${c.title}</button>`
    )
    .join("");

  const grouped = groupAlbumsByCategory(data.albums);
  const codeProjects = (data.projects || []).filter((p) => p.category === "code");

  const panels = data.categories
    .map((cat) => {
      if (cat.id === "photography") {
        const albums = (grouped.photography || []).map(renderAlbum).join("");
        return renderCategoryPanel(cat.id, albums || '<p class="muted">暂无作品</p>');
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
}

if (document.querySelector("#portfolioApp")) {
  initPortfolio();
}
