CREATE TABLE IF NOT EXISTS portfolio_works (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  cover_image_id INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_hidden INTEGER NOT NULL DEFAULT 0 CHECK (is_hidden IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portfolio_works_visible_order
  ON portfolio_works (is_hidden, sort_order, id);

CREATE TABLE IF NOT EXISTS portfolio_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  cover_image_id INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_hidden INTEGER NOT NULL DEFAULT 0 CHECK (is_hidden IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (work_id) REFERENCES portfolio_works(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_roles_work_slug
  ON portfolio_roles (work_id, slug);

CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_roles_id_work
  ON portfolio_roles (id, work_id);

CREATE INDEX IF NOT EXISTS idx_portfolio_roles_visible_order
  ON portfolio_roles (work_id, is_hidden, sort_order, id);

CREATE TABLE IF NOT EXISTS portfolio_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
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
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (work_id) REFERENCES portfolio_works(id),
  FOREIGN KEY (role_id) REFERENCES portfolio_roles(id),
  FOREIGN KEY (role_id, work_id) REFERENCES portfolio_roles(id, work_id)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_images_role_visible_order
  ON portfolio_images (role_id, is_hidden, sort_order, id);

CREATE INDEX IF NOT EXISTS idx_portfolio_images_work_visible_order
  ON portfolio_images (work_id, is_hidden, sort_order, id);
