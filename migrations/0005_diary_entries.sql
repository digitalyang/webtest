CREATE TABLE IF NOT EXISTS diary_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  entry_date TEXT NOT NULL,
  content TEXT NOT NULL,
  is_hidden INTEGER NOT NULL DEFAULT 0 CHECK (is_hidden IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_diary_entries_visible_date
  ON diary_entries (is_hidden, entry_date DESC, id DESC);

INSERT INTO diary_entries (title, entry_date, content)
SELECT '把站点整理成个人主页', '2026-05-19', '今天把页面整理成更像个人博客的结构，新增了个人简介、作品集、日记和留言板。'
WHERE NOT EXISTS (
  SELECT 1 FROM diary_entries WHERE entry_date = '2026-05-19' AND title = '把站点整理成个人主页'
);

INSERT INTO diary_entries (title, entry_date, content)
SELECT '第一次整理静态网页', '2026-05-18', '从一个简单的 HTML 页面开始，逐步拆出页面、样式、脚本和资源目录。'
WHERE NOT EXISTS (
  SELECT 1 FROM diary_entries WHERE entry_date = '2026-05-18' AND title = '第一次整理静态网页'
);
