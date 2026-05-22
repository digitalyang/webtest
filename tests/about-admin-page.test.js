import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn()
  })
}));

describe("about admin page", () => {
  test("renders the about admin management shell", async () => {
    const { default: AdminAboutPage, metadata } = await import("../app/admin/about/page.jsx");
    const html = renderToStaticMarkup(createElement(AdminAboutPage));

    expect(metadata.title).toBe("个人简介管理 - DigitalSheep");
    expect(html).toContain("个人简介管理");
    expect(html).toContain("保存草稿");
    expect(html).toContain("发布当前草稿");
    expect(html).toContain("身份信息");
    expect(html).toContain("Game Tags");
    expect(html).toContain("分组标题");
    expect(html).toContain("Experience");
  });
});

describe("about admin tag helpers", () => {
  test("preserves existing tech tag icons when merging edited lines", async () => {
    const { mergeTagLinesWithExistingTags } = await import("../components/admin/AboutAdmin.jsx");

    expect(
      mergeTagLinesWithExistingTags(" C/C++ \nRenamed Python\nSTM32", [
        { label: "C/C++", icon: "C++" },
        { label: "Python", icon: "Py" },
        { label: "STM32", icon: "STM" }
      ])
    ).toEqual([
      { label: "C/C++", icon: "C++" },
      "Renamed Python",
      { label: "STM32", icon: "STM" }
    ]);
  });
});
