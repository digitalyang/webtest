import { afterEach, describe, expect, test, vi } from "vitest";

const routeContext = vi.hoisted(() => ({ env: {} }));

vi.mock("../lib/server/cloudflare", () => ({
  getRequestContext: () => ({ env: routeContext.env })
}));

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("../lib/server/about-profile.js");
  routeContext.env = {};
});

describe("about admin route handlers", () => {
  test("GET delegates to the about admin helper", async () => {
    const request = new Request("https://example.com/api/admin/about");
    const helper = vi.fn(async () => Response.json({ ok: true }));

    vi.doMock("../lib/server/about-profile.js", () => ({
      handleAdminAboutRequest: helper
    }));

    const { GET } = await import("../app/api/admin/about/route.js");
    const response = await GET(request);

    expect(await response.json()).toEqual({ ok: true });
    expect(helper).toHaveBeenCalledWith(request, routeContext.env);
  });

  test("PUT delegates to the draft save helper", async () => {
    const request = new Request("https://example.com/api/admin/about/draft", { method: "PUT" });
    const helper = vi.fn(async () => Response.json({ ok: true }));

    vi.doMock("../lib/server/about-profile.js", () => ({
      handleSaveAboutDraftRequest: helper
    }));

    const { PUT } = await import("../app/api/admin/about/draft/route.js");
    const response = await PUT(request);

    expect(await response.json()).toEqual({ ok: true });
    expect(helper).toHaveBeenCalledWith(request, routeContext.env);
  });

  test("POST delegates to the publish helper", async () => {
    const request = new Request("https://example.com/api/admin/about/publish", { method: "POST" });
    const helper = vi.fn(async () => Response.json({ ok: true }));

    vi.doMock("../lib/server/about-profile.js", () => ({
      handlePublishAboutProfileRequest: helper
    }));

    const { POST } = await import("../app/api/admin/about/publish/route.js");
    const response = await POST(request);

    expect(await response.json()).toEqual({ ok: true });
    expect(helper).toHaveBeenCalledWith(request, routeContext.env);
  });
});
