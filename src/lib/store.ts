import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";
import { getD1, type D1Like } from "./db";
import type {
  ClickEvent,
  Database,
  PriceQuote,
  Provider,
  Submission,
  Vendor,
  Model,
} from "./types";

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), "data");

const FILES = {
  vendors: "vendors.json",
  models: "models.json",
  providers: "providers.json",
  prices: "prices.json",
  submissions: "submissions.json",
} as const;

type Collection = keyof typeof FILES;

function filePath(collection: Collection) {
  return path.join(/*turbopackIgnore: true*/ DATA_DIR, FILES[collection]);
}

async function readFileCollection<T>(collection: Collection): Promise<T[]> {
  try {
    const raw = await fs.readFile(/*turbopackIgnore: true*/ filePath(collection), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeFileCollection<T>(collection: Collection, items: T[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const target = filePath(collection);
  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(items, null, 2)}\n`, "utf8");
  await fs.rename(tmp, target);
  invalidateDbCache();
}

/**
 * Serialises every local write so concurrent admin/server-action calls cannot
 * interleave and truncate a JSON file. D1 handles its own concurrency.
 */
let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/* ------------------------------------------------------------- row mapping */

type Row = Record<string, unknown>;

const parse = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== "string" || value === "") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const nullable = <T>(value: T | null | undefined) => (value === undefined ? null : value);

function rowToVendor(r: Row): Vendor {
  return { slug: String(r.slug), name: String(r.name), brandColor: String(r.brand_color), mark: String(r.mark) };
}

function rowToModel(r: Row): Model {
  return {
    slug: String(r.slug),
    vendor: String(r.vendor),
    name: String(r.name),
    official: parse(r.official, { input: 0, output: 0, sourceUrl: "" }),
    releasedAt: r.released_at ? String(r.released_at) : undefined,
    contextWindow: r.context_window != null ? Number(r.context_window) : undefined,
    status: r.status as Model["status"],
    featured: Boolean(r.featured),
    summaryRu: r.summary_ru ? String(r.summary_ru) : undefined,
    summaryEn: r.summary_en ? String(r.summary_en) : undefined,
  };
}

function rowToProvider(r: Row): Provider {
  return {
    slug: String(r.slug),
    name: String(r.name),
    taglineRu: r.tagline_ru ? String(r.tagline_ru) : undefined,
    taglineEn: r.tagline_en ? String(r.tagline_en) : undefined,
    homepage: r.homepage ? String(r.homepage) : undefined,
    referralUrl: r.referral_url ? String(r.referral_url) : undefined,
    referralParam: r.referral_param ? String(r.referral_param) : undefined,
    features: parse(r.features, {}),
    tags: parse(r.tags, []),
    minTopUp: parse(r.min_top_up, null),
    apiBase: r.api_base ? String(r.api_base) : undefined,
    pricingUrl: r.pricing_url ? String(r.pricing_url) : undefined,
    crawlAdapter: r.crawl_adapter ? (String(r.crawl_adapter) as Provider["crawlAdapter"]) : undefined,
    crawlConfig: parse(r.crawl_config, undefined),
    billingModel: r.billing_model ? String(r.billing_model) as Provider["billingModel"] : undefined,
    plans: parse(r.plans, undefined),
    status: r.status as Provider["status"],
    isDemo: Boolean(r.is_demo),
    contactEmail: r.contact_email ? String(r.contact_email) : undefined,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function rowToQuote(r: Row): PriceQuote {
  return {
    providerSlug: String(r.provider_slug),
    modelSlug: String(r.model_slug),
    input: Number(r.input),
    output: Number(r.output),
    cacheRead: r.cache_read != null ? Number(r.cache_read) : null,
    cacheWrite: r.cache_write != null ? Number(r.cache_write) : null,
    sourceUrl: r.source_url ? String(r.source_url) : undefined,
    observedAt: r.observed_at ? String(r.observed_at) : undefined,
    note: r.note ? String(r.note) : undefined,
  };
}

function rowToSubmission(r: Row): Submission {
  return {
    id: String(r.id),
    name: String(r.name),
    homepage: String(r.homepage),
    referralUrl: r.referral_url ? String(r.referral_url) : undefined,
    contactEmail: String(r.contact_email),
    message: r.message ? String(r.message) : undefined,
    status: r.status as Submission["status"],
    createdAt: String(r.created_at),
  };
}

/* ------------------------------------------------------------------ reads */

async function d1All<T = Row>(db: D1Like, sql: string, ...binds: unknown[]): Promise<T[]> {
  const stmt = db.prepare(sql);
  const result = await (binds.length ? stmt.bind(...binds) : stmt).all<T>();
  return result.results;
}

const DB_TTL_MS = 60_000;
let dbCache: { at: number; value: Database } | null = null;

function invalidateDbCache() {
  dbCache = null;
}

export const getDb = cache(async (): Promise<Database> => {
  // Isolate-level TTL cache: D1 free tier is metered by rows read, and every
  // ISR revalidation would otherwise re-fetch all five collections.
  const now = Date.now();
  if (dbCache && now - dbCache.at < DB_TTL_MS) return dbCache.value;
  const db = await getD1();
  let value: Database;
  if (db) {
    const [vendors, models, providers, prices, submissions] = await Promise.all([
      d1All(db, "SELECT * FROM vendors ORDER BY name"),
      d1All(db, "SELECT * FROM models"),
      d1All(db, "SELECT * FROM providers"),
      d1All(db, "SELECT * FROM prices"),
      d1All(db, "SELECT * FROM submissions ORDER BY created_at DESC"),
    ]);
    value = {
      vendors: vendors.map(rowToVendor),
      models: models.map(rowToModel),
      providers: providers.map(rowToProvider),
      prices: prices.map(rowToQuote),
      submissions: submissions.map(rowToSubmission),
    };
  } else {
    const [vendors, models, providers, prices, submissions] = await Promise.all([
      readFileCollection<Vendor>("vendors"),
      readFileCollection<Model>("models"),
      readFileCollection<Provider>("providers"),
      readFileCollection<PriceQuote>("prices"),
      readFileCollection<Submission>("submissions"),
    ]);
    value = { vendors, models, providers, prices, submissions };
  }
  dbCache = { at: now, value };
  return value;
});

/* ----------------------------------------------------------------- helpers */

export async function getActiveProviders() {
  const db = await getDb();
  return db.providers.filter((p) => p.status === "active");
}

export async function getProvider(slug: string) {
  const db = await getDb();
  return db.providers.find((p) => p.slug === slug) ?? null;
}

export async function getQuotesForModel(modelSlug: string) {
  const db = await getDb();
  return db.prices.filter((q) => q.modelSlug === modelSlug);
}

function now() {
  return new Date().toISOString();
}

export function slugify(input: string) {
  return input
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function readProvidersRaw(): Promise<Provider[]> {
  const db = await getD1();
  if (db) return (await d1All(db, "SELECT * FROM providers")).map(rowToProvider);
  return readFileCollection<Provider>("providers");
}

async function readPricesRaw(): Promise<PriceQuote[]> {
  const db = await getD1();
  if (db) return (await d1All(db, "SELECT * FROM prices")).map(rowToQuote);
  return readFileCollection<PriceQuote>("prices");
}

async function readSubmissionsRaw(): Promise<Submission[]> {
  const db = await getD1();
  if (db) return (await d1All(db, "SELECT * FROM submissions ORDER BY created_at DESC")).map(rowToSubmission);
  return readFileCollection<Submission>("submissions");
}

/* ----------------------------------------------------------------- writes */

export async function upsertProvider(input: Omit<Provider, "createdAt" | "updatedAt">) {
  return enqueue(async () => {
    const db = await getD1();
    const existing = (await readProvidersRaw()).find((p) => p.slug === input.slug);
    const stamp = now();
    const merged: Provider = existing
      ? { ...existing, ...input, updatedAt: stamp }
      : { ...input, createdAt: stamp, updatedAt: stamp };

    if (db) {
      await db
        .prepare(
          `INSERT INTO providers (slug, name, tagline_ru, tagline_en, homepage, referral_url, referral_param,
             features, tags, min_top_up, api_base, pricing_url, crawl_adapter, crawl_config,
             billing_model, plans, status, is_demo, contact_email, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(slug) DO UPDATE SET
             name = excluded.name, tagline_ru = excluded.tagline_ru, tagline_en = excluded.tagline_en,
             homepage = excluded.homepage, referral_url = excluded.referral_url, referral_param = excluded.referral_param,
             features = excluded.features, tags = excluded.tags, min_top_up = excluded.min_top_up,
             api_base = excluded.api_base, pricing_url = excluded.pricing_url, crawl_adapter = excluded.crawl_adapter,
             crawl_config = excluded.crawl_config, billing_model = excluded.billing_model, plans = excluded.plans,
             status = excluded.status, is_demo = excluded.is_demo,
             contact_email = excluded.contact_email, updated_at = excluded.updated_at`,
        )
        .bind(
          merged.slug,
          merged.name,
          nullable(merged.taglineRu),
          nullable(merged.taglineEn),
          nullable(merged.homepage),
          nullable(merged.referralUrl),
          nullable(merged.referralParam),
          JSON.stringify(merged.features ?? {}),
          JSON.stringify(merged.tags ?? []),
          merged.minTopUp == null ? null : JSON.stringify(merged.minTopUp),
          nullable(merged.apiBase),
          nullable(merged.pricingUrl),
          nullable(merged.crawlAdapter),
          merged.crawlConfig == null ? null : JSON.stringify(merged.crawlConfig),
          nullable(merged.billingModel),
          merged.plans == null ? null : JSON.stringify(merged.plans),
          merged.status,
          merged.isDemo ? 1 : 0,
          nullable(merged.contactEmail),
          merged.createdAt,
          merged.updatedAt,
        )
        .run();
      invalidateDbCache();
      return input.slug;
    }

    const providers = await readFileCollection<Provider>("providers");
    const index = providers.findIndex((p) => p.slug === input.slug);
    if (index >= 0) providers[index] = merged;
    else providers.push(merged);
    await writeFileCollection("providers", providers);
    return input.slug;
  });
}

export async function deleteProvider(slug: string) {
  return enqueue(async () => {
    const db = await getD1();
    if (db) {
      await db.batch([
        db.prepare("DELETE FROM providers WHERE slug = ?").bind(slug),
        db.prepare("DELETE FROM prices WHERE provider_slug = ?").bind(slug),
      ]);
      invalidateDbCache();
      return;
    }
    const [providers, prices] = await Promise.all([
      readFileCollection<Provider>("providers"),
      readFileCollection<PriceQuote>("prices"),
    ]);
    await writeFileCollection(
      "providers",
      providers.filter((p) => p.slug !== slug),
    );
    await writeFileCollection(
      "prices",
      prices.filter((q) => q.providerSlug !== slug),
    );
  });
}

export async function upsertQuote(quote: PriceQuote) {
  return enqueue(async () => {
    const db = await getD1();
    if (db) {
      await db
        .prepare(
          `INSERT INTO prices (provider_slug, model_slug, input, output, cache_read, cache_write, source_url, observed_at, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(provider_slug, model_slug) DO UPDATE SET
             input = excluded.input, output = excluded.output, cache_read = excluded.cache_read,
             cache_write = excluded.cache_write, source_url = excluded.source_url,
             observed_at = excluded.observed_at, note = excluded.note`,
        )
        .bind(
          quote.providerSlug,
          quote.modelSlug,
          quote.input,
          quote.output,
          nullable(quote.cacheRead),
          nullable(quote.cacheWrite),
          nullable(quote.sourceUrl),
          nullable(quote.observedAt),
          nullable(quote.note),
        )
        .run();
      invalidateDbCache();
      return;
    }
    const prices = await readFileCollection<PriceQuote>("prices");
    const index = prices.findIndex(
      (q) => q.providerSlug === quote.providerSlug && q.modelSlug === quote.modelSlug,
    );
    if (index >= 0) prices[index] = { ...prices[index], ...quote };
    else prices.push(quote);
    await writeFileCollection("prices", prices);
  });
}

export async function deleteQuote(providerSlug: string, modelSlug: string) {
  return enqueue(async () => {
    const db = await getD1();
    if (db) {
      await db
        .prepare("DELETE FROM prices WHERE provider_slug = ? AND model_slug = ?")
        .bind(providerSlug, modelSlug)
        .run();
      invalidateDbCache();
      return;
    }
    const prices = await readFileCollection<PriceQuote>("prices");
    await writeFileCollection(
      "prices",
      prices.filter((q) => !(q.providerSlug === providerSlug && q.modelSlug === modelSlug)),
    );
  });
}

export async function addSubmission(
  input: Omit<Submission, "id" | "status" | "createdAt">,
) {
  return enqueue(async () => {
    const submission: Submission = {
      ...input,
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      status: "new",
      createdAt: now(),
    };
    const db = await getD1();
    if (db) {
      await db
        .prepare(
          `INSERT INTO submissions (id, name, homepage, referral_url, contact_email, message, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          submission.id,
          submission.name,
          submission.homepage,
          nullable(submission.referralUrl),
          submission.contactEmail,
          nullable(submission.message),
          submission.status,
          submission.createdAt,
        )
        .run();
      invalidateDbCache();
      return submission.id;
    }
    const submissions = await readFileCollection<Submission>("submissions");
    submissions.unshift(submission);
    await writeFileCollection("submissions", submissions);
    return submission.id;
  });
}

export async function setSubmissionStatus(id: string, status: Submission["status"]) {
  return enqueue(async () => {
    const db = await getD1();
    if (db) {
      await db.prepare("UPDATE submissions SET status = ? WHERE id = ?").bind(status, id).run();
      invalidateDbCache();
      return;
    }
    const submissions = await readSubmissionsRaw();
    const next = submissions.map((s) => (s.id === id ? { ...s, status } : s));
    await writeFileCollection("submissions", next);
  });
}

/* ----------------------------------------------------------- click logging */

export async function logClick(event: Omit<ClickEvent, "at">) {
  return enqueue(async () => {
    const at = now();
    const db = await getD1();
    if (db) {
      await db
        .prepare("INSERT INTO clicks (slug, at, ref, country, ua) VALUES (?, ?, ?, ?, ?)")
        .bind(event.slug, at, nullable(event.ref), nullable(event.country), nullable(event.ua))
        .run();
      return;
    }
    await fs.mkdir(DATA_DIR, { recursive: true });
    const line = `${JSON.stringify({ ...event, at })}\n`;
    await fs.appendFile(path.join(DATA_DIR, "clicks.jsonl"), line, "utf8");
  });
}

export async function readClicks(limit = 200_000): Promise<ClickEvent[]> {
  const db = await getD1();
  if (db) {
    const rows = await d1All(db, "SELECT slug, at, ref, country, ua FROM clicks ORDER BY at DESC LIMIT ?", limit);
    return rows
      .map((r) => ({
        slug: String(r.slug),
        at: String(r.at),
        ref: r.ref ? String(r.ref) : undefined,
        country: r.country ? String(r.country) : undefined,
        ua: r.ua ? String(r.ua) : undefined,
      }))
      .reverse();
  }
  try {
    const raw = await fs.readFile(/*turbopackIgnore: true*/ path.join(DATA_DIR, "clicks.jsonl"), "utf8");
    const lines = raw.split("\n").filter(Boolean);
    return lines.slice(-limit).map((line) => JSON.parse(line) as ClickEvent);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function getClickStats(days = 30) {
  const clicks = await readClicks();
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const totals = new Map<string, { total: number; recent: number; last: string }>();
  for (const click of clicks) {
    const entry = totals.get(click.slug) ?? { total: 0, recent: 0, last: click.at };
    entry.total += 1;
    if (new Date(click.at).getTime() >= since) entry.recent += 1;
    if (click.at > entry.last) entry.last = click.at;
    totals.set(click.slug, entry);
  }
  return totals;
}
