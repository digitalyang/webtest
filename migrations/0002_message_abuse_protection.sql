CREATE TABLE IF NOT EXISTS message_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_key TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_message_events_client_time
  ON message_events (client_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_events_duplicate
  ON message_events (client_key, content_hash, created_at DESC);
