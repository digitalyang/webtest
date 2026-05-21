# Portfolio Static Append Upload Design

## Goal

Allow the portfolio admin upload flow to add new Cloudinary images to existing static portfolio works and roles from `portfolio.json`.

The site owner should be able to choose an existing album from dropdowns, upload new images, and see those images appended to the same public portfolio pages without manually migrating old images or editing `portfolio.json`.

## Current Context

The portfolio currently has two sources:

- Static portfolio data from `public/assets/data/portfolio.json`.
- Dynamic D1-backed portfolio data from `portfolio_works`, `portfolio_roles`, and `portfolio_images`.

Current dynamic uploads only work for D1 works and roles because upload APIs require numeric `workId` and `roleId`. Static works and roles have string IDs, such as:

```text
work id: girlsbandcry
role id: girlsbandcry-nina
```

These string IDs do not exist in the D1 tables, so the current upload form cannot append images to existing static albums.

## Approved Direction

Use a static append model:

```text
portfolio.json static albums
+
D1 static append records
+
D1 dynamic albums
```

Do not migrate old images. Static albums remain in `portfolio.json`; newly uploaded Cloudinary images are stored in D1 append tables and merged into the static albums at render time.

The admin UI should hide implementation details. The owner should see normal work and album names in dropdowns, not "static" or "dynamic" labels.

## Data Model

Add D1 tables for static portfolio extensions.

### `portfolio_static_images`

Stores Cloudinary images appended to an existing static role.

```text
id INTEGER PRIMARY KEY AUTOINCREMENT
static_work_id TEXT NOT NULL
static_role_id TEXT NOT NULL
cloudinary_public_id TEXT NOT NULL UNIQUE
secure_url TEXT NOT NULL
cover_thumb_url TEXT NOT NULL
filename TEXT NOT NULL
alt TEXT NOT NULL
width INTEGER
height INTEGER
format TEXT
bytes INTEGER
sort_order INTEGER NOT NULL
is_hidden INTEGER NOT NULL DEFAULT 0
created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
```

Indexes should support:

- Listing appended images for a static role by `static_role_id, is_hidden, sort_order, id`.
- Listing appended images for a static work by `static_work_id, is_hidden, sort_order, id`.

### `portfolio_static_roles`

Stores new dynamic roles created under an existing static work.

```text
id INTEGER PRIMARY KEY AUTOINCREMENT
static_work_id TEXT NOT NULL
slug TEXT NOT NULL
title TEXT NOT NULL
cover_image_id INTEGER
sort_order INTEGER NOT NULL DEFAULT 0
is_hidden INTEGER NOT NULL DEFAULT 0
created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
```

Add a unique constraint on `(static_work_id, slug)`.

Images for these roles should also be stored in `portfolio_static_images`.

For a D1-created role under a static work, the public role ID is:

```text
{static_work_id}-{role.slug}
```

Example:

```text
static_work_id: girlsbandcry
role.slug: subaru
public static_role_id used by images: girlsbandcry-subaru
```

This keeps static-work dynamic roles separate from top-level dynamic works while using one image append table.

### `portfolio_static_cover_overrides`

Stores cover overrides for old static works and roles.

```text
id INTEGER PRIMARY KEY AUTOINCREMENT
target_type TEXT NOT NULL
target_id TEXT NOT NULL
image_id INTEGER NOT NULL
created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
```

`target_type` is either `work` or `role`.

Add a unique constraint on `(target_type, target_id)` so each static work or static role has at most one cover override.

## Admin Selection Model

The upload UI should use dropdowns instead of requiring the owner to type IDs.

### Work Dropdown

Show both static and dynamic works as normal work names:

```text
GirlsBandCry
FGO
HOK
<new dynamic work title>
```

The UI should not display "static" or "dynamic" as the primary label. If two labels are ambiguous, append slug or ID for clarity:

```text
Nina (girlsbandcry-nina)
Nina (#31)
```

Internally each option should carry:

```text
source: "static" | "dynamic"
id: static work id or dynamic work id
slug
title
```

### Role Dropdown

After selecting a work, show only roles under that work:

```text
Nina
Nero
Daji
<new dynamic role title>
```

Internally each role option should carry:

```text
source: "static" | "dynamic" | "static-dynamic"
workSource
workId
id
slug
title
```

`static-dynamic` means a D1-created role under a static work.

## Upload Behavior

The upload flow should branch by selected role type.

### Dynamic Role Under Dynamic Work

Use the existing D1 flow:

```text
portfolio_works
portfolio_roles
portfolio_images
```

Existing upload naming remains unchanged:

```text
webtest/portfolio/{workSlug}/{roleSlug}/{roleSlug}_{index}
```

### Static Role From `portfolio.json`

Use the static append flow:

```text
portfolio_static_images
```

The upload plan should use the static work ID and the final segment of the static role ID as the role slug.

Example:

```text
static_work_id: girlsbandcry
static_role_id: girlsbandcry-nina
public_id: webtest/portfolio/girlsbandcry/nina/nina_5
```

The next index should account for existing static images plus previous appended images, so new images continue from the visible album sequence.

Example:

```text
Static Nina images: 4
Existing appended images: 0
New upload starts at: 5
```

### Dynamic Role Under Static Work

Allow creating a new role under a static work.

Example:

```text
Static work: GirlsBandCry
New role: Subaru
```

Public portfolio display:

```text
GirlsBandCry
- Nina
- Subaru
```

The upload plan should use the static work ID and the new role slug:

```text
webtest/portfolio/girlsbandcry/subaru/subaru_1
```

## Public Portfolio Merge

Public portfolio data should merge in this order:

1. Start with `portfolio.json`.
2. Append visible `portfolio_static_images` to matching static roles.
3. Add visible `portfolio_static_roles` under matching static works.
4. Add existing D1 dynamic works as separate works.

For static roles, appended Cloudinary images should appear after existing local images.

Counts should be recalculated:

- Role `imageCount`.
- Work `imageCount`.
- Work `roleCount` when dynamic roles are added under static works.

## Covers

Default static covers should remain from `portfolio.json`.

If the admin sets a Cloudinary appended image as cover for a static role or static work, that D1 cover override should replace the static cover in public rendering.

Cover controls should support:

- Static work cover override.
- Static role cover override.
- Dynamic work cover.
- Dynamic role cover.

Use `portfolio_static_cover_overrides` for old static albums. The override points to an image in `portfolio_static_images`.

## Hide and Restore

Static original images remain controlled by `portfolio.json` and are not hidden from the admin UI in the first version.

New appended Cloudinary images should support hide/restore through D1.

New dynamic roles under static works should support hide/restore through D1.

Static works and original static roles are not hidden from the admin UI in the first version.

## Admin Snapshot

The admin snapshot endpoint should return enough data to build dropdown options:

- Static works and roles from `portfolio.json`.
- Dynamic works and roles from D1.
- Static append images from D1.
- Static-work dynamic roles from D1.
- Cloudinary configuration.

The UI should refresh this snapshot after:

- Creating a dynamic work.
- Creating a dynamic role.
- Creating a role under a static work.
- Uploading images.
- Setting cover.
- Hiding or restoring appended images or static-work dynamic roles.

## Error Handling

If a static work or role ID from the upload request no longer exists in `portfolio.json`, return a clear error:

```text
静态作品或角色不存在。
```

If a dynamic role under a static work references a missing static work, return:

```text
静态作品不存在。
```

If Cloudinary metadata does not match the server-generated upload plan, keep rejecting it as invalid.

## Out of Scope

- Migrating all `portfolio.json` data into D1.
- Editing original static image metadata.
- Hiding original static works or original static roles.
- Deleting Cloudinary assets.
- Drag-and-drop ordering.
- Replacing the existing dynamic D1 tables.
