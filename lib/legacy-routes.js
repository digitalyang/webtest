const staticRouteMap = {
  "/index.html": "/",
  "/pages/about.html": "/about",
  "/pages/portfolio.html": "/portfolio",
  "/pages/diary.html": "/diary",
  "/pages/messages.html": "/messages",
  "/pages/stats.html": "/stats",
  "/pages/nailong.html": "/nailong",
  "/pages/genshin.html": "/genshin"
};

export function getLegacyRedirectPath(url) {
  if (staticRouteMap[url.pathname]) {
    return staticRouteMap[url.pathname];
  }

  if (url.pathname === "/pages/portfolio-work.html") {
    const workId = url.searchParams.get("id");
    return workId ? `/portfolio/work/${encodeURIComponent(workId)}` : "/portfolio";
  }

  if (url.pathname === "/pages/portfolio-role.html") {
    const roleId = url.searchParams.get("id");
    return roleId ? `/portfolio/role/${encodeURIComponent(roleId)}` : "/portfolio";
  }

  return undefined;
}
