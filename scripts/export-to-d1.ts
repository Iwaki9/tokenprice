// Turns data/*.json and probes.jsonl into a SQL file for `wrangler d1 execute`.
// Usage: npx tsx scripts/export-to-d1.ts > data/d1-import.sql
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = path.join(__dirname, "..", "data");
const read = <T>(name: string): T[] => {
  const file = path.join(root, name);
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T[]) : [];
};

const q = (value: unknown): string => {
  if (value === undefined || value === null) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "object") return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
};

const out: string[] = ["BEGIN;", "DELETE FROM vendors;", "DELETE FROM models;", "DELETE FROM providers;", "DELETE FROM prices;", "DELETE FROM submissions;", "DELETE FROM probes;"];

for (const v of read<{ slug: string; name: string; brandColor: string; mark: string }>("vendors.json")) {
  out.push(`INSERT INTO vendors (slug, name, brand_color, mark) VALUES (${q(v.slug)}, ${q(v.name)}, ${q(v.brandColor)}, ${q(v.mark)});`);
}

for (const m of read<any>("models.json")) {
  out.push(
    `INSERT INTO models (slug, vendor, name, official, released_at, context_window, status, featured, summary_ru, summary_en) VALUES (${q(m.slug)}, ${q(m.vendor)}, ${q(m.name)}, ${q(m.official)}, ${q(m.releasedAt)}, ${q(m.contextWindow)}, ${q(m.status)}, ${q(m.featured ? 1 : 0)}, ${q(m.summaryRu)}, ${q(m.summaryEn)});`,
  );
}

for (const p of read<any>("providers.json")) {
  out.push(
    `INSERT INTO providers (slug, name, tagline_ru, tagline_en, homepage, referral_url, referral_param, features, tags, min_top_up, api_base, pricing_url, crawl_adapter, crawl_config, status, is_demo, contact_email, created_at, updated_at) VALUES (${q(p.slug)}, ${q(p.name)}, ${q(p.taglineRu)}, ${q(p.taglineEn)}, ${q(p.homepage)}, ${q(p.referralUrl)}, ${q(p.referralParam)}, ${q(p.features ?? {})}, ${q(p.tags ?? [])}, ${q(p.minTopUp ?? null)}, ${q(p.apiBase)}, ${q(p.pricingUrl)}, ${q(p.crawlAdapter)}, ${q(p.crawlConfig ?? null)}, ${q(p.status)}, ${q(p.isDemo ? 1 : 0)}, ${q(p.contactEmail)}, ${q(p.createdAt)}, ${q(p.updatedAt)});`,
  );
}

const latestQuote = new Map<string, any>();
for (const p of read<any>("prices.json")) latestQuote.set(`${p.providerSlug}\u0000${p.modelSlug}`, p);
for (const p of latestQuote.values()) {
  out.push(
    `INSERT INTO prices (provider_slug, model_slug, input, output, cache_read, cache_write, source_url, observed_at, note) VALUES (${q(p.providerSlug)}, ${q(p.modelSlug)}, ${q(p.input)}, ${q(p.output)}, ${q(p.cacheRead ?? null)}, ${q(p.cacheWrite ?? null)}, ${q(p.sourceUrl)}, ${q(p.observedAt)}, ${q(p.note)});`,
  );
}

for (const s of read<any>("submissions.json")) {
  out.push(
    `INSERT INTO submissions (id, name, homepage, referral_url, contact_email, message, status, created_at) VALUES (${q(s.id)}, ${q(s.name)}, ${q(s.homepage)}, ${q(s.referralUrl)}, ${q(s.contactEmail)}, ${q(s.message)}, ${q(s.status)}, ${q(s.createdAt)});`,
  );
}

const probeFile = path.join(root, "probes.jsonl");
if (existsSync(probeFile)) {
  for (const line of readFileSync(probeFile, "utf8").split("\n").filter(Boolean)) {
    const p = JSON.parse(line);
    out.push(
      `INSERT INTO probes (provider_slug, at, ok, status, latency_ms, error) VALUES (${q(p.providerSlug)}, ${q(p.at)}, ${q(p.ok ? 1 : 0)}, ${q(p.status)}, ${q(p.latencyMs)}, ${q(p.error)});`,
    );
  }
}

out.push("COMMIT;");
process.stdout.write(`${out.join("\n")}\n`);
