import { describe, expect, test } from "vitest";
import { buildPortfolioImageSnapshotItems } from "../lib/client/portfolio-image-snapshot.js";

describe("buildPortfolioImageSnapshotItems", () => {
  test("merges dynamic and gallery static rows with stable keys", () => {
    const items = buildPortfolioImageSnapshotItems({
      images: [{ id: 1, role_id: 10, filename: "a.jpg", is_hidden: 0 }],
      staticImages: [
        { id: 2, static_role_id: "r1", filename: "b.jpg", is_hidden: 1 },
        {
          id: 3,
          static_role_id: "r1",
          filename: "b.jpg",
          cloudinary_public_id: "webtest/portfolio-covers/r1/b"
        }
      ]
    });
    expect(items).toEqual([
      {
        key: "dynamic-1",
        rowKind: "dynamic",
        id: 1,
        roleLabel: "role:10",
        label: "a.jpg",
        isHidden: false,
        hideTargetType: "image",
        hideTargetId: 1
      },
      {
        key: "static-2",
        rowKind: "static",
        id: 2,
        roleLabel: "role:r1",
        label: "b.jpg",
        isHidden: true,
        hideTargetType: "static-image",
        hideTargetId: "static:2"
      }
    ]);
  });
});
