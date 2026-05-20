import { describe, expect, test } from "vitest";

import { generateMetadata as generateRoleMetadata } from "../app/portfolio/role/[roleId]/page.jsx";
import { generateMetadata as generateWorkMetadata } from "../app/portfolio/work/[workId]/page.jsx";

describe("portfolio dynamic pages", () => {
  test("reads async work params when generating metadata", async () => {
    const metadata = await generateWorkMetadata({
      params: Promise.resolve({ workId: "fgo" })
    });

    expect(metadata.title).toBe("FGO - 个人主页");
  });

  test("reads async role params when generating metadata", async () => {
    const metadata = await generateRoleMetadata({
      params: Promise.resolve({ roleId: "fgo-nero" })
    });

    expect(metadata.title).toBe("FGO · Nero - 个人主页");
  });
});
