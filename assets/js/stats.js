const totalViews = document.querySelector("#totalViews");
const todayViews = document.querySelector("#todayViews");
const pageStats = document.querySelector("#pageStats");

function renderPageStats(pages) {
  if (!pages.length) {
    pageStats.innerHTML = '<p class="empty-state">还没有访问记录。</p>';
    return;
  }

  pageStats.innerHTML = pages.map((page) => `
    <article class="stat-row">
      <span>${page.path}</span>
      <strong>${page.count}</strong>
    </article>
  `).join("");
}

async function loadStats() {
  try {
    const response = await fetch("/api/stats");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "统计加载失败。");
    }

    totalViews.textContent = data.total;
    todayViews.textContent = data.today;
    renderPageStats(data.pages || []);
  } catch (error) {
    pageStats.innerHTML = `<p class="empty-state">${error.message}</p>`;
  }
}

if (totalViews && todayViews && pageStats) {
  loadStats();
}
