ALTER TABLE portfolio_static_images ADD COLUMN legacy_local_src TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_static_images_legacy_local_src
  ON portfolio_static_images (legacy_local_src)
  WHERE legacy_local_src IS NOT NULL;
