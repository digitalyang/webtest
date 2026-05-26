import { describe, expect, test } from "vitest";

import {
  buildCoverPhotoOptions,
  getCoverPayload
} from "../lib/client/portfolio-cover-options.js";

const snapshot = {
  images: [
    { id: 11, role_id: 1, filename: "dynamic-one.jpg" },
    { id: 12, role_id: 2, filename: "dynamic-two.jpg" },
    { id: 13, role_id: "1", cloudinary_public_id: "dynamic-cloud" }
  ],
  staticImages: [
    { id: 21, static_role_id: "static-role", filename: "static-one.jpg" },
    { id: 22, static_role_id: "other-static-role", filename: "static-two.jpg" },
    { id: 23, static_role_id: "static-work-new-role", cloudinary_public_id: "static-dynamic-cloud" }
  ]
};

const dynamicWork = { source: "dynamic", id: 101 };
const staticWork = { source: "static", id: "static-work" };
const dynamicRole = { source: "dynamic", workSource: "dynamic", id: 1 };
const staticRole = { source: "static", workSource: "static", id: "static-role" };
const staticDynamicRole = { source: "static-dynamic", workSource: "static", id: "static-work-new-role" };
const dynamicPhoto = { source: "dynamic", id: 11, value: "dynamic:11" };
const staticPhoto = { source: "static", id: 21, value: "static:21" };

describe("buildCoverPhotoOptions", () => {
  test("filters dynamic role photos from dynamic images", () => {
    expect(buildCoverPhotoOptions(dynamicRole, snapshot)).toEqual([
      {
        source: "dynamic",
        id: 11,
        label: "dynamic-one.jpg",
        value: "dynamic:11"
      },
      {
        source: "dynamic",
        id: 13,
        label: "dynamic-cloud",
        value: "dynamic:13"
      }
    ]);
  });

  test("filters static original role photos from static images", () => {
    expect(buildCoverPhotoOptions(staticRole, snapshot)).toEqual([
      {
        source: "static",
        id: 21,
        label: "static-one.jpg",
        value: "static:21"
      }
    ]);
  });

  test("filters static-dynamic role photos from static images", () => {
    expect(buildCoverPhotoOptions(staticDynamicRole, snapshot)).toEqual([
      {
        source: "static",
        id: 23,
        label: "static-dynamic-cloud",
        value: "static:23"
      }
    ]);
  });

  test("returns no photos when the role has no matching images", () => {
    expect(buildCoverPhotoOptions({ source: "static", workSource: "static", id: "empty-role" }, snapshot)).toEqual([]);
  });

  test("excludes portfolio-covers rows from static cover options", () => {
    const withCoverDup = {
      ...snapshot,
      staticImages: [
        ...snapshot.staticImages,
        {
          id: 99,
          static_role_id: "static-role",
          filename: "dup.jpg",
          cloudinary_public_id: "webtest/portfolio-covers/static-role/dup"
        }
      ]
    };
    expect(buildCoverPhotoOptions(staticRole, withCoverDup)).toEqual([
      {
        source: "static",
        id: 21,
        label: "static-one.jpg",
        value: "static:21"
      }
    ]);
  });
});

describe("getCoverPayload", () => {
  test("maps dynamic work covers", () => {
    expect(getCoverPayload({
      coverTargetType: "work",
      selectedCoverWork: dynamicWork,
      selectedCoverRole: dynamicRole,
      selectedCoverPhoto: dynamicPhoto
    })).toEqual({ targetType: "work", targetId: 101, imageId: 11 });
  });

  test("maps dynamic role covers", () => {
    expect(getCoverPayload({
      coverTargetType: "role",
      selectedCoverWork: dynamicWork,
      selectedCoverRole: dynamicRole,
      selectedCoverPhoto: dynamicPhoto
    })).toEqual({ targetType: "role", targetId: 1, imageId: 11 });
  });

  test("maps static work covers", () => {
    expect(getCoverPayload({
      coverTargetType: "work",
      selectedCoverWork: staticWork,
      selectedCoverRole: staticRole,
      selectedCoverPhoto: staticPhoto
    })).toEqual({ targetType: "static-work", targetId: "static-work", imageId: 21 });
  });

  test("maps static and static-dynamic role covers", () => {
    expect(getCoverPayload({
      coverTargetType: "role",
      selectedCoverWork: staticWork,
      selectedCoverRole: staticRole,
      selectedCoverPhoto: staticPhoto
    })).toEqual({ targetType: "static-role", targetId: "static-role", imageId: 21 });

    expect(getCoverPayload({
      coverTargetType: "role",
      selectedCoverWork: staticWork,
      selectedCoverRole: staticDynamicRole,
      selectedCoverPhoto: staticPhoto
    })).toEqual({ targetType: "static-role", targetId: "static-work-new-role", imageId: 21 });
  });

  test("throws Chinese validation errors for incomplete selections", () => {
    expect(() => getCoverPayload({
      coverTargetType: "work",
      selectedCoverWork: undefined,
      selectedCoverRole: dynamicRole,
      selectedCoverPhoto: dynamicPhoto
    })).toThrow("请选择作品。");

    expect(() => getCoverPayload({
      coverTargetType: "role",
      selectedCoverWork: dynamicWork,
      selectedCoverRole: undefined,
      selectedCoverPhoto: dynamicPhoto
    })).toThrow("请选择角色。");

    expect(() => getCoverPayload({
      coverTargetType: "role",
      selectedCoverWork: dynamicWork,
      selectedCoverRole: dynamicRole,
      selectedCoverPhoto: undefined
    })).toThrow("请选择封面照片。");
  });
});
