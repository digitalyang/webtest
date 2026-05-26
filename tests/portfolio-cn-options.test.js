import { describe, expect, test } from "vitest";

import {
  buildCnPhotoOptions,
  getImageCreditName
} from "../lib/client/portfolio-cn-options.js";

describe("portfolio CN image options", () => {
  test("filters dynamic images by selected role", () => {
    const options = buildCnPhotoOptions({ workSource: "dynamic", id: 2 }, {
      images: [
        { id: 10, role_id: 2, filename: "nina_1.webp" },
        { id: 11, role_id: 3, filename: "subaru_1.webp" }
      ],
      imageCredits: [{ image_source: "dynamic", image_key: "10", coser_name: "Nina" }]
    });

    expect(options).toEqual([
      {
        imageSource: "dynamic",
        imageKey: "10",
        label: "nina_1.webp",
        value: "dynamic:10",
        coserName: "Nina"
      }
    ]);
  });

  test("lists static gallery images by selected role", () => {
    const options = buildCnPhotoOptions({ workSource: "static", id: "girlsbandcry-nina" }, {
      staticImages: [
        {
          id: 49,
          static_role_id: "girlsbandcry-nina",
          legacy_local_src: "assets/images/GirlsBandCry/Nina/Nina_1.jpeg",
          filename: "Nina_1.jpeg"
        },
        { id: 50, static_role_id: "girlsbandcry-nina", filename: "nina_5.webp" }
      ]
    });

    expect(options.map((option) => option.value)).toEqual([
      "static-image:49",
      "static-image:50"
    ]);
  });

  test("excludes static cover-only rows from CN options", () => {
    const options = buildCnPhotoOptions({ workSource: "static", id: "girlsbandcry-nina" }, {
      staticImages: [
        {
          id: 70,
          static_role_id: "girlsbandcry-nina",
          cloudinary_public_id: "webtest/portfolio-covers/girlsbandcry/nina/nina_1",
          filename: "Nina_1.jpeg"
        },
        {
          id: 49,
          static_role_id: "girlsbandcry-nina",
          filename: "Nina_1.jpeg"
        }
      ]
    });

    expect(options).toHaveLength(1);
    expect(options[0].value).toBe("static-image:49");
  });

  test("treats anonymous CN credits as empty", () => {
    expect(getImageCreditName({
      imageCredits: [{ image_source: "static-local", image_key: "a.jpeg", coser_name: "佚名" }]
    }, "static-local", "a.jpeg")).toBe("");
  });
});
