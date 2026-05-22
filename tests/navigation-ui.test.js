import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/portfolio"
}));

describe("navigation UI", () => {
  test("renders portfolio navigation links in a scrollable link group", async () => {
    const { default: NavBar } = await import("../components/NavBar.jsx");
    const html = renderToStaticMarkup(createElement(NavBar));

    expect(html).toContain("页面导航");
    expect(html).toContain("nav-links");
    expect(html).toContain("作品集");
    expect(html).not.toContain("访问统计");
    expect(html).not.toContain("/stats");
    expect(html).toContain("class=\"active\"");
  });

  test("mounts a global rocket back-to-top control", async () => {
    const { default: RootLayout } = await import("../app/layout.jsx");
    const html = renderToStaticMarkup(createElement(RootLayout, null, createElement("section", null, "页面内容")));

    expect(html).toContain("back-to-top");
    expect(html).toContain("回到顶部");
    expect(html).toContain("🚀");
  });
});
