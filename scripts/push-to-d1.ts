// Syncs local data files (providers, models, prices, probes, vendors) to the remote D1 database.
// Clicks and submissions are NOT touched: they only live in production.
// Usage: npx tsx scripts/push-to-d1.ts   (requires a wrangler login or CLOUDFLARE_* env vars)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { computeStats } from "../src/lib/monitoring";

const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "data");
const TMP = path.join(ROOT, "data", ".d1-push");
const CHUNK = 150;

const read = <T>(name: string): T[] => {
  const file = path.join(DATA, name);
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T[]) : [];
};

const q = (value: unknown): string => {
  if (value === undefined || value === null) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "object") return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
};

const inserts: string[] = [];
inserts.push(
  "DELETE FROM vendors;",
  "DELETE FROM models;",
  "DELETE FROM providers;",
  "DELETE FROM prices;",
  "DELETE FROM probes;",
);

for (const v of read<{ slug: string; name: string; brandColor: string; mark: string }>("vendors.json")) {
  inserts.push(`INSERT INTO vendors (slug, name, brand_color, mark) VALUES (${q(v.slug)}, ${q(v.name)}, ${q(v.brandColor)}, ${q(v.mark)});`);
}
for (const m of read<any>("models.json")) {
  inserts.push(
    `INSERT INTO models (slug, vendor, name, official, released_at, context_window, status, featured, summary_ru, summary_en) VALUES (${q(m.slug)}, ${q(m.vendor)}, ${q(m.name)}, ${q(m.official)}, ${q(m.releasedAt)}, ${q(m.contextWindow)}, ${q(m.status)}, ${q(m.featured ? 1 : 0)}, ${q(m.summaryRu)}, ${q(m.summaryEn)});`,
  );
}
for (const p of read<any>("providers.json")) {
  inserts.push(
    `INSERT INTO providers (slug, name, tagline_ru, tagline_en, homepage, referral_url, referral_param, features, tags, min_top_up, api_base, pricing_url, crawl_adapter, crawl_config, status, is_demo, contact_email, created_at, updated_at) VALUES (${q(p.slug)}, ${q(p.name)}, ${q(p.taglineRu)}, ${q(p.taglineEn)}, ${q(p.homepage)}, ${q(p.referralUrl)}, ${q(p.referralParam)}, ${q(p.features ?? {})}, ${q(p.tags ?? [])}, ${q(p.minTopUp ?? null)}, ${q(p.apiBase)}, ${q(p.pricingUrl)}, ${q(p.crawlAdapter)}, ${q(p.crawlConfig ?? null)}, ${q(p.status)}, ${q(p.isDemo ? 1 : 0)}, ${q(p.contactEmail)}, ${q(p.createdAt)}, ${q(p.updatedAt)});`,
  );
}
// Keep only the latest row per (provider, model), matching upsertQuote semantics.
const quotes = new Map<string, any>();
for (const p of read<any>("prices.json")) quotes.set(`${p.providerSlug}\u0000${p.modelSlug}`, p);
for (const p of quotes.values()) {
  inserts.push(
    `INSERT INTO prices (provider_slug, model_slug, input, output, cache_read, cache_write, source_url, observed_at, note) VALUES (${q(p.providerSlug)}, ${q(p.modelSlug)}, ${q(p.input)}, ${q(p.output)}, ${q(p.cacheRead ?? null)}, ${q(p.cacheWrite ?? null)}, ${q(p.sourceUrl)}, ${q(p.observedAt)}, ${q(p.note)});`,
  );
}
// Probes: last 30 days only, to keep D1 small.
// provider_stats: precomputed aggregates so public pages never scan probes.
const probeFile = path.join(DATA, "probes.jsonl");
if (existsSync(probeFile)) {
  const cutoff = Date.now() - 30 * 86_400_000;
  const lines = readFileSync(probeFile, "utf8").split("\n").filter(Boolean);
  const pushed: { providerSlug: string; at: string; ok: boolean; status: number | null; latencyMs: number | null; error?: string }[] = [];
  for (const line of lines) {
    const p = JSON.parse(line);
    if (new Date(p.at).getTime() < cutoff) continue;
    pushed.push(p);
    inserts.push(
      `INSERT INTO probes (provider_slug, at, ok, status, latency_ms, error) VALUES (${q(p.providerSlug)}, ${q(p.at)}, ${q(p.ok ? 1 : 0)}, ${q(p.status)}, ${q(p.latencyMs)}, ${q(p.error)});`,
    );
  }
  const byProvider = new Map<string, typeof pushed>();
  for (const p of pushed) {
    const list = byProvider.get(p.providerSlug) ?? [];
    list.push(p);
    byProvider.set(p.providerSlug, list);
  }
  inserts.push("DELETE FROM provider_stats;");
  const computedAt = new Date().toISOString();
  for (const [slug, list] of byProvider) {
    const st = computeStats(list);
    inserts.push(
      `INSERT INTO provider_stats (provider_slug, status, uptime7d, uptime30d, p95, median, composite, samples24h, spark, last_at, last_ok_at, computed_at) VALUES (${q(slug)}, ${q(st.status)}, ${q(st.uptime7d)}, ${q(st.uptime30d)}, ${q(st.p95)}, ${q(st.median)}, ${q(st.composite)}, ${q(st.samples24h)}, ${q(st.spark)}, ${q(st.lastAt)}, ${q(st.lastOkAt)}, ${q(computedAt)}) ON CONFLICT(provider_slug) DO UPDATE SET status = excluded.status, uptime7d = excluded.uptime7d, uptime30d = excluded.uptime30d, p95 = excluded.p95, median = excluded.median, composite = excluded.composite, samples24h = excluded.samples24h, spark = excluded.spark, last_at = excluded.last_at, last_ok_at = excluded.last_ok_at, computed_at = excluded.computed_at;`,
    );
  }
}

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
for (let i = 0; i * CHUNK < inserts.length; i += 1) {
  const part = inserts.slice(i * CHUNK, (i + 1) * CHUNK);
  const file = path.join(TMP, `part-${i}.sql`);
  writeFileSync(file, `${part.join("\n")}\n`, "utf8");
}
const files: string[] = [];
for (let i = 0; i * CHUNK < inserts.length; i += 1) files.push(path.join(TMP, `part-${i}.sql`));

const wranglerBin = path.join(ROOT, "node_modules", "wrangler", "bin", "wrangler.js");
for (const [index, file] of files.entries()) {
  execFileSync(process.execPath, [wranglerBin, "d1", "execute", "tokenprice", "--remote", "--file", file], {
    cwd: ROOT,
    stdio: "pipe",
  });
  console.log(`pushed part ${index + 1}/${files.length}`);
}
rmSync(TMP, { recursive: true, force: true });
console.log(`push-to-d1: ${inserts.filter((s) => !s.startsWith("DELETE FROM")).length} rows synced`);
