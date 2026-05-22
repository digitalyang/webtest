CREATE TABLE IF NOT EXISTS portfolio_image_credits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image_source TEXT NOT NULL CHECK (image_source IN ('static-local', 'dynamic', 'static-image')),
  image_key TEXT NOT NULL,
  coser_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_image_credits_image
  ON portfolio_image_credits (image_source, image_key);
