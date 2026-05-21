CREATE TABLE IF NOT EXISTS portfolio_static_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  static_work_id TEXT NOT NULL,
  static_role_id TEXT NOT NULL,
  cloudinary_public_id TEXT NOT NULL UNIQUE,
  secure_url TEXT NOT NULL,
  cover_thumb_url TEXT NOT NULL,
  filename TEXT NOT NULL,
  alt TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  format TEXT,
  bytes INTEGER,
  sort_order INTEGER NOT NULL,
  is_hidden INTEGER NOT NULL DEFAULT 0 CHECK (is_hidden IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portfolio_static_images_role_visible_order
  ON portfolio_static_images (static_role_id, is_hidden, sort_order, id);

CREATE INDEX IF NOT EXISTS idx_portfolio_static_images_work_visible_order
  ON portfolio_static_images (static_work_id, is_hidden, sort_order, id);

CREATE TABLE IF NOT EXISTS portfolio_static_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  static_work_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  cover_image_id INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_hidden INTEGER NOT NULL DEFAULT 0 CHECK (is_hidden IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_static_roles_work_slug
  ON portfolio_static_roles (static_work_id, slug);

CREATE INDEX IF NOT EXISTS idx_portfolio_static_roles_visible_order
  ON portfolio_static_roles (static_work_id, is_hidden, sort_order, id);

CREATE TABLE IF NOT EXISTS portfolio_static_cover_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_type TEXT NOT NULL CHECK (target_type IN ('work', 'role')),
  target_id TEXT NOT NULL,
  image_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (image_id) REFERENCES portfolio_static_images(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_static_cover_overrides_target
  ON portfolio_static_cover_overrides (target_type, target_id);
