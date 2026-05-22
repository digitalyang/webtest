import { describe, expect, test, vi } from "vitest";

import { renderMarkdown } from "../lib/message-markdown.js";

describe("renderMarkdown", () => {
  test("renders common Markdown formatting", () => {
    const html = renderMarkdown("**加粗**\n\n- 第一项\n- 第二项\n\n[官网](https://example.com)");

    expect(html).toContain("<strong>加粗</strong>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>第一项</li>");
    expect(html).toContain('href="https://example.com"');
  });

  test("removes script, event handlers, and javascript URLs", () => {
    const html = renderMarkdown(
      '<script>alert(1)</script><img src=x onerror="alert(1)">[危险](javascript:alert(1))'
    );

    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("javascript:");
  });

  test("preserves plain text line breaks", () => {
    const html = renderMarkdown("第一行\n第二行");

    expect(html).toContain("第一行<br>");
    expect(html).toContain("第二行");
  });

  test("renders safely without a document global", () => {
    const originalDocument = globalThis.document;
    vi.stubGlobal("document", undefined);

    try {
      const html = renderMarkdown("**服务端** [危险](javascript:alert(1)) [官网](https://example.com)");

      expect(html).toContain("<strong>服务端</strong>");
      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('target="_blank"');
      expect(html).not.toContain("javascript:");
    } finally {
      vi.stubGlobal("document", originalDocument);
      vi.unstubAllGlobals();
    }
  });
});
