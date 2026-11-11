import { promises as fs } from "node:fs";
import path from "node:path";
import { getD1 } from "./db";

export type Probe = {
  providerSlug: string;
  at: string;
  ok: boolean;
  status: number | null;
  latencyMs: number | null;
  error?: string;
};

export type MonitorStatus = "ok" | "degraded" | "down" | "paused" | "unknown";

export type MonitorStats = {
  status: MonitorStatus;
  uptime7d: number | null;
  uptime30d: number | null;
  p95: number | null;
  median: number | null;
  composite: number | null;
  lastAt: string | null;
  lastOkAt: string | null;
  samples24h: number;
  spark: number[];
};

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), "data");

const PROBE_FILE = path.join(DATA_DIR, "probes.jsonl");

/* ------------------------------------------------------------------ caches
 * D1 charges per row read (free tier: 5M/day). Pages must never re-scan the
 * probe history per request: within one isolate we serve precomputed stats
 * and raw probes from short-lived caches, and the public site reads the tiny
 * provider_stats table instead of probes at all. */

const STATS_TTL_MS = 60_000;
const PROBES_TTL_MS = 120_000;

let probesCache: { at: number; value: Probe[] } | null = null;
let statsCache: { at: number; value: Map<string, MonitorStats> } | null = null;

export async function readProbes(limit = 60_000): Promise<Probe[]> {
  const now = Date.now();
  if (probesCache && now - probesCache.at < PROBES_TTL_MS) return probesCache.value;
  const db = await getD1();
  if (db) {
    const result = await db
      .prepare(
        "SELECT provider_slug, at, ok, status, latency_ms, error FROM probes ORDER BY at DESC LIMIT ?",
      )
      .bind(limit)
      .all<Record<string, unknown>>();
    const probes = result.results
      .map((r) => ({
        providerSlug: String(r.provider_slug),
        at: String(r.at),
        ok: Boolean(r.ok),
        status: r.status != null ? Number(r.status) : null,
        latencyMs: r.latency_ms != null ? Number(r.latency_ms) : null,
        error: r.error ? String(r.error) : undefined,
      }))
      .reverse();
    probesCache = { at: now, value: probes };
    return probes;
  }
  try {
    const raw = await fs.readFile(/*turbopackIgnore: true*/ PROBE_FILE, "utf8");
    const lines = raw.split("\n").filter(Boolean);
    return lines.slice(-limit).map((line) => JSON.parse(line) as Probe);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function appendProbes(probes: Probe[]) {
  if (probes.length === 0) return;
  const db = await getD1();
  if (db) {
    await db.batch(
      probes.map((p) =>
        db
          .prepare(
            "INSERT INTO probes (provider_slug, at, ok, status, latency_ms, error) VALUES (?, ?, ?, ?, ?, ?)",
          )
          .bind(p.providerSlug, p.at, p.ok ? 1 : 0, p.status, p.latencyMs, p.error ?? null),
      ),
    );
    return;
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  const payload = probes.map((p) => JSON.stringify(p)).join("\n");
  await fs.appendFile(PROBE_FILE, `${payload}\n`, "utf8");
}

/**
 * Map of per-provider monitoring stats for public pages.
 * On Cloudflare this reads the tiny provider_stats table (written by the
 * push job); locally it recomputes from probes.jsonl. Both are isolate-cached.
 */
export async function readStatsMap(): Promise<Map<string, MonitorStats>> {
  const now = Date.now();
  if (statsCache && now - statsCache.at < STATS_TTL_MS) return statsCache.value;
  const db = await getD1();
  const map = new Map<string, MonitorStats>();
  if (db) {
    const rows = await db
      .prepare(
        "SELECT provider_slug, status, uptime7d, uptime30d, p95, median, composite, samples24h, spark, last_at, last_ok_at FROM provider_stats",
      )
      .all<Record<string, unknown>>();
    for (const r of rows.results) {
      let spark: number[] = [];
      try {
        spark = JSON.parse(String(r.spark || "[]"));
      } catch {
        spark = [];
      }
      map.set(String(r.provider_slug), {
        status: String(r.status) as MonitorStatus,
        uptime7d: r.uptime7d == null ? null : Number(r.uptime7d),
        uptime30d: r.uptime30d == null ? null : Number(r.uptime30d),
        p95: r.p95 == null ? null : Number(r.p95),
        median: r.median == null ? null : Number(r.median),
        composite: r.composite == null ? null : Number(r.composite),
        lastAt: r.last_at ? String(r.last_at) : null,
        lastOkAt: r.last_ok_at ? String(r.last_ok_at) : null,
        samples24h: Number(r.samples24h ?? 0),
        spark: Array.isArray(spark) ? spark.map(Number) : [],
      });
    }
  } else {
    const probes = await readProbes();
    const grouped = new Map<string, Probe[]>();
    for (const probe of probes) {
      const list = grouped.get(probe.providerSlug) ?? [];
      list.push(probe);
      grouped.set(probe.providerSlug, list);
    }
    for (const [slug, list] of grouped) map.set(slug, computeStats(list));
  }
  statsCache = { at: now, value: map };
  return map;
}

function percentile(values: number[], p: number) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[index];
}

export const EMPTY_STATS: MonitorStats = {
  status: "unknown",
  uptime7d: null,
  uptime30d: null,
  p95: null,
  median: null,
  composite: null,
  lastAt: null,
  lastOkAt: null,
  samples24h: 0,
  spark: [],
};

export function computeStats(probes: Probe[]): MonitorStats {
  const valid = probes.filter((p) => typeof p.at === "string");
  if (valid.length === 0) return EMPTY_STATS;

  const sorted = [...valid].sort((a, b) => a.at.localeCompare(b.at));
  const now = Date.now();
  const day = 86_400_000;

  const within = (days: number) =>
    sorted.filter((p) => now - new Date(p.at).getTime() <= days * day);

  const last = sorted[sorted.length - 1];
  const lastOk = [...sorted].reverse().find((p) => p.ok) ?? null;

  const uptime = (window: Probe[]) => {
    if (window.length === 0) return null;
    return window.filter((p) => p.ok).length / window.length;
  };

  const healthy = sorted
    .filter((p) => p.ok && typeof p.latencyMs === "number")
    .slice(-200)
    .map((p) => p.latencyMs as number);

  const uptime7d = uptime(within(7));
  const uptime30d = uptime(within(30));
  const p95 = percentile(healthy, 95);
  const median = percentile(healthy, 50);

  let composite: number | null = null;
  if (uptime7d !== null && p95 !== null) {
    const connection = Math.min(100, uptime7d * 100);
    const stability = Math.min(100, (uptime30d ?? uptime7d) * 100);
    const speed = Math.max(0, Math.min(100, 100 - (p95 - 300) / 25));
    composite = Math.round(connection * 0.4 + stability * 0.3 + speed * 0.3);
  }

  const day24 = within(1);
  const spark = hourlyUptime(day24, 12);

  let status: MonitorStatus = "unknown";
  if (last) {
    if (last.ok) status = uptime7d !== null && uptime7d < 0.98 ? "degraded" : "ok";
    else if (now - new Date(last.at).getTime() > 3 * 60 * 60 * 1000) status = "paused";
    else status = "down";
  }

  return {
    status,
    uptime7d,
    uptime30d,
    p95,
    median,
    composite,
    lastAt: last?.at ?? null,
    lastOkAt: lastOk?.at ?? null,
    samples24h: day24.length,
    spark,
  };
}

/** Uptime per bucket, oldest first, as percentages 0..100. */
function hourlyUptime(probes: Probe[], buckets: number) {
  if (probes.length === 0) return [];
  const now = Date.now();
  const span = 24 * 60 * 60 * 1000;
  const size = span / buckets;
  const result: number[] = [];
  for (let i = 0; i < buckets; i += 1) {
    const start = now - span + i * size;
    const end = start + size;
    const slice = probes.filter((p) => {
      const t = new Date(p.at).getTime();
      return t >= start && t < end;
    });
    if (slice.length === 0) {
      result.push(-1);
      continue;
    }
    result.push((slice.filter((p) => p.ok).length / slice.length) * 100);
  }
  return result;
}

export function statusLabelKey(status: MonitorStatus) {
  switch (status) {
    case "ok":
      return "ok";
    case "degraded":
      return "degraded";
    case "down":
      return "down";
    case "paused":
      return "paused";
    default:
      return "unknown";
  }
}
