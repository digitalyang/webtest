import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import MessageAdminPage, { metadata as messageAdminMetadata } from "../app/admin/messages/page.jsx";
import PortfolioAdminLogin from "../components/admin/PortfolioAdminLogin.jsx";

const pushedRoutes = [];

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: (href) => pushedRoutes.push(href),
    replace: (href) => pushedRoutes.push(href)
  })
}));

describe("message admin page", () => {
  test("renders the message admin shell", () => {
    const html = renderToStaticMarkup(createElement(MessageAdminPage));

    expect(messageAdminMetadata.title).toBe("留言管理 - DigitalSheep");
    expect(html).toContain("留言管理");
    expect(html).toContain("搜索、分页查看留言，并永久删除不需要保留的内容。");
    expect(html).toContain("正在验证管理员会话");
    expect(html).toContain("按昵称或留言内容搜索");
    expect(html).toContain("上一页");
    expect(html).toContain("下一页");
    expect(html).toContain("永久删除");
    expect(html).toContain("永久删除前会要求确认，删除后不可恢复。");
  });

  test("login component can redirect back to message admin", () => {
    const html = renderToStaticMarkup(
      createElement(PortfolioAdminLogin, { redirectTo: "/admin/messages" })
    );

    expect(html).toContain("管理员登录");
    expect(html).toContain("管理密码");
    expect(html).toContain("登录");
  });
});
