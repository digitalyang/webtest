CREATE TABLE IF NOT EXISTS about_profile_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  content_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_about_profile_single_draft
  ON about_profile_versions (status)
  WHERE status = 'draft';

CREATE UNIQUE INDEX IF NOT EXISTS idx_about_profile_single_published
  ON about_profile_versions (status)
  WHERE status = 'published';
