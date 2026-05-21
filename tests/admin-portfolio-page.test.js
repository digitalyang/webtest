import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import AdminPortfolioPage, { metadata } from "../app/admin/portfolio/page.jsx";

describe("admin portfolio page", () => {
  test("renders the private portfolio admin shell", () => {
    const html = renderToStaticMarkup(createElement(AdminPortfolioPage));
    const uploadSection = html.slice(html.indexOf("<h2>上传图片</h2>"), html.indexOf("<h2>设置封面</h2>"));

    expect(metadata.title).toBe("作品集管理 - DigitalSheep");
    expect(html).toContain("作品集管理");
    expect(html).toContain("管理员登录");
    expect(html).toContain("新建作品");
    expect(html).toContain("新建角色");
    expect(html).toContain("上传图片");
    expect(html).toContain("设置封面");
    expect(html).toContain("作品标题");
    expect(html).toContain("作品 slug");
    expect(html).toContain("角色标题");
    expect(html).toContain("角色 slug");
    expect(html).toContain("作品 ID");
    expect(html).toContain("角色 ID");
    expect(html).toContain("目标类型");
    expect(html).toContain("图片 ID");
    expect(html).toContain("上传状态");
    expect(html).toContain("选择作品图片");
    expect(uploadSection).not.toContain("作品 slug");
    expect(uploadSection).not.toContain("角色 slug");
    expect(html).not.toContain("接口接入中");
  });
});
