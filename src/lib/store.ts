import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";
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

async function readCollection<T>(collection: Collection): Promise<T[]> {
  try {
    const raw = await fs.readFile(/*turbopackIgnore: true*/ filePath(collection), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

/**
 * Serialises every write so concurrent admin/server-action calls cannot
 * interleave and truncate a JSON file.
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

async function writeCollection<T>(collection: Collection, items: T[]) {
  return enqueue(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const target = filePath(collection);
    const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, `${JSON.stringify(items, null, 2)}\n`, "utf8");
    await fs.rename(tmp, target);
  });
}

export const getDb = cache(async (): Promise<Database> => {
  const [vendors, models, providers, prices, submissions] = await Promise.all([
    readCollection<Vendor>("vendors"),
    readCollection<Model>("models"),
    readCollection<Provider>("providers"),
    readCollection<PriceQuote>("prices"),
    readCollection<Submission>("submissions"),
  ]);
  return { vendors, models, providers, prices, submissions };
});

/* ------------------------------------------------------------------ reads */

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

/* ----------------------------------------------------------------- writes */

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

export async function upsertProvider(input: Omit<Provider, "createdAt" | "updatedAt">) {
  const providers = await readCollection<Provider>("providers");
  const index = providers.findIndex((p) => p.slug === input.slug);
  if (index >= 0) {
    providers[index] = { ...providers[index], ...input, updatedAt: now() };
  } else {
    providers.push({ ...input, createdAt: now(), updatedAt: now() });
  }
  await writeCollection("providers", providers);
  return input.slug;
}

export async function deleteProvider(slug: string) {
  const [providers, prices] = await Promise.all([
    readCollection<Provider>("providers"),
    readCollection<PriceQuote>("prices"),
  ]);
  await writeCollection(
    "providers",
    providers.filter((p) => p.slug !== slug),
  );
  await writeCollection(
    "prices",
    prices.filter((q) => q.providerSlug !== slug),
  );
}

export async function upsertQuote(quote: PriceQuote) {
  const prices = await readCollection<PriceQuote>("prices");
  const index = prices.findIndex(
    (q) => q.providerSlug === quote.providerSlug && q.modelSlug === quote.modelSlug,
  );
  if (index >= 0) prices[index] = { ...prices[index], ...quote };
  else prices.push(quote);
  await writeCollection("prices", prices);
}

export async function deleteQuote(providerSlug: string, modelSlug: string) {
  const prices = await readCollection<PriceQuote>("prices");
  await writeCollection(
    "prices",
    prices.filter((q) => !(q.providerSlug === providerSlug && q.modelSlug === modelSlug)),
  );
}

export async function addSubmission(
  input: Omit<Submission, "id" | "status" | "createdAt">,
) {
  const submissions = await readCollection<Submission>("submissions");
  const submission: Submission = {
    ...input,
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    status: "new",
    createdAt: now(),
  };
  submissions.unshift(submission);
  await writeCollection("submissions", submissions);
  return submission.id;
}

export async function setSubmissionStatus(id: string, status: Submission["status"]) {
  const submissions = await readCollection<Submission>("submissions");
  const next = submissions.map((s) => (s.id === id ? { ...s, status } : s));
  await writeCollection("submissions", next);
}

/* ----------------------------------------------------------- click logging */

export async function logClick(event: Omit<ClickEvent, "at">) {
  return enqueue(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const line = `${JSON.stringify({ ...event, at: now() })}\n`;
    await fs.appendFile(path.join(DATA_DIR, "clicks.jsonl"), line, "utf8");
  });
}

export async function readClicks(limit = 200_000): Promise<ClickEvent[]> {
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
