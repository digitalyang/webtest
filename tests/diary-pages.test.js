import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

const pageContext = vi.hoisted(() => ({ env: undefined }));

vi.mock("../lib/server/cloudflare", () => ({
  getRequestContext: () => {
    if (!pageContext.env) {
      throw new Error("No request context");
    }

    return { env: pageContext.env };
  }
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn()
  })
}));

function createDiaryEnv(rows) {
  return {
    DB: {
      prepare() {
        return {
          async all() {
            return { results: rows };
          }
        };
      }
    }
  };
}

describe("diary public page", () => {
  test("renders visible D1 diary entries as Markdown", async () => {
    pageContext.env = createDiaryEnv([
      {
        id: 10,
        title: "Markdown 日记",
        entry_date: "2026-05-22",
        content: "**重点**\n\n- 第一项",
        is_hidden: 0,
        created_at: "2026-05-22 10:00:00",
        updated_at: "2026-05-22 10:00:00"
      }
    ]);

    const { default: DiaryPage, dynamic } = await import("../app/diary/page.jsx");
    const html = renderToStaticMarkup(await DiaryPage());

    expect(dynamic).toBe("force-dynamic");
    expect(html).toContain("Markdown 日记");
    expect(html).toContain("<strong>重点</strong>");
    expect(html).toContain("markdown-body");
    expect(html).not.toContain("没有数据库数据时");
  });
});

describe("diary admin pages", () => {
  test("renders the separate diary admin login page", async () => {
    const { default: AdminDiaryPage, metadata } = await import("../app/admin/diary/page.jsx");
    const html = renderToStaticMarkup(createElement(AdminDiaryPage));

    expect(metadata.title).toBe("日记管理登录 - DigitalSheep");
    expect(html).toContain("日记管理登录");
    expect(html).toContain("管理员登录");
    expect(html).toContain("管理密码");
    expect(html).not.toContain("作品集上传管理");
  });

  test("renders the protected diary management shell", async () => {
    const { default: AdminDiaryManagePage, metadata } = await import("../app/admin/diary/manage/page.jsx");
    const html = renderToStaticMarkup(createElement(AdminDiaryManagePage));

    expect(metadata.title).toBe("日记管理 - DigitalSheep");
    expect(html).toContain("日记管理");
    expect(html).toContain("退出登录");
    expect(html).toContain("新建日记");
    expect(html).toContain("重新编辑日记");
    expect(html).toContain("删除日记");
    expect(html).toContain("Markdown 正文");
    expect(html).toContain("日记列表");
  });
});
