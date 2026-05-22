import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import PortfolioAdminLogin from "../components/admin/PortfolioAdminLogin.jsx";

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks
}));

beforeEach(() => {
  routerMocks.push.mockReset();
  routerMocks.replace.mockReset();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = "";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  document.body.innerHTML = "";
});

describe("message admin page", () => {
  test("renders the message admin shell", async () => {
    const pageModules = import.meta.glob("../app/admin/messages/page.jsx");
    const loadMessageAdminPage = pageModules["../app/admin/messages/page.jsx"];

    if (!loadMessageAdminPage) {
      throw new Error("Cannot find module ../app/admin/messages/page.jsx");
    }

    const { default: MessageAdminPage, metadata: messageAdminMetadata } = await loadMessageAdminPage();
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

  test("login component can redirect back to message admin", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ ok: true })
      }))
    );

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(createElement(PortfolioAdminLogin, { redirectTo: "/admin/messages" }));
      });

      const passwordInput = container.querySelector("input[type='password']");
      const loginButton = container.querySelector("button");

      await act(async () => {
        passwordInput.value = "correct-password";
        passwordInput.dispatchEvent(new Event("input", { bubbles: true }));
        loginButton.click();
      });

      expect(globalThis.fetch).toHaveBeenCalledWith("/api/admin/session", expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        }
      }));

      expect(routerMocks.push).toHaveBeenCalledWith("/admin/messages");
    } finally {
      await act(async () => {
        root.unmount();
      });
    }
  });
});
