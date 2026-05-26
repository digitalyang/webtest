import { describe, expect, test } from "vitest";

import {
  buildVisibilityImageOptions,
  buildVisibilityRoleOptions,
  buildVisibilityWorkOptions,
  getVisibilityPayload
} from "../lib/client/portfolio-visibility-options.js";

const snapshot = {
  works: [
    { id: 1, title: "GirlsBandCry", slug: "girlsbandcry", is_hidden: 0 },
    { id: 2, title: "HOK", slug: "hok", is_hidden: 1 }
  ],
  roles: [
    { id: 10, work_id: 1, title: "Nina", slug: "nina", is_hidden: 0 },
    { id: 11, work_id: 1, title: "Subaru", slug: "subaru", is_hidden: 1 }
  ],
  images: [
    { id: 100, role_id: 10, filename: "nina_1.webp", cloudinary_public_id: "webtest/portfolio/girlsbandcry/nina/nina_1", is_hidden: 0 },
    { id: 101, role_id: 10, filename: "", cloudinary_public_id: "webtest/portfolio/girlsbandcry/nina/nina_2", is_hidden: 1 }
  ],
  staticRoles: [
    { id: 20, static_work_id: "static-work", title: "Appended Role", slug: "append", is_hidden: 0 }
  ],
  staticImages: [
    { id: 200, static_role_id: "static-work-append", filename: "append_1.webp", cloudinary_public_id: "webtest/portfolio/static/append_1", is_hidden: 0 }
  ],
  adminOptions: {
    works: [
      { source: "static", id: "static-work", value: "static:static-work", label: "FGO" },
      { source: "dynamic", id: 1, value: "dynamic:1", label: "GirlsBandCry" }
    ],
    rolesByWork: {
      "static:static-work": [
        { source: "static", workSource: "static", id: "static-work-local", value: "static:static-work-local", label: "Nero" },
        { source: "static", workSource: "static", id: "static-work-append", value: "static:static-work-append", label: "Tamamo" }
      ],
      "dynamic:1": [
        { source: "dynamic", workSource: "dynamic", id: 10, value: "dynamic:10", label: "Nina" }
      ]
    }
  }
};

describe("portfolio visibility options", () => {
  test("builds work options without exposing source words", () => {
    const options = buildVisibilityWorkOptions(snapshot);

    expect(options).toEqual([
      { source: "dynamic", id: 1, value: "dynamic:1", label: "GirlsBandCry" },
      { source: "dynamic", id: 2, value: "dynamic:2", label: "HOK（隐藏）" },
      { source: "static", id: "static-work", value: "static:static-work", label: "FGO" }
    ]);
    expect(options.map((option) => option.label).join(" ")).not.toMatch(/\b(static|dynamic|old work|old album)\b/i);
  });

  test("hides and sanitizes static work source words", () => {
    const options = buildVisibilityWorkOptions({
      adminOptions: {
        works: [
          {
            source: "static",
            id: "fgo",
            value: "static:fgo",
            label: "static: FGO",
            isHidden: true
          },
          {
            source: "static",
            id: "nero",
            value: "static:nero",
            label: "旧相册 - Nero"
          }
        ]
      }
    });

    expect(options).toEqual([
      {
        source: "static",
        id: "fgo",
        value: "static:fgo",
        label: "FGO（隐藏）"
      },
      {
        source: "static",
        id: "nero",
        value: "static:nero",
        label: "Nero"
      }
    ]);
  });

  test("keeps source words inside business names", () => {
    const options = buildVisibilityWorkOptions({
      adminOptions: {
        works: [
          { source: "static", id: "dynamic-duo", value: "static:dynamic-duo", label: "Dynamic Duo" },
          { source: "static", id: "static-shock", value: "static:static-shock", label: "Static Shock" }
        ]
      }
    });

    expect(options.map((option) => option.label)).toEqual(["Dynamic Duo", "Static Shock"]);
  });

  test("builds role options for dynamic and static works", () => {
    expect(buildVisibilityRoleOptions(snapshot, "dynamic:1")).toEqual([
      { source: "dynamic", workSource: "dynamic", id: 10, value: "dynamic:10", label: "Nina" },
      { source: "dynamic", workSource: "dynamic", id: 11, value: "dynamic:11", label: "Subaru（隐藏）" }
    ]);

    expect(buildVisibilityRoleOptions(snapshot, "static:static-work")).toEqual([
      { source: "static-manifest", workSource: "static", id: "static-work-local", value: "static-manifest:static-work-local", label: "Nero" },
      { source: "static-role", workSource: "static", id: 20, roleId: "static-work-append", value: "static-role:20", label: "Tamamo" }
    ]);
  });

  test("includes hidden static role rows missing from admin options", () => {
    const options = buildVisibilityRoleOptions({
      staticRoles: [
        { id: 20, static_work_id: "static-work", title: "Tamamo", slug: "append", is_hidden: 0 },
        { id: 21, static_work_id: "static-work", title: "Hidden Alter", slug: "hidden-alter", is_hidden: 1 }
      ],
      adminOptions: {
        rolesByWork: {
          "static:static-work": [
            { source: "static", workSource: "static", id: "static-work-local", value: "static:static-work-local", label: "Nero" },
            { source: "static", workSource: "static", id: "static-work-append", value: "static:static-work-append", label: "Tamamo" }
          ]
        }
      }
    }, "static:static-work");

    expect(options).toEqual([
      { source: "static-manifest", workSource: "static", id: "static-work-local", value: "static-manifest:static-work-local", label: "Nero" },
      { source: "static-role", workSource: "static", id: 20, roleId: "static-work-append", value: "static-role:20", label: "Tamamo" },
      { source: "static-role", workSource: "static", id: 21, roleId: "static-work-hidden-alter", value: "static-role:21", label: "Hidden Alter（隐藏）" }
    ]);
    expect(options.filter((option) => option.value === "static-role:20")).toHaveLength(1);
  });

  test("builds dynamic and appended image options for selected roles", () => {
    expect(buildVisibilityImageOptions(snapshot, "image", "dynamic:10")).toEqual([
      { source: "dynamic", id: 100, value: "dynamic:100", label: "nina_1.webp" },
      { source: "dynamic", id: 101, value: "dynamic:101", label: "webtest/portfolio/girlsbandcry/nina/nina_2（隐藏）" }
    ]);

    expect(buildVisibilityImageOptions(snapshot, "static-image", "static-manifest:static-work-append")).toEqual([
      { source: "static", id: 200, value: "static:200", label: "append_1.webp" }
    ]);
  });

  test("resolves appended image options from static role row selections", () => {
    expect(buildVisibilityImageOptions(snapshot, "static-image", "static-role:20")).toEqual([
      { source: "static", id: 200, value: "static:200", label: "append_1.webp" }
    ]);
  });

  test("maps selected values to visibility payloads", () => {
    expect(getVisibilityPayload({ targetType: "work", workKey: "dynamic:1", isHidden: true })).toEqual({
      targetType: "work",
      targetId: 1,
      isHidden: true
    });
    expect(getVisibilityPayload({ targetType: "work", workKey: "static:static-work", isHidden: false })).toEqual({
      targetType: "static-work",
      targetId: "static-work",
      isHidden: false
    });
    expect(getVisibilityPayload({ targetType: "role", workKey: "static:static-work", roleKey: "static-role:20", isHidden: false })).toEqual({
      targetType: "static-role",
      targetId: 20,
      isHidden: false
    });
    expect(getVisibilityPayload({ targetType: "image", workKey: "dynamic:1", roleKey: "dynamic:10", imageKey: "dynamic:100", isHidden: true })).toEqual({
      targetType: "image",
      targetId: 100,
      isHidden: true
    });
    expect(getVisibilityPayload({ targetType: "static-image", workKey: "static:static-work", roleKey: "static-manifest:static-work-append", imageKey: "static:200", isHidden: true })).toEqual({
      targetType: "static-image",
      targetId: "static:200",
      isHidden: true
    });
  });

  test("rejects incomplete selections with Chinese messages", () => {
    expect(() => getVisibilityPayload({ targetType: "work", isHidden: true })).toThrow("请选择作品。");
    expect(() => getVisibilityPayload({ targetType: "role", workKey: "dynamic:1", isHidden: true })).toThrow("请选择角色。");
    expect(() => getVisibilityPayload({ targetType: "image", workKey: "dynamic:1", roleKey: "dynamic:10", isHidden: true })).toThrow("请选择图片。");
    expect(() => getVisibilityPayload({ targetType: "bad", isHidden: true })).toThrow("隐藏目标类型无效。");
  });

  test("maps static manifest role visibility to static-manifest-role", () => {
    expect(getVisibilityPayload({
      targetType: "role",
      workKey: "static:static-work",
      roleKey: "static-manifest:static-work-local",
      isHidden: true
    })).toEqual({
      targetType: "static-manifest-role",
      targetId: "static-work-local",
      isHidden: true
    });
  });

  test("rejects stale target type and option source combinations", () => {
    expect(() => getVisibilityPayload({
      targetType: "work",
      workKey: "static-role:20",
      isHidden: true
    })).toThrow("隐藏目标类型无效。");

    expect(() => getVisibilityPayload({
      targetType: "role",
      workKey: "dynamic:1",
      roleKey: "static:200",
      isHidden: true
    })).toThrow("隐藏目标类型无效。");

    expect(() => getVisibilityPayload({
      targetType: "image",
      workKey: "dynamic:1",
      roleKey: "dynamic:10",
      imageKey: "static:200",
      isHidden: true
    })).toThrow("隐藏目标类型无效。");

    expect(() => getVisibilityPayload({
      targetType: "static-image",
      workKey: "static:static-work",
      roleKey: "static-manifest:static-work-append",
      imageKey: "dynamic:100",
      isHidden: true
    })).toThrow("隐藏目标类型无效。");
  });
});
