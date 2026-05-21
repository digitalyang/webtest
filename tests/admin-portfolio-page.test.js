import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import AdminPortfolioPage, { metadata as loginMetadata } from "../app/admin/portfolio/page.jsx";
import AdminPortfolioUploadPage, { metadata as uploadMetadata } from "../app/admin/portfolio/upload/page.jsx";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn()
  })
}));

describe("admin portfolio login page", () => {
  test("renders a password-only login shell", () => {
    const html = renderToStaticMarkup(createElement(AdminPortfolioPage));

    expect(loginMetadata.title).toBe("作品集管理登录 - DigitalSheep");
    expect(html).toContain("作品集管理登录");
    expect(html).toContain("管理员登录");
    expect(html).toContain("管理密码");
    expect(html).toContain("登录");
    expect(html).not.toContain("隐藏 Token");
    expect(html).not.toContain("新建作品");
    expect(html).not.toContain("新建角色");
    expect(html).not.toContain("上传图片");
    expect(html).not.toContain("设置封面");
    expect(html).not.toContain("隐藏 / 恢复");
    expect(html).not.toContain("作品 snapshot");
  });
});

describe("admin portfolio upload page", () => {
  test("renders the full protected portfolio admin shell", () => {
    const html = renderToStaticMarkup(createElement(AdminPortfolioUploadPage));
    const createSection = html.slice(html.indexOf("<h2>作品 / 角色</h2>"), html.indexOf("<h2>上传图片</h2>"));
    const uploadSection = html.slice(html.indexOf("<h2>上传图片</h2>"), html.indexOf("<h2>设置封面</h2>"));

    expect(uploadMetadata.title).toBe("作品集上传管理 - DigitalSheep");
    expect(html).toContain("作品集上传管理");
    expect(html).toContain("退出登录");
    expect(html).toContain("新建作品");
    expect(html).toContain("新建角色");
    expect(html).toContain("上传图片");
    expect(html).toContain("设置封面");
    expect(html).toContain("隐藏 / 恢复");
    expect(html).toContain("作品标题");
    expect(html).toContain("作品 slug");
    expect(html).toContain("角色标题");
    expect(html).toContain("角色 slug");
    expect(html).toContain("角色所属作品");
    expect(html).toContain("选择作品");
    expect(html).toContain("选择相册");
    expect(html).toContain("目标类型");
    expect(html).toContain("图片 ID");
    expect(html).toContain("旧作品");
    expect(html).toContain("旧相册");
    expect(html).toContain("上传状态");
    expect(html).toContain("上传进度");
    expect(html).toContain("0%");
    expect(html).toContain("压缩详情");
    expect(html).toContain("选择作品图片");
    expect(html).toContain("作品 snapshot");
    expect(html).toContain("角色 snapshot");
    expect(html).toContain("图片 snapshot");
    expect(html).toContain("追加图片 snapshot");
    expect(createSection).not.toContain("作品 ID");
    expect(uploadSection).not.toContain("作品 slug");
    expect(uploadSection).not.toContain("角色 slug");
    expect(html).not.toContain("角色 ID");
    expect(html).not.toContain("隐藏 Token");
    expect(html).not.toContain("接口接入中");
  });
});
