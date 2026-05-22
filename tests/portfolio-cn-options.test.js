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

  test("combines static local and static appended images by selected role", () => {
    const options = buildCnPhotoOptions({ workSource: "static", id: "girlsbandcry-nina" }, {
      staticLocalImages: [
        {
          imageKey: "assets/images/GirlsBandCry/Nina/Nina_1.jpeg",
          roleId: "girlsbandcry-nina",
          label: "Nina_1.jpeg"
        }
      ],
      staticImages: [
        { id: 50, static_role_id: "girlsbandcry-nina", filename: "nina_5.webp" }
      ]
    });

    expect(options.map((option) => option.value)).toEqual([
      "static-local:assets/images/GirlsBandCry/Nina/Nina_1.jpeg",
      "static-image:50"
    ]);
  });

  test("treats anonymous CN credits as empty", () => {
    expect(getImageCreditName({
      imageCredits: [{ image_source: "static-local", image_key: "a.jpeg", coser_name: "佚名" }]
    }, "static-local", "a.jpeg")).toBe("");
  });
});
