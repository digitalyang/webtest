import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import MessageAdmin from "../components/admin/MessageAdmin.jsx";
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
        setInputValue(passwordInput, "correct-password");
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

  test("loads messages, paginates, deletes, and logs out", async () => {
    const fetchMock = vi.fn(async (url, options = {}) => {
      if (url === "/api/admin/messages?page=1&pageSize=10&q=") {
        return jsonResponse({
          messages: [{ id: 1, name: "Momo", content: "第一页留言", time: "2026-05-22T03:00:00.000Z" }],
          total: 11,
          page: 1,
          pageSize: 10
        });
      }

      if (url === "/api/admin/messages?page=2&pageSize=10&q=") {
        return jsonResponse({
          messages: [{ id: 42, name: "Nana", content: "第二页留言", time: "2026-05-22T04:00:00.000Z" }],
          total: 11,
          page: 2,
          pageSize: 10
        });
      }

      if (url === "/api/admin/messages/42" && options.method === "DELETE") {
        return jsonResponse({ ok: true });
      }

      if (url === "/api/admin/session" && options.method === "DELETE") {
        return jsonResponse({ ok: true });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("confirm", vi.fn(() => true));

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(createElement(MessageAdmin));
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/admin/messages?page=1&pageSize=10&q=", expect.objectContaining({
        method: "GET",
        credentials: "same-origin"
      }));
      expect(container.textContent).toContain("共 11 条留言，当前第 1 / 2 页。");
      expect(container.textContent).toContain("Momo");
      expect(container.textContent).toContain("第一页留言");

      await act(async () => {
        getButton(container, "下一页").click();
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/admin/messages?page=2&pageSize=10&q=", expect.objectContaining({
        method: "GET",
        credentials: "same-origin"
      }));
      expect(container.textContent).toContain("Nana");

      await act(async () => {
        getButton(container, "永久删除").click();
      });

      expect(globalThis.confirm).toHaveBeenCalledWith("确定要永久删除这条留言吗？删除后不可恢复。");
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/messages/42", expect.objectContaining({
        method: "DELETE",
        credentials: "same-origin"
      }));
      expect(fetchMock).toHaveBeenLastCalledWith("/api/admin/messages?page=1&pageSize=10&q=", expect.any(Object));

      await act(async () => {
        getButton(container, "退出登录").click();
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/admin/session", expect.objectContaining({
        method: "DELETE",
        credentials: "same-origin"
      }));
      expect(routerMocks.replace).toHaveBeenCalledWith("/admin/portfolio");
    } finally {
      await act(async () => {
        root.unmount();
      });
    }
  });

  test("supports search, clear, and login retry after expired sessions", async () => {
    let initialLoadCount = 0;
    const fetchMock = vi.fn(async (url, options = {}) => {
      if (url === "/api/admin/messages?page=1&pageSize=10&q=") {
        initialLoadCount += 1;
        if (initialLoadCount > 1) {
          return jsonResponse({
            messages: [],
            total: 0,
            page: 1,
            pageSize: 10
          });
        }

        return jsonResponse({ error: "管理员登录已过期，请重新登录。" }, 401);
      }

      if (url === "/api/admin/session" && options.method === "POST") {
        return jsonResponse({ ok: true });
      }

      if (url === "/api/admin/messages?page=1&pageSize=10&q=%E7%BE%8A") {
        return jsonResponse({
          messages: [{ id: 7, name: "Sheep", content: "小羊留言", time: "2026-05-22T05:00:00.000Z" }],
          total: 1,
          page: 1,
          pageSize: 10
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(createElement(MessageAdmin));
      });

      expect(container.textContent).toContain("管理员登录已过期，请重新登录。");
      expect(container.textContent).toContain("管理员登录");

      const passwordInput = container.querySelector("input[type='password']");
      await act(async () => {
        setInputValue(passwordInput, "correct-password");
        getButton(container, "登录").click();
      });

      const searchInput = container.querySelector("input[placeholder='按昵称或留言内容搜索']");
      await act(async () => {
        setInputValue(searchInput, "羊");
        getButton(container, "搜索").click();
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/admin/messages?page=1&pageSize=10&q=%E7%BE%8A", expect.objectContaining({
        method: "GET",
        credentials: "same-origin"
      }));
      expect(container.textContent).toContain("小羊留言");

      await act(async () => {
        getButton(container, "清空").click();
      });

      expect(container.querySelector("input[placeholder='按昵称或留言内容搜索']").value).toBe("");
    } finally {
      await act(async () => {
        root.unmount();
      });
    }
  });
});

function jsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data
  };
}

function getButton(container, text) {
  const button = Array.from(container.querySelectorAll("button")).find((element) => element.textContent === text);
  if (!button) {
    throw new Error(`Cannot find button: ${text}`);
  }

  return button;
}

function setInputValue(input, value) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  valueSetter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}
