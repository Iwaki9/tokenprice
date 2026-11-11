/**
 * Price + health crawler.
 *
 *   npx tsx crawler/index.ts prices                 # read every provider source
 *   npx tsx crawler/index.ts prices --dry --verbose # show matches, write nothing
 *   npx tsx crawler/index.ts prices --only deepinfra
 *   npx tsx crawler/index.ts health                 # probe every provider apiBase
 *   npx tsx crawler/index.ts inspect <url|slug>     # explain what a source looks like
 *
 * Providers declare their sources in data/providers.json:
 *   pricingUrl     JSON endpoint or pricing page
 *   crawlAdapter   "auto" (default) | preset name | "json" | "json-ld" | "html-table"
 *   crawlConfig    paths/unit/currency/aliases for sites with their own shape
 *   apiBase        OpenAI-compatible base URL used by the health probe
 *
 * Presets (`deepinfra`, `novita`, `chutes`, `sambanova`, `openrouter`, `together`)
 * pin the exact schema of providers whose public API we read directly. For any
 * other site the generic `json` adapter walks the payload looking for input/output
 * price fields and normalises whatever scale it finds to USD per 1M tokens.
 *
 * API keys for the probe are read from env: TR_KEY_<SLUG> (uppercase, dashes
 * become underscores). Without a key the probe still records reachability.
 */
import { promises as fs } from "node:fs";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import type {
  CrawlAdapter,
  CrawlConfig,
  Model,
  PriceQuote,
  PriceUnit,
  Provider,
} from "../src/lib/types";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "data");
const UA =
  "Mozilla/5.0 (compatible; TokenRateBot/1.1; +https://tokenrate.example/bot)";

const args = process.argv.slice(2);
const command = args[0] ?? "prices";
const flag = (name: string) => args.includes(`--${name}`);
const flagValue = (name: string) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

const dry = flag("dry");
const verbose = flag("verbose");
const includeDemo = flag("include-demo");
// --only accepts commas or whitespace (PowerShell's npx.ps1 joins bare comma lists).
const onlySet = flagValue("only")
  ? new Set(
      flagValue("only")!
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    )
  : null;
const matchesOnly = (slug: string) => !onlySet || onlySet.has(slug);

// CBR: CNY 12.3098 RUB and USD 82.7536 RUB в†’ 1 CNY = 12.3098 / 82.7536 USD.
const FX_CNY_USD = Number(process.env.FX_CNY_USD ?? String(12.3098 / 82.7536));
// Defaults are the CBR daily rate (Р¦Р‘ Р Р¤) for the last refresh; override via env.
const FX_RUB_USD = Number(process.env.FX_RUB_USD ?? String(1 / 82.7536));

const FX: Record<string, number> = { USD: 1, CNY: FX_CNY_USD, RUB: FX_RUB_USD };

const UNIT_MULT: Record<PriceUnit, number> = {
  per_token: 1_000_000,
  per_1k: 1_000,
  per_10k: 100,
  per_1m: 1,
};

/* ------------------------------------------------------------------ io --- */

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(path.join(DATA, file), "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, payload: unknown) {
  const tmp = path.join(DATA, `${file}.tmp`);
  await fs.writeFile(tmp, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await fs.rename(tmp, path.join(DATA, file));
}

type Fetched = {
  ok: boolean;
  status: number;
  contentType: string;
  body: string;
  bytes: number;
  ms: number;
};

async function fetchSource(url: string, timeoutMs = 25_000): Promise<Fetched> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": UA,
        accept: "application/json,text/html;q=0.9,*/*;q=0.8",
        "accept-encoding": "gzip, deflate, br",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    let body = buffer.toString("utf8");
    // Some hosts ship a gzipped body without asking for it.
    if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
      try {
        body = gunzipSync(buffer).toString("utf8");
      } catch {
        /* keep the raw text */
      }
    }
    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get("content-type") ?? "",
      body,
      bytes: buffer.length,
      ms: Date.now() - started,
    };
  } finally {
    clearTimeout(timer);
  }
}

/* -------------------------------------------------------- model match --- */

/** Packaging noise that does not identify a model. */
const NOISE = new Set([
  "instruct",
  "it",
  "chat",
  "turbo",
  "preview",
  "latest",
  "tee",
  "fp8",
  "fp4",
  "bf16",
  "gguf",
  "awq",
  "gptq",
  "int4",
  "int8",
  "hf",
  "experimental",
]);

function tokenSignature(raw: string): string {
  const tokens = raw
    .toLowerCase()
    .replace(/^[a-z0-9._-]+\//, "") // vendor path prefix: anthropic/claude-вЂ¦
    .replace(/[._]/g, "-")
    .split(/[^a-z0-9]+/)
    .filter((token) => token && !NOISE.has(token))
    .filter((token) => !/^\d{4,8}$/.test(token)) // release dates: 0528, 20250929
    .sort();
  return tokens.join("-");
}

function compactSignature(raw: string) {
  return tokenSignature(raw).replace(/-/g, "");
}

type ModelIndex = {
  bySlug: Map<string, Model>;
  bySignature: Map<string, Model>;
  byCompact: Map<string, Model>;
};

function buildIndex(models: Model[]): ModelIndex {
  const bySlug = new Map(models.map((model) => [model.slug.toLowerCase(), model]));
  const bySignature = new Map<string, Model>();
  const byCompact = new Map<string, Model>();
  const ambiguous = new Set<string>();

  for (const model of models) {
    for (const alias of [model.slug, model.name]) {
      const signature = tokenSignature(alias);
      if (!signature) continue;
      const existing = bySignature.get(signature);
      if (existing && existing.slug !== model.slug) ambiguous.add(signature);
      else if (!ambiguous.has(signature)) bySignature.set(signature, model);

      const compact = compactSignature(alias);
      const compactExisting = byCompact.get(compact);
      if (compactExisting && compactExisting.slug !== model.slug) ambiguous.add(`#${compact}`);
      else if (!ambiguous.has(`#${compact}`)) byCompact.set(compact, model);
    }
  }
  for (const key of ambiguous) {
    if (key.startsWith("#")) byCompact.delete(key.slice(1));
    else bySignature.delete(key);
  }
  return { bySlug, bySignature, byCompact };
}

function matchModel(sourceId: string, index: ModelIndex, aliases?: Record<string, string>) {
  const raw = sourceId.trim();
  if (!raw) return null;

  const alias = aliases?.[raw] ?? aliases?.[raw.toLowerCase()];
  if (alias) {
    const model = index.bySlug.get(alias.toLowerCase());
    if (model) return model;
  }

  const slug = index.bySlug.get(raw.toLowerCase().replace(/[._]/g, "-"));
  if (slug) return slug;

  return (
    index.bySignature.get(tokenSignature(raw)) ??
    index.byCompact.get(compactSignature(raw)) ??
    null
  );
}

/* ------------------------------------------------------------ pricing --- */

type RawPrice = {
  sourceId: string;
  input: number;
  output: number;
  cacheRead?: number | null;
  cacheWrite?: number | null;
};

type Extraction = {
  rows: RawPrice[];
  adapter: string;
  detail: string;
  unmatched: string[];
};

type Leaf = { path: string; value: number };

export function collectNumbers(node: unknown, prefix = "", out: Leaf[] = [], depth = 0): Leaf[] {
  if (depth > 6 || node === null || node === undefined) return out;
  if (typeof node === "number") {
    if (Number.isFinite(node)) out.push({ path: prefix, value: node });
    return out;
  }
  if (typeof node === "string") {
    const value = Number(node.trim());
    if (node.trim() !== "" && Number.isFinite(value)) out.push({ path: prefix, value });
    return out;
  }
  if (Array.isArray(node)) {
    node.slice(0, 24).forEach((item, index) =>
      collectNumbers(item, `${prefix}[${index}]`, out, depth + 1),
    );
    return out;
  }
  if (typeof node === "object") {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      collectNumbers(value, prefix ? `${prefix}.${key}` : key, out, depth + 1);
    }
  }
  return out;
}

const INPUT_KEY = /(^|\.)(input|prompt)\w*(\.|$)/i;
const OUTPUT_KEY = /(^|\.)(output|completion)\w*(\.|$)/i;
const CACHE_READ_KEY = /(^|\.)(cache_read|cacheRead|input_cache_read)\w*(\.|$)/i;
const CACHE_WRITE_KEY = /(^|\.)(cache_write|cacheWrite|input_cache_write)\w*(\.|$)/i;
const IGNORED_KEY =
  /(origin_|max_|min_|context|length|modalities|cache_write|cacheWrite|discount|created|per_image|per_second)/i;

function unitFromPath(keyPath: string): PriceUnit | null {
  if (/per_?10k/i.test(keyPath)) return "per_10k";
  if (/per_?(1m|m|million)(\.|$|_)/i.test(keyPath)) return "per_1m";
  if (/per_?(1k|1000|thousand)/i.test(keyPath)) return "per_1k";
  if (/per_token|token_price$/i.test(keyPath)) return "per_token";
  return null;
}

/** USD per 1M tokens is "plausible" in this window; used to pick a scale. */
function plausible(usdPerMillion: number) {
  return usdPerMillion >= 0.0005 && usdPerMillion <= 2_000;
}

/**
 * Picks the best numeric leaf for a price role. Preference:
 *   1. a value that lands in a believable USD/1M range,
 *   2. a path that says "decimal" or "price_per_m" (human-readable field),
 *   3. a shorter path.
 */
type ScoredLeaf = { value: number; path: string; unit: PriceUnit; score: number };

export function chooseLeaf(
  leaves: Leaf[],
  matcher: RegExp,
  fallbackUnit?: PriceUnit,
): ScoredLeaf | null {
  const usable = leaves.filter(
    (leaf) => matcher.test(leaf.path) && !IGNORED_KEY.test(leaf.path) && leaf.value > 0,
  );
  // Human-readable fields ("0.13") beat integer micro-units ("1300") when both exist.
  const decimal = usable.filter((leaf) => /decimal/i.test(leaf.path));
  const pool = decimal.length ? decimal : usable;

  const candidates: ScoredLeaf[] = [];
  for (const leaf of pool) {
    const hinted = unitFromPath(leaf.path) ?? fallbackUnit;
    const units = hinted
      ? [hinted]
      : (["per_1m", "per_token", "per_1k", "per_10k"] as PriceUnit[]);

    let best: ScoredLeaf | null = null;
    for (const unit of units) {
      const scaled = leaf.value * UNIT_MULT[unit];
      const score =
        (plausible(scaled) ? 0 : 1000) +
        (hinted && hinted === unit ? 0 : 5) +
        leaf.path.split(".").length * 0.01;
      if (!best || score < best.score) {
        best = { value: scaled, path: leaf.path, unit, score };
      }
    }
    if (best) candidates.push(best);
  }

  candidates.sort((a, b) => a.score - b.score);
  return candidates[0] ?? null;
}

/** Last-resort scale fix: a "per 1M" number in the thousands is a wrong unit. */
function normalizeScale(value: number) {
  if (plausible(value)) return value;
  for (const divisor of [10, 100, 1_000, 10_000]) {
    if (plausible(value / divisor)) return value / divisor;
  }
  return value;
}

function pick(obj: unknown, dotted: string): unknown {
  return dotted.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function findList(parsed: unknown, listPath?: string): unknown[] {
  if (listPath) {
    const picked = pick(parsed, listPath);
    if (Array.isArray(picked)) return picked;
  }
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;
    for (const key of ["data", "models", "results", "items", "model_list"]) {
      if (Array.isArray(record[key])) return record[key] as unknown[];
    }
    // Deeply nested payloads: first array of objects wins.
    for (const value of Object.values(record)) {
      if (Array.isArray(value) && value.length && typeof value[0] === "object") {
        return value;
      }
    }
  }
  return [];
}

function extractJson(
  body: string,
  models: ModelIndex,
  config: CrawlConfig,
  adapterName: string,
): Extraction {
  const parsed = JSON.parse(body) as unknown;
  const list = findList(parsed, config.listPath);
  const unmatched: string[] = [];
  const units = new Set<PriceUnit>();
  const byModel = new Map<string, RawPrice>();

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const sourceId = String(
      (config.idPath ? pick(record, config.idPath) : undefined) ??
        record.id ??
        record.name ??
        record.model ??
        record.model_id ??
        "",
    );
    if (!sourceId) continue;

    // Skip image/embedding/audio endpoints: they are priced per call or per
    // second, not per token, and never belong on a token-price board.
    const kind = typeof record.type === "string" ? record.type.toLowerCase() : "";
    if (["image", "video", "embedding", "stt", "tts", "asr", "rerank"].includes(kind)) continue;

    const model = matchModel(sourceId, models, config.modelAliases);
    if (!model) {
      unmatched.push(sourceId);
      continue;
    }

    const leaves = collectNumbers(record);
    const inputLeaf = config.inputPath
      ? { value: Number(pick(record, config.inputPath)), path: config.inputPath, unit: config.unit ?? "per_1m" }
      : chooseLeaf(leaves, INPUT_KEY, config.unit);
    const outputLeaf = config.outputPath
      ? { value: Number(pick(record, config.outputPath)), path: config.outputPath, unit: config.unit ?? "per_1m" }
      : chooseLeaf(leaves, OUTPUT_KEY, config.unit);

    if (!inputLeaf || !outputLeaf) continue;
    if (!Number.isFinite(inputLeaf.value) || !Number.isFinite(outputLeaf.value)) continue;

    const fx = FX[config.currency ?? "USD"] ?? 1;
    // Convert to USD first, then fix the scale: RUB/CNY values are 10вЂ“100Г—
    // larger before conversion and would otherwise look like a wrong unit.
    const input = normalizeScale(inputLeaf.value * UNIT_MULT[inputLeaf.unit] * fx);
    const output = normalizeScale(outputLeaf.value * UNIT_MULT[outputLeaf.unit] * fx);
    if (!(input > 0) || !(output > 0)) continue;

    let cacheRead: number | null = null;
    if (config.cacheReadPath) {
      const raw = Number(pick(record, config.cacheReadPath));
      if (Number.isFinite(raw) && raw > 0) {
        cacheRead = normalizeScale(raw * UNIT_MULT[config.unit ?? "per_1m"] * fx);
      }
    } else {
      const leaf = chooseLeaf(leaves, CACHE_READ_KEY, config.unit);
      if (leaf) cacheRead = normalizeScale(leaf.value * UNIT_MULT[leaf.unit] * fx);
    }
    if (cacheRead !== null && !(cacheRead > 0)) cacheRead = null;

    units.add(inputLeaf.unit);
    units.add(outputLeaf.unit);

    // Several source rows can describe the same catalogue model (turbo / dated
    // snapshots). Keep the cheapest, so the board shows the best real offer.
    const previous = byModel.get(model.slug);
    if (!previous || input + output < previous.input + previous.output) {
      byModel.set(model.slug, { sourceId, input, output, cacheRead });
    }
  }

  return {
    rows: [...byModel.values()],
    adapter: adapterName,
    detail: `list ${list.length} rows В· units ${[...units].join("/") || "вЂ”"}`,
    unmatched,
  };
}

function extractJsonLd(body: string, models: ModelIndex, config: CrawlConfig): Extraction {
  const blocks = [
    ...body.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];
  const rows: RawPrice[] = [];
  const unmatched: string[] = [];

  for (const block of blocks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(block[1]);
    } catch {
      continue;
    }
    const queue: unknown[] = [parsed];
    while (queue.length) {
      const node = queue.shift();
      if (!node || typeof node !== "object") continue;
      const record = node as Record<string, unknown>;
      const name = typeof record.name === "string" ? record.name : "";
      const offers = record.offers;
      if (name && offers) {
        const model = matchModel(name, models, config.modelAliases);
        const offerList = Array.isArray(offers) ? offers : [offers];
        const amount = offerList
          .map((offer) => Number((offer as Record<string, unknown>)?.price ?? NaN))
          .find((value) => Number.isFinite(value) && value > 0);
        if (model && amount) {
          rows.push({ sourceId: name, input: amount, output: amount });
        } else if (!model && amount) {
          unmatched.push(name);
        }
      }
      queue.push(...Object.values(record));
    }
  }

  return {
    rows,
    adapter: "json-ld",
    detail: `${blocks.length} ld+json blocks`,
    unmatched,
  };
}

function decodeEntities(text: string) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&[a-z]+;/gi, " ");
}

function cellTexts(html: string) {
  return [...html.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((match) =>
    decodeEntities(match[1].replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim(),
  );
}

/** Pulls every price-looking number out of one cell ("$1.20 / $3.50" в†’ [1.2, 3.5]). */
function cellNumbers(cell: string) {
  return [...cell.matchAll(/(?:\$|usd\s*)?(\d+(?:[.,]\d+)?)/gi)]
    .map((match) => Number(match[1].replace(",", ".")))
    .filter((value) => Number.isFinite(value));
}

function extractHtmlTable(body: string, models: ModelIndex, config: CrawlConfig): Extraction {
  const tables = body.match(/<table[\s\S]*?<\/table>/gi) ?? [];
  const blocks = tables.length ? tables : [body];
  const rows: RawPrice[] = [];
  const unmatched: string[] = [];
  let skippedTables = 0;
  let seenRows = 0;

  for (const table of blocks) {
    const headerRow = table.match(/<tr[\s\S]*?<\/tr>/i);
    const header = headerRow ? cellTexts(headerRow[0]).join(" ").toLowerCase() : "";
    // Pricing pages mix serverless, fine-tuning, batch and GPU tables.
    if (/fine-?tun|training|gpu|per hour|per image|batch/.test(header)) {
      skippedTables += 1;
      continue;
    }

    const tableRows = table.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
    seenRows += tableRows.length;

    for (const row of tableRows) {
      const cells = cellTexts(row);
      if (cells.length < 2) continue;

      let model: Model | null = null;
      let nameIndex = -1;
      for (let index = 0; index < cells.length; index += 1) {
        const cell = cells[index];
        if (cell.length > 90) continue;
        const candidate = matchModel(cell, models, config.modelAliases);
        if (candidate) {
          model = candidate;
          nameIndex = index;
          break;
        }
      }
      if (!model) {
        if (/[a-zA-Z]{3}/.test(cells[0]) && /\d/.test(cells[0])) unmatched.push(cells[0]);
        continue;
      }

      // One column holds "input, cached input"; the next holds output.
      const valueCells = cells.slice(nameIndex + 1);
      const columns = valueCells.map((cell) => cellNumbers(cell));
      const inputNumbers = columns[0] ?? [];
      const outputNumbers = columns[1] ?? [];
      const input = inputNumbers[0];
      const output = outputNumbers[0] ?? inputNumbers[1];
      if (!Number.isFinite(input) || !Number.isFinite(output)) continue;

      const joined = cells.join(" ");
      const cny = /ВҐ|cny|е…ѓ|rmb/i.test(joined);
      const fx = cny ? FX_CNY_USD : (FX[config.currency ?? "USD"] ?? 1);
      const tiny = Math.max(input, output) < 0.01;
      const scale = tiny ? 1_000_000 : 1;
      const cacheRead = inputNumbers[1];

      rows.push({
        sourceId: cells[nameIndex],
        input: input * scale * fx,
        output: output * scale * fx,
        cacheRead:
          cacheRead !== undefined && cacheRead > 0 ? cacheRead * scale * fx : null,
      });
    }
  }

  return {
    rows,
    adapter: "html-table",
    detail: `${blocks.length} tables, ${seenRows} <tr> rows${skippedTables ? `, ${skippedTables} skipped` : ""}`,
    unmatched,
  };
}

/* -------------------------------------------------------- presets ------ */

const PRESETS: Record<string, { adapter: string; config: CrawlConfig }> = {
  deepinfra: {
    adapter: "json",
    config: {
      listPath: "data",
      inputPath: "metadata.pricing.input_tokens",
      outputPath: "metadata.pricing.output_tokens",
      cacheReadPath: "metadata.pricing.cache_read_tokens",
      unit: "per_1m",
    },
  },
  novita: {
    adapter: "json",
    config: {
      listPath: "data",
      inputPath: "pricing.prompt.price_per_m_decimal",
      outputPath: "pricing.completion.price_per_m_decimal",
      cacheReadPath: "pricing.input_cache_read.price_per_m_decimal",
      unit: "per_1m",
    },
  },
  chutes: {
    adapter: "json",
    config: {
      listPath: "data",
      inputPath: "price.input.usd",
      outputPath: "price.output.usd",
      cacheReadPath: "price.input_cache_read.usd",
      unit: "per_1m",
    },
  },
  sambanova: {
    adapter: "json",
    config: {
      listPath: "data",
      inputPath: "pricing.prompt",
      outputPath: "pricing.completion",
      cacheReadPath: "pricing.input_cache_read",
      unit: "per_token",
    },
  },
  openrouter: {
    adapter: "json",
    config: {
      listPath: "data",
      inputPath: "pricing.prompt",
      outputPath: "pricing.completion",
      unit: "per_token",
    },
  },
  polza: {
    adapter: "json",
    config: {
      listPath: "data",
      inputPath: "top_provider.pricing.prompt_per_million",
      outputPath: "top_provider.pricing.completion_per_million",
      cacheReadPath: "top_provider.pricing.input_cache_read_per_million",
      unit: "per_1m",
      currency: "RUB",
    },
  },
  together: {
    adapter: "html-table",
    config: { currency: "USD" },
  },
};

function resolveAdapter(provider: Provider, fetched: Fetched): { adapter: string; config: CrawlConfig } {
  const declared: CrawlAdapter = provider.crawlAdapter ?? "auto";
  const config: CrawlConfig = { ...(provider.crawlConfig ?? {}) };

  if (declared !== "auto" && PRESETS[declared]) {
    return { adapter: PRESETS[declared].adapter, config: { ...PRESETS[declared].config, ...config } };
  }
  if (declared !== "auto") return { adapter: declared, config };

  // auto: sniff the payload
  const looksJson =
    fetched.body.trimStart().startsWith("{") || fetched.body.trimStart().startsWith("[");
  if (looksJson) return { adapter: "json", config };
  if (/application\/ld\+json/.test(fetched.body)) {
    // JSON-LD is embedded in HTML; prefer a table when one is present.
    if ((fetched.body.match(/<tr[\s>]/gi) ?? []).length > 3) {
      return { adapter: "html-table", config };
    }
    return { adapter: "json-ld", config };
  }
  return { adapter: "html-table", config };
}

function runExtraction(
  adapter: string,
  body: string,
  models: ModelIndex,
  config: CrawlConfig,
): Extraction {
  if (adapter === "json") return extractJson(body, models, config, "json");
  if (adapter === "json-ld") return extractJsonLd(body, models, config);
  return extractHtmlTable(body, models, config);
}

/* --------------------------------------------------------- commands ---- */

function short(value: number) {
  return `$${value < 0.01 ? value.toPrecision(3) : value.toFixed(value < 10 ? 3 : 2)}`;
}

async function crawlPrices() {
  const providers = await readJson<Provider[]>("providers.json", []);
  const models = await readJson<Model[]>("models.json", []);
  const prices = await readJson<PriceQuote[]>("prices.json", []);
  const index = buildIndex(models);
  const today = new Date().toISOString().slice(0, 10);

  let updated = 0;
  const report: string[] = [];

  for (const provider of providers) {
    if (!matchesOnly(provider.slug)) continue;
    if (provider.isDemo && !includeDemo) continue;
    if (!provider.pricingUrl) continue;

    try {
      const fetched = await fetchSource(provider.pricingUrl);
      if (!fetched.ok) {
        report.push(`${provider.slug}: HTTP ${fetched.status} вЂ” skipped (${fetched.contentType.split(";")[0]})`);
        continue;
      }
      const { adapter, config } = resolveAdapter(provider, fetched);
      const extraction = runExtraction(adapter, fetched.body, index, config);
      const header = `${provider.slug}: ${extraction.rows.length} quotes via ${adapter} (${extraction.detail}, ${fetched.ms}ms)`;

      if (!extraction.rows.length) {
        report.push(`${header} вЂ” nothing recognised at ${provider.pricingUrl}`);
        if (extraction.unmatched.length) {
          report.push(`  seen but unmatched: ${extraction.unmatched.slice(0, 8).join(", ")}`);
        }
        continue;
      }

      for (const quote of extraction.rows) {
        const model = matchModel(quote.sourceId, index, config.modelAliases);
        if (!model) continue;
        const next: PriceQuote = {
          providerSlug: provider.slug,
          modelSlug: model.slug,
          input: Number(quote.input.toFixed(4)),
          output: Number(quote.output.toFixed(4)),
          cacheRead: quote.cacheRead ? Number(quote.cacheRead.toFixed(4)) : null,
          cacheWrite: null,
          sourceUrl: provider.pricingUrl,
          observedAt: today,
          note: `crawler:${adapter}`,
        };
        const existing = prices.findIndex(
          (item) => item.providerSlug === provider.slug && item.modelSlug === model.slug,
        );
        if (existing >= 0) prices[existing] = { ...prices[existing], ...next };
        else prices.push(next);
        updated += 1;
        if (verbose) {
          report.push(
            `  вњ“ ${quote.sourceId} в†’ ${model.slug}  ${short(next.input)} / ${short(next.output)} per 1M`,
          );
        }
      }

      report.push(header);
      if (extraction.unmatched.length) {
        const shown = extraction.unmatched.slice(0, 6).join(", ");
        report.push(
          `  ${extraction.unmatched.length} source models not in the catalogue: ${shown}${
            extraction.unmatched.length > 6 ? ", вЂ¦" : ""
          }`,
        );
      }
    } catch (error) {
      report.push(`${provider.slug}: ${(error as Error).message}`);
    }
  }

  console.log(report.join("\n") || "nothing to crawl");
  if (dry) {
    console.log(`\n--dry: ${updated} quotes would be written`);
    return;
  }
  if (updated > 0) await writeJson("prices.json", prices);
  console.log(`\n${updated} quotes written to data/prices.json`);
}

async function crawlHealth() {
  const providers = await readJson<Provider[]>("providers.json", []);
  const lines: string[] = [];
  const rows: string[] = [];

  for (const provider of providers) {
    if (!matchesOnly(provider.slug)) continue;
    if (provider.isDemo && !includeDemo) continue;
    if (!provider.apiBase) continue;

    const key = process.env[`TR_KEY_${provider.slug.toUpperCase().replace(/-/g, "_")}`] ?? "";
    const base = provider.apiBase.replace(/\/+$/, "");
    // apiBase is the full prefix (e.g. https://host/v1 or https://host/v1/openai);
    // only add /v1 when the base carries no version segment at all.
    const endpoint = `${base}${/\/v\d+(\/|$)/.test(base) ? "" : "/v1"}/models`;
    const started = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      const response = await fetch(endpoint, {
        headers: {
          "user-agent": UA,
          ...(key ? { authorization: `Bearer ${key}` } : {}),
        },
        signal: controller.signal,
        redirect: "manual",
      });
      clearTimeout(timer);
      const latencyMs = Date.now() - started;
      // Any HTTP answer below 500 proves the endpoint is reachable.
      const ok = response.status < 500;
      lines.push(
        JSON.stringify({
          providerSlug: provider.slug,
          at: new Date().toISOString(),
          ok,
          status: response.status,
          latencyMs,
          ...(ok ? {} : { error: `http_${response.status}` }),
        }),
      );
      rows.push(`${provider.slug}\t${response.status}\t${latencyMs}ms`);
    } catch (error) {
      const latencyMs = Date.now() - started;
      lines.push(
        JSON.stringify({
          providerSlug: provider.slug,
          at: new Date().toISOString(),
          ok: false,
          status: null,
          latencyMs,
          error: (error as Error).name === "AbortError" ? "timeout" : "network",
        }),
      );
      rows.push(`${provider.slug}\terror\t${latencyMs}ms`);
    }
  }

  console.log(rows.join("\n") || "no providers with apiBase");
  if (dry) {
    console.log(`\n--dry: ${lines.length} probes not written`);
    return;
  }
  if (lines.length > 0) {
    await fs.appendFile(path.join(DATA, "probes.jsonl"), `${lines.join("\n")}\n`, "utf8");
  }
  console.log(`\n${lines.length} probes appended to data/probes.jsonl`);
}

async function inspect(target: string) {
  const providers = await readJson<Provider[]>("providers.json", []);
  const models = await readJson<Model[]>("models.json", []);
  const index = buildIndex(models);

  const provider = providers.find((item) => item.slug === target);
  const url = provider?.pricingUrl ?? target;
  if (!url) {
    console.log(`no provider "${target}" and not a URL`);
    return;
  }

  console.log(`source: ${url}`);
  if (provider) console.log(`provider: ${provider.slug} (adapter: ${provider.crawlAdapter ?? "auto"})`);

  const fetched = await fetchSource(url);
  console.log(
    `status ${fetched.status} В· ${fetched.contentType.split(";")[0] || "?"} В· ` +
      `${(fetched.bytes / 1024).toFixed(1)} KB В· ${fetched.ms} ms`,
  );
  if (!fetched.ok) {
    console.log(`body head: ${fetched.body.slice(0, 200).replace(/\s+/g, " ")}`);
    return;
  }

  const { adapter, config } = provider
    ? resolveAdapter(provider, fetched)
    : resolveAdapter({ crawlAdapter: "auto" } as Provider, fetched);
  console.log(`adapter: ${adapter}${provider && PRESETS[provider.crawlAdapter ?? ""] ? " (preset)" : ""}`);

  const extraction = runExtraction(adapter, fetched.body, index, config);
  console.log(`detail: ${extraction.detail}`);
  console.log(`matched: ${extraction.rows.length}`);

  for (const row of extraction.rows) {
    const model = matchModel(row.sourceId, index, config.modelAliases);
    console.log(
      `  вњ“ ${row.sourceId} в†’ ${model?.slug ?? "?"}  ${short(row.input)} in / ${short(row.output)} out` +
        (row.cacheRead ? ` / ${short(row.cacheRead)} cache` : ""),
    );
  }

  if (extraction.unmatched.length) {
    console.log(`unmatched (${extraction.unmatched.length}):`);
    for (const name of extraction.unmatched.slice(0, 20)) console.log(`  вњ— ${name}`);
    if (extraction.unmatched.length > 20) console.log(`  вЂ¦ ${extraction.unmatched.length - 20} more`);
  }

  // Nudge toward adding missing models instead of silently dropping quotes.
  const known = new Set(models.map((model) => model.slug));
  const missing = extraction.unmatched.filter((name) => !known.has(name));
  if (missing.length) {
    console.log(
      `\nhint: ${missing.length} source model(s) have no catalogue entry. ` +
        `Add them to data/models.json, or map them in crawlConfig.modelAliases.`,
    );
  }
}

async function main() {
  if (command === "prices") await crawlPrices();
  else if (command === "health") await crawlHealth();
  else if (command === "both") {
    await crawlPrices();
    await crawlHealth();
  } else if (command === "inspect") {
    const target = args[1];
    if (!target) {
      console.log("usage: crawl inspect <url|provider-slug>");
      return;
    }
    await inspect(target);
  } else {
    console.log("usage: crawl <prices|health|both|inspect> [--dry] [--include-demo] [--only <slug>] [--verbose]");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
