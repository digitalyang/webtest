# Portfolio Static Image Dedup & Unified Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove duplicate gallery rows in portfolio admin UI (filter `portfolio-covers` legacy rows) and unify hide/restore so operators pick one「图片」target instead of separate dynamic vs appended flows.

**Architecture:** Extract `isStaticCoverOnlyImage` / `filterGalleryStaticImages` into `lib/portfolio-static-images.js`. Refactor `buildVisibilityImageOptions` to branch on selected role only and map static selections to `static-image` payloads internally. Merge admin image snapshots into one list while keeping existing PATCH routes.

**Tech Stack:** Next.js App Router, Vitest, `components/admin/PortfolioAdmin.jsx`, client helpers under `lib/client/`.

**Spec:** `docs/superpowers/specs/2026-05-26-portfolio-static-image-dedup-design.md`

---

## File Structure

| File | Responsibility |
|------|----------------|
| `lib/portfolio-static-images.js` | `isStaticCoverOnlyImage`, `filterGalleryStaticImages` |
| `tests/portfolio-static-images.test.js` | Cover-only detection and filter |
| `lib/portfolio-admin.js` | Import shared filter; remove local duplicate |
| `lib/client/portfolio-cn-options.js` | Import shared filter; remove local duplicate |
| `lib/client/portfolio-visibility-options.js` | Unified image options + payload mapping |
| `lib/client/portfolio-cover-options.js` | Filter static cover-only rows |
| `lib/client/portfolio-image-snapshot.js` | `buildPortfolioImageSnapshotItems` for merged admin list |
| `components/admin/PortfolioAdmin.jsx` | UI: 3 target types; merged snapshot |
| `tests/portfolio-visibility-options.test.js` | Updated signatures and dedup cases |
| `tests/portfolio-cover-options.test.js` | Cover-only exclusion |
| `tests/admin-portfolio-page.test.js` | Snapshot title expectations |

---

### Task 1: Shared static image filter module

**Files:**
- Create: `lib/portfolio-static-images.js`
- Create: `tests/portfolio-static-images.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/portfolio-static-images.test.js`:

```js
import { describe, expect, test } from "vitest";
import {
  filterGalleryStaticImages,
  isStaticCoverOnlyImage
} from "../lib/portfolio-static-images.js";

describe("portfolio static images", () => {
  test("detects portfolio-covers public ids", () => {
    expect(isStaticCoverOnlyImage({
      cloudinary_public_id: "webtest/portfolio-covers/hok/daji/daji_1"
    })).toBe(true);
    expect(isStaticCoverOnlyImage({
      cloudinary_public_id: "webtest/portfolio/hok/daji/daji_1"
    })).toBe(false);
    expect(isStaticCoverOnlyImage({})).toBe(false);
  });

  test("filterGalleryStaticImages removes cover-only rows", () => {
    const images = [
      { id: 1, cloudinary_public_id: "webtest/portfolio/hok/daji/daji_1" },
      { id: 2, cloudinary_public_id: "webtest/portfolio-covers/hok/daji/daji_1" }
    ];
    expect(filterGalleryStaticImages(images)).toEqual([images[0]]);
    expect(filterGalleryStaticImages(null)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/portfolio-static-images.test.js`  
Expected: FAIL — cannot find module `../lib/portfolio-static-images.js`

- [ ] **Step 3: Implement module**

Create `lib/portfolio-static-images.js`:

```js
export function isStaticCoverOnlyImage(image) {
  return String(image?.cloudinary_public_id || "").startsWith("webtest/portfolio-covers/");
}

export function filterGalleryStaticImages(images) {
  return (images || []).filter((image) => !isStaticCoverOnlyImage(image));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/portfolio-static-images.test.js`  
Expected: PASS

---

### Task 2: Wire shared filter into server merge and CN options

**Files:**
- Modify: `lib/portfolio-admin.js` (remove local `isStaticCoverOnlyImage`, import from `portfolio-static-images.js`)
- Modify: `lib/client/portfolio-cn-options.js` (same)

- [ ] **Step 1: Update `lib/portfolio-admin.js`**

Add at top:

```js
import { filterGalleryStaticImages, isStaticCoverOnlyImage } from "./portfolio-static-images.js";
```

Delete the local `function isStaticCoverOnlyImage` at the bottom of the file. No behavior change — `appendedImages` and gallery merge already call `isStaticCoverOnlyImage`.

- [ ] **Step 2: Update `lib/client/portfolio-cn-options.js`**

```js
import { filterGalleryStaticImages, isStaticCoverOnlyImage } from "../portfolio-static-images.js";
```

Replace inline `.filter((image) => !isStaticCoverOnlyImage(image))` chain with:

```js
return filterGalleryStaticImages(snapshot.staticImages || [])
  .filter((image) => String(image.static_role_id) === String(role.id))
```

Remove local `isStaticCoverOnlyImage` function.

- [ ] **Step 3: Run existing tests**

Run: `npm test -- tests/portfolio-cn-options.test.js tests/portfolio-admin-helpers.test.js`  
Expected: PASS (no regressions)

---

### Task 3: Unified visibility image options + payload

**Files:**
- Modify: `lib/client/portfolio-visibility-options.js`
- Modify: `tests/portfolio-visibility-options.test.js`

- [ ] **Step 1: Update constants and `buildVisibilityImageOptions` signature**

At top of `portfolio-visibility-options.js`:

```js
import { filterGalleryStaticImages } from "../portfolio-static-images.js";

const TARGET_TYPES_REQUIRING_ROLE = new Set(["role", "image"]);
const TARGET_TYPES_REQUIRING_IMAGE = new Set(["image"]);
const VALID_TARGET_TYPES = new Set(["work", "role", "image"]);
```

Replace `buildVisibilityImageOptions(snapshot, targetType, roleKey)` with:

```js
export function buildVisibilityImageOptions(snapshot = {}, roleKey = "") {
  const role = parseOptionKey(roleKey);
  if (!role) return [];

  if (role.source === "dynamic") {
    return (snapshot.images || [])
      .filter((image) => String(image.role_id) === String(role.id))
      .map((image) => ({
        source: "dynamic",
        id: image.id,
        value: `dynamic:${image.id}`,
        label: withHiddenSuffix(getImageLabel(image), isHidden(image))
      }));
  }

  if (role.source === "static-role" || role.source === "static-manifest") {
    const staticRoleId = role.source === "static-role"
      ? findStaticRolePublicId(snapshot, role.id)
      : role.id;

    return filterGalleryStaticImages(snapshot.staticImages)
      .filter((image) => String(image.static_role_id) === String(staticRoleId))
      .map((image) => ({
        source: "static",
        id: image.id,
        value: `static:${image.id}`,
        label: withHiddenSuffix(getImageLabel(image), isHidden(image))
      }));
  }

  return [];
}
```

- [ ] **Step 2: Update `getVisibilityPayload` image branch**

Replace the separate `image` / `static-image` UI branches with:

```js
  if (targetType === "image") {
    if (image.source === "dynamic") {
      return { targetType: "image", targetId: image.id, isHidden: Boolean(isHidden) };
    }
    assertOptionSource(image, ["static"]);
    return {
      targetType: "static-image",
      targetId: `static:${image.id}`,
      isHidden: Boolean(isHidden)
    };
  }
```

Remove the trailing `assertOptionSource(image, ["static"])` block that only ran for `targetType === "static-image"`.

- [ ] **Step 3: Update visibility option tests**

In `tests/portfolio-visibility-options.test.js`:

1. Change calls from `buildVisibilityImageOptions(snapshot, "image", "dynamic:10")` to `buildVisibilityImageOptions(snapshot, "dynamic:10")`.

2. Change `buildVisibilityImageOptions(snapshot, "static-image", "static-manifest:...")` to `buildVisibilityImageOptions(snapshot, "static-manifest:...")`.

3. Replace payload test:

```js
expect(getVisibilityPayload({
  targetType: "image",
  workKey: "static:static-work",
  roleKey: "static-manifest:static-work-append",
  imageKey: "static:200",
  isHidden: true
})).toEqual({
  targetType: "static-image",
  targetId: "static:200",
  isHidden: true
});
```

4. Remove tests that pass `targetType: "static-image"` to `getVisibilityPayload` (invalid UI type).

5. Add dedup test:

```js
test("excludes portfolio-covers rows from static image options", () => {
  const dupSnapshot = {
    ...snapshot,
    staticImages: [
      {
        id: 200,
        static_role_id: "static-work-append",
        filename: "append_1.webp",
        cloudinary_public_id: "webtest/portfolio/fate/tamamo/append_1"
      },
      {
        id: 201,
        static_role_id: "static-work-append",
        filename: "append_1.webp",
        cloudinary_public_id: "webtest/portfolio-covers/fate/tamamo/append_1"
      }
    ]
  };
  const options = buildVisibilityImageOptions(dupSnapshot, "static-manifest:static-work-append");
  expect(options).toHaveLength(1);
  expect(options[0].id).toBe(200);
});
```

- [ ] **Step 4: Run visibility tests**

Run: `npm test -- tests/portfolio-visibility-options.test.js`  
Expected: PASS

---

### Task 4: Cover photo options filter

**Files:**
- Modify: `lib/client/portfolio-cover-options.js`
- Modify: `tests/portfolio-cover-options.test.js`

- [ ] **Step 1: Add filter to static branch**

```js
import { filterGalleryStaticImages } from "../portfolio-static-images.js";
```

In static `return` branch:

```js
  return filterGalleryStaticImages(snapshot.staticImages)
    .filter((image) => String(image.static_role_id) === String(role.id))
```

- [ ] **Step 2: Add cover-only exclusion test**

```js
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
```

- [ ] **Step 3: Run cover tests**

Run: `npm test -- tests/portfolio-cover-options.test.js`  
Expected: PASS

---

### Task 5: Merged image snapshot helper

**Files:**
- Create: `lib/client/portfolio-image-snapshot.js`
- Create: `tests/portfolio-image-snapshot.test.js`

- [ ] **Step 1: Write failing tests**

```js
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
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm test -- tests/portfolio-image-snapshot.test.js`

- [ ] **Step 3: Implement helper**

Create `lib/client/portfolio-image-snapshot.js`:

```js
import { filterGalleryStaticImages } from "../portfolio-static-images.js";

function isHidden(row) {
  return row?.isHidden === true || row?.is_hidden === true || row?.is_hidden === 1;
}

export function buildPortfolioImageSnapshotItems(snapshot = {}) {
  const dynamicItems = (snapshot.images || []).map((image) => ({
    key: `dynamic-${image.id}`,
    rowKind: "dynamic",
    id: image.id,
    roleLabel: `role:${image.role_id}`,
    label: image.filename || image.cloudinary_public_id || `#${image.id}`,
    isHidden: isHidden(image),
    hideTargetType: "image",
    hideTargetId: image.id
  }));

  const staticItems = filterGalleryStaticImages(snapshot.staticImages).map((image) => ({
    key: `static-${image.id}`,
    rowKind: "static",
    id: image.id,
    roleLabel: `role:${image.static_role_id}`,
    label: image.filename || image.cloudinary_public_id || `#${image.id}`,
    isHidden: isHidden(image),
    hideTargetType: "static-image",
    hideTargetId: `static:${image.id}`
  }));

  return [...dynamicItems, ...staticItems];
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npm test -- tests/portfolio-image-snapshot.test.js`

---

### Task 6: PortfolioAdmin UI

**Files:**
- Modify: `components/admin/PortfolioAdmin.jsx`
- Modify: `tests/admin-portfolio-page.test.js`

- [ ] **Step 1: Update imports and visibility wiring**

```js
import { buildPortfolioImageSnapshotItems } from "../../lib/client/portfolio-image-snapshot";
```

Change:

```js
const visibilityImageOptions = buildVisibilityImageOptions(snapshot, visibilityRoleKey);
const visibilityNeedsRole = visibilityTargetType === "role" || visibilityTargetType === "image";
const visibilityNeedsImage = visibilityTargetType === "image";
```

Add:

```js
const portfolioImageSnapshotItems = buildPortfolioImageSnapshotItems(snapshot);
```

- [ ] **Step 2: Simplify operation object `<select>`**

Remove options:

```html
<option value="static-image">追加图片</option>
```

Change label:

```html
<option value="image">图片</option>
```

(was「动态图片」)

- [ ] **Step 3: Replace dual snapshot lists with one**

Remove the separate「图片 snapshot」and「追加图片 snapshot」`SnapshotList` blocks. Add:

```jsx
        <SnapshotList
          title="图片 snapshot"
          items={portfolioImageSnapshotItems}
          emptyText="暂无图片。"
          renderItem={(image) => (
            <>
              #{image.id} {image.roleLabel} {image.label} {image.isHidden ? "(hidden)" : ""}
              <button
                className="button secondary"
                type="button"
                disabled={isBusy}
                onClick={() => hideItem(image.hideTargetType, image.hideTargetId, !image.isHidden)}
              >
                {image.isHidden ? "恢复" : "隐藏"}
              </button>
            </>
          )}
        />
```

Use `key={image.key}` in `SnapshotList` if it currently keys by `item.id` only — update `SnapshotList` to accept `getItemKey={(item) => item.key ?? item.id}` or map with composite keys in the list component.

**Minimal fix in `SnapshotList`:**

```jsx
{items.map((item) => (
  <li key={item.key ?? item.id}>{renderItem(item)}</li>
))}
```

- [ ] **Step 4: Update admin page test**

In `tests/admin-portfolio-page.test.js`, replace:

```js
expect(html).toContain("追加图片 snapshot");
```

with:

```js
expect(html).not.toContain("追加图片 snapshot");
expect(html).toContain("图片 snapshot");
```

Ensure HTML does not contain `<option value="static-image">`.

- [ ] **Step 5: Manual smoke (local dev)**

1. Seed or use role with duplicate `Daji_1.jpeg` rows.  
2. Open `/admin/portfolio/upload` → 隐藏 / 恢复 → 操作对象「图片」→ 选静态角色 → 下拉仅 1 条 `Daji_1.jpeg`.  
3. 图片 snapshot 单列表，无重复 filename。

---

### Task 7: Full verification

- [ ] **Step 1: Run full test suite**

Run: `npm test`  
Expected: all tests PASS

- [ ] **Step 2: Optional local script**

If `scripts/verify-duplicate-from-local-d1.mjs` exists, run after D1 seed; visibility option count for `Daji_1.jpeg` should be `1`.

---

## Spec Self-Review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| `filterGalleryStaticImages` shared module | Task 1–2 |
| Visibility / cover / snapshot filter cover-only | Tasks 3–6 |
| Single「图片」operation object | Task 6 |
| `buildVisibilityImageOptions(roleKey)` auto branch | Task 3 |
| Payload maps static → `static-image` | Task 3 |
| Merged image snapshot | Tasks 5–6 |
| Keep work/role hiding | Unchanged in Task 6 |
| CN/cover `imageSource` unchanged | Task 2 only touches filter import |
| Tests + acceptance | Tasks 1–7 |

No placeholders remain in task steps.
