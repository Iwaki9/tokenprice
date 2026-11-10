-- Initial schema for TokenRate on Cloudflare D1.
-- Complex fields (features, tags, official, crawlConfig, minTopUp) are stored as JSON text.

CREATE TABLE IF NOT EXISTS vendors (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand_color TEXT NOT NULL,
  mark TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS models (
  slug TEXT PRIMARY KEY,
  vendor TEXT NOT NULL,
  name TEXT NOT NULL,
  official TEXT NOT NULL,
  released_at TEXT,
  context_window INTEGER,
  status TEXT NOT NULL,
  featured INTEGER NOT NULL DEFAULT 0,
  summary_ru TEXT,
  summary_en TEXT
);

CREATE TABLE IF NOT EXISTS providers (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tagline_ru TEXT,
  tagline_en TEXT,
  homepage TEXT,
  referral_url TEXT,
  referral_param TEXT,
  features TEXT NOT NULL,
  tags TEXT NOT NULL,
  min_top_up TEXT,
  api_base TEXT,
  pricing_url TEXT,
  crawl_adapter TEXT,
  crawl_config TEXT,
  status TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 0,
  contact_email TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prices (
  provider_slug TEXT NOT NULL,
  model_slug TEXT NOT NULL,
  input REAL NOT NULL,
  output REAL NOT NULL,
  cache_read REAL,
  cache_write REAL,
  source_url TEXT,
  observed_at TEXT,
  note TEXT,
  PRIMARY KEY (provider_slug, model_slug)
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  homepage TEXT NOT NULL,
  referral_url TEXT,
  contact_email TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS probes (
  provider_slug TEXT NOT NULL,
  at TEXT NOT NULL,
  ok INTEGER NOT NULL,
  status INTEGER,
  latency_ms INTEGER,
  error TEXT
);
CREATE INDEX IF NOT EXISTS probes_provider_at ON probes (provider_slug, at);

CREATE TABLE IF NOT EXISTS clicks (
  slug TEXT NOT NULL,
  at TEXT NOT NULL,
  ref TEXT,
  country TEXT,
  ua TEXT
);
CREATE INDEX IF NOT EXISTS clicks_slug_at ON clicks (slug, at);
