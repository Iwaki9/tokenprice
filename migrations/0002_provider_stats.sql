-- Precomputed monitoring stats per provider.
-- The crawler/push job fills this table; public pages read these few rows
-- instead of scanning the whole probes history (D1 free tier: 5M rows read/day).

CREATE TABLE IF NOT EXISTS provider_stats (
  provider_slug TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  uptime7d REAL,
  uptime30d REAL,
  p95 INTEGER,
  median INTEGER,
  composite INTEGER,
  samples24h INTEGER NOT NULL DEFAULT 0,
  spark TEXT NOT NULL DEFAULT '[]',
  last_at TEXT,
  last_ok_at TEXT,
  computed_at TEXT NOT NULL
);

-- Speeds up the remaining direct probe queries (admin pages).
CREATE INDEX IF NOT EXISTS probes_at ON probes (at);
