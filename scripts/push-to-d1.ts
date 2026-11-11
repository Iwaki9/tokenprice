// Syncs local data files to the remote Cloudflare D1 database.
// Clicks and submissions are NEVER touched: they only live in production.
//
//   npx tsx scripts/push-to-d1.ts                 full replace (daily, after prices crawl)
//   npx tsx scripts/push-to-d1.ts --stats-only    delta: new probes + provider_stats upserts
//
// D1 free tier caps rows written at 100k/day and warns near the cap; a full
// replace every 30-minute health cycle would burn ~115k rows/day, so the
// frequent cycles push only the delta and track it in a marker file.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { computeStats } from "../src/lib/monitoring";

const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "data");
const TMP = path.join(ROOT, "data", ".d1-push");
const MARKER = path.join(DATA, ".d1-push-marker.json");
const CHUNK = 150;
const statsOnly = process.argv.includes("--stats-only");

type Marker = { probeAt?: string };
const marker: Marker = existsSync(MARKER) ? JSON.parse(readFileSync(MARKER, "utf8")) : {};

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

type ProbeRow = { providerSlug: string; at: string; ok: boolean; status: number | null; latencyMs: number | null; error?: string };

function readProbeRows30d(): ProbeRow[] {
  const file = path.join(DATA, "probes.jsonl");
  if (!existsSync(file)) return [];
  const cutoff = Date.now() - 30 * 86_400_000;
  return readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ProbeRow)
    .filter((p) => new Date(p.at).getTime() >= cutoff);
}

const probeInsert = (p: ProbeRow) =>
  `INSERT INTO probes (provider_slug, at, ok, status, latency_ms, error) VALUES (${q(p.providerSlug)}, ${q(p.at)}, ${q(p.ok ? 1 : 0)}, ${q(p.status)}, ${q(p.latencyMs)}, ${q(p.error)});`;

function statsUpserts(probes: ProbeRow[]): string[] {
  const byProvider = new Map<string, ProbeRow[]>();
  for (const p of probes) {
    const list = byProvider.get(p.providerSlug) ?? [];
    list.push(p);
    byProvider.set(p.providerSlug, list);
  }
  const computedAt = new Date().toISOString();
  const sql: string[] = [];
  for (const [slug, list] of byProvider) {
    const st = computeStats(list);
    sql.push(
      `INSERT INTO provider_stats (provider_slug, status, uptime7d, uptime30d, p95, median, composite, samples24h, spark, last_at, last_ok_at, computed_at) VALUES (${q(slug)}, ${q(st.status)}, ${q(st.uptime7d)}, ${q(st.uptime30d)}, ${q(st.p95)}, ${q(st.median)}, ${q(st.composite)}, ${q(st.samples24h)}, ${q(st.spark)}, ${q(st.lastAt)}, ${q(st.lastOkAt)}, ${q(computedAt)}) ON CONFLICT(provider_slug) DO UPDATE SET status = excluded.status, uptime7d = excluded.uptime7d, uptime30d = excluded.uptime30d, p95 = excluded.p95, median = excluded.median, composite = excluded.composite, samples24h = excluded.samples24h, spark = excluded.spark, last_at = excluded.last_at, last_ok_at = excluded.last_ok_at, computed_at = excluded.computed_at;`,
    );
  }
  return sql;
}

function runChunks(inserts: string[], label: string) {
  if (!inserts.length) {
    console.log(`push-to-d1: ${label}, nothing to write`);
    return;
  }
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  const files: string[] = [];
  for (let i = 0; i * CHUNK < inserts.length; i += 1) {
    const file = path.join(TMP, `part-${i}.sql`);
    writeFileSync(file, `${inserts.slice(i * CHUNK, (i + 1) * CHUNK).join("\n")}\n`, "utf8");
    files.push(file);
  }
  const wranglerBin = path.join(ROOT, "node_modules", "wrangler", "bin", "wrangler.js");
  for (const [index, file] of files.entries()) {
    // A dropped chunk between parts leaves D1 half-synced (e.g. prices deleted,
    // not re-inserted), so retry a failing part before giving up.
    let attempt = 0;
    for (;;) {
      attempt += 1;
      try {
        execFileSync(process.execPath, [wranglerBin, "d1", "execute", "tokenprice", "--remote", "--file", file], {
          cwd: ROOT,
          stdio: "pipe",
          env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID ?? "" },
        });
        break;
      } catch (error) {
        if (attempt >= 3) throw error;
        const waitMs = 5_000 * attempt;
        console.log(`part ${index + 1} attempt ${attempt} failed, retrying in ${waitMs / 1000}s (${String((error as Error).message).slice(0, 80)})`);
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, waitMs);
      }
    }
    console.log(`pushed part ${index + 1}/${files.length}`);
  }
  rmSync(TMP, { recursive: true, force: true });
  console.log(`push-to-d1: ${label}`);
}

const probes = readProbeRows30d();

if (statsOnly) {
  const since = marker.probeAt;
  const fresh = since ? probes.filter((p) => p.at > since) : [];
  const inserts = [...fresh.map(probeInsert), ...statsUpserts(probes)];
  runChunks(inserts, `stats-only: ${fresh.length} new probes + ${inserts.length - fresh.length} stats rows`);
} else {
  const inserts: string[] = [
    "DELETE FROM vendors;",
    "DELETE FROM models;",
    "DELETE FROM providers;",
    "DELETE FROM prices;",
    "DELETE FROM probes;",
    "DELETE FROM provider_stats;",
  ];
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
      `INSERT INTO providers (slug, name, tagline_ru, tagline_en, homepage, referral_url, referral_param, features, tags, min_top_up, api_base, pricing_url, crawl_adapter, crawl_config, billing_model, plans, status, is_demo, contact_email, created_at, updated_at) VALUES (${q(p.slug)}, ${q(p.name)}, ${q(p.taglineRu)}, ${q(p.taglineEn)}, ${q(p.homepage)}, ${q(p.referralUrl)}, ${q(p.referralParam)}, ${q(p.features ?? {})}, ${q(p.tags ?? [])}, ${q(p.minTopUp ?? null)}, ${q(p.apiBase)}, ${q(p.pricingUrl)}, ${q(p.crawlAdapter)}, ${q(p.crawlConfig ?? null)}, ${q(p.billingModel ?? null)}, ${q(p.plans ?? null)}, ${q(p.status)}, ${q(p.isDemo ? 1 : 0)}, ${q(p.contactEmail)}, ${q(p.createdAt)}, ${q(p.updatedAt)});`,
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
  inserts.push(...probes.map(probeInsert), ...statsUpserts(probes));
  runChunks(inserts, `${inserts.filter((s) => !s.startsWith("DELETE FROM")).length} rows synced (full)`);
}

marker.probeAt = probes.at(-1)?.at ?? marker.probeAt;
writeFileSync(MARKER, `${JSON.stringify(marker, null, 2)}\n`, "utf8");
