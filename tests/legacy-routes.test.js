import { describe, expect, test } from "vitest";

import { getLegacyRedirectPath } from "../lib/legacy-routes.js";

describe("legacy route redirects", () => {
  test("maps old static HTML paths to Next routes", () => {
    expect(getLegacyRedirectPath(new URL("https://example.com/index.html"))).toBe("/");
    expect(getLegacyRedirectPath(new URL("https://example.com/pages/about.html"))).toBe("/about");
    expect(getLegacyRedirectPath(new URL("https://example.com/pages/portfolio.html"))).toBe("/portfolio");
    expect(getLegacyRedirectPath(new URL("https://example.com/pages/portfolio-work.html?id=hok"))).toBe("/portfolio/work/hok");
    expect(getLegacyRedirectPath(new URL("https://example.com/pages/portfolio-role.html?id=hok-daji"))).toBe(
      "/portfolio/role/hok-daji"
    );
  });

  test("leaves non-legacy paths alone", () => {
    expect(getLegacyRedirectPath(new URL("https://example.com/portfolio"))).toBeUndefined();
  });
});
