// Harvests the provider directory embedded in aipricerank.com model pages.
// Each model page ships a data blob with every listing: {siteId, name,
// sourceUrl, input/output prices...}. We aggregate unique sites, probe their
// pricing sources to classify what the crawler can read (New API JSON, plain
// JSON, HTML tables), upsert NEW providers as status "pending" (hidden from
// the site and feed until reviewed + given a referral URL), and write a
// review report to data/harvest-report.json.
//
//   npx tsx scripts/harvest-aipricerank.ts [--commit]   (without --commit: dry run, report only)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "..");
const PROVIDERS_FILE = path.join(ROOT, "data", "providers.json");
const REPORT_FILE = path.join(ROOT, "data", "harvest-report.json");

const MODEL_PAGES = [
  "claude-opus-5-5",
  "claude-fable-5-2",
  "claude-sonnet-5-5",
  "gpt-6-1-sol",
  "gpt-6-astra",
  "gpt-5-6-luna",
  "gemini-4-argon",
  "gemini-3-8-flash",
  "grok-4-7",
  "deepseek-v4-pro",
  "kimi-k3",
];

const VENDOR_BY_PREFIX: [RegExp, string][] = [
  [/^claude/i, "anthropic"],
  [/^(gpt|o\d|codex)/i, "openai"],
  [/^gemini/i, "google"],
  [/^grok/i, "xai"],
  [/^deepseek/i, "deepseek"],
  [/^kimi/i, "moonshot"],
  [/^(glm|zhipu|chatglm)/i, "zhipu"],
  [/^qwen/i, "qwen"],
  [/^minimax/i, "minimax"],
  [/^llama/i, "meta"],
];

const decode = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

type Listing = {
  siteId: string;
  name: string;
  sourceUrls: Map<string, number>;
  models: Set<string>;
  seenDate: string;
};

async function text(url: string, ms = 20000): Promise<{ ok: boolean; status: number; body: string; ct: string }> {
  let last: { ok: boolean; status: number; body: string; ct: string } = { ok: false, status: 0, body: "", ct: "" };
  // this machine intermittently resets TLS to CN/US relays — one retry helps a lot
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const r = await fetch(url, {
        redirect: "follow",
        headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36" },
        signal: AbortSignal.timeout(ms),
      });
      return { ok: r.ok, status: r.status, body: await r.text(), ct: (r.headers.get("content-type") || "").split(";")[0] };
    } catch (error) {
      last = { ok: false, status: 0, body: "", ct: String((error as Error).message).slice(0, 40) };
    }
  }
  return last;
}

/* --------------------------------------------------------------- collect */

async function main() {
const listings = new Map<string, Listing>();
for (const slug of MODEL_PAGES) {
  const page = await text(`https://aipricerank.com/models/${slug}`);
  if (!page.ok) {
    console.log(`page ${slug}: HTTP ${page.status} skipped`);
    continue;
  }
  const data = decode(page.body);
  const entryRe = /"siteId":\[0,"([a-z0-9_-]+)"\],"name":\[0,"([^"]{1,60})"\]/g;
  let match: RegExpExecArray | null;
  while ((match = entryRe.exec(data))) {
    const siteId = match[1];
    const name = match[2];
    const tail = data.slice(match.index, match.index + 1600);
    const src = tail.match(/"sourceUrl":\[0,"([^"]+)"/)?.[1] ?? "";
    const date = tail.match(/"observedDate":\[0,"([\d-]+)"/)?.[1] ?? "";
    const entry = listings.get(siteId) ?? { siteId, name, sourceUrls: new Map(), models: new Set(), seenDate: "" };
    entry.models.add(slug);
    entry.seenDate = date || entry.seenDate;
    if (src) entry.sourceUrls.set(src, (entry.sourceUrls.get(src) ?? 0) + 1);
    listings.set(siteId, entry);
  }
}
console.log(`unique sites from ${MODEL_PAGES.length} model pages: ${listings.size}`);

/* ----------------------------------------------------------------- probe */

type Existing = { slug: string; name: string; homepage?: string; status: string; pricingUrl?: string }[];
const existing = existsSync(PROVIDERS_FILE) ? (JSON.parse(readFileSync(PROVIDERS_FILE, "utf8")) as Existing) : [];
const existingOrigins = new Set(
  existing
    .map((p) => {
      try {
        return new URL(p.homepage || p.pricingUrl || "").hostname.replace(/^www\./, "");
      } catch {
        return "";
      }
    })
    .filter(Boolean),
);

const report: {
  siteId: string;
  name: string;
  sourceUrl: string;
  homepage: string;
  classify: "newapi" | "json" | "html-table" | "unknown";
  note: string;
  models: string[];
  alreadyKnown: boolean;
}[] = [];

for (const entry of [...listings.values()].sort((a, b) => a.siteId.localeCompare(b.siteId))) {
  const sourceUrl = [...entry.sourceUrls.keys()].sort((a, b) => (entry.sourceUrls.get(b) ?? 0) - (entry.sourceUrls.get(a) ?? 0))[0] ?? "";
  let homepage = "";
  try {
    homepage = new URL(sourceUrl).origin;
  } catch {
    homepage = "";
  }
  const host = homepage ? new URL(homepage).hostname.replace(/^www\./, "") : "";
  const alreadyKnown = existing.some((p) => p.slug === entry.siteId) || Boolean(host && existingOrigins.has(host));

  let classify: "newapi" | "json" | "html-table" | "unknown" = "unknown";
  let note = "no source url";
  if (sourceUrl) {
    const probe = await text(sourceUrl);
    if (probe.status === 0) {
      note = `fetch failed: ${probe.ct}`;
    } else if (probe.ct.includes("json")) {
      try {
        const parsed = JSON.parse(probe.body);
        const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.data) ? parsed.data : Array.isArray(parsed?.prices) ? parsed.prices : null;
        if (arr && arr.length) {
          const keys = Object.keys(arr[0] ?? {}).join(",");
          if (/model_ratio/.test(keys)) {
            classify = "newapi";
            note = `${arr.length} rows, ratio-based (calibrate ratioFactor per panel)`;
          } else if (/(input|prompt)[a-z_]*(price|usd|_in)?/i.test(keys) && /(output|completion)/i.test(keys)) {
            classify = "json";
            note = `${arr.length} rows, keys: ${keys.slice(0, 140)}`;
          } else {
            classify = "json";
            note = `${arr.length} rows, UNRECOGNISED keys: ${keys.slice(0, 140)}`;
          }
        } else {
          note = "json but no array found";
        }
      } catch {
        note = `json ct but unparseable (${probe.body.length} bytes)`;
      }
    } else if (/html/.test(probe.ct)) {
      const tables = (probe.body.match(/<table/gi) || []).length;
      const dollars = (probe.body.match(/\$\s?\d/g) || []).length;
      const yuan = (probe.body.match(/¥\s?\d|元\s?\/|CNY/gi) || []).length;
      classify = tables > 0 && dollars + yuan > 3 ? "html-table" : "unknown";
      note = `html, tables=${tables}, $=${dollars}, ¥=${yuan}`;
    } else {
      note = `content-type ${probe.ct}`;
    }
  }

  report.push({
    siteId: entry.siteId,
    name: entry.name,
    sourceUrl,
    homepage,
    classify,
    note,
    models: [...entry.models],
    alreadyKnown,
  });
  console.log(`${entry.siteId.padEnd(14)} ${classify.padEnd(10)} known=${alreadyKnown ? "y" : "n"}  ${note.slice(0, 90)}`);
}

writeFileSync(REPORT_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), sites: report }, null, 2) + "\n");

/* ---------------------------------------------------------------- write */

if (process.argv.includes("--commit")) {
  const now = new Date().toISOString();
  const full = JSON.parse(readFileSync(PROVIDERS_FILE, "utf8")) as Record<string, unknown>[];
  let added = 0;
  for (const row of report) {
    if (row.alreadyKnown || !row.homepage) continue;
    if (!["newapi", "json", "html-table"].includes(row.classify)) continue;
    if (full.some((p) => p.slug === row.siteId)) continue;
    const tags = [...new Set(row.models.map((m) => VENDOR_BY_PREFIX.find(([re]) => re.test(m))?.[1]).filter(Boolean))] as string[];
    full.push({
      slug: row.siteId,
      name: row.name,
      taglineRu: "Найден в каталоге AIPriceRank; цены публикуются на сайте. На ревью.",
      taglineEn: "Harvested from the AIPriceRank directory; publishes prices on their site. Under review.",
      homepage: row.homepage,
      pricingUrl: row.sourceUrl,
      apiBase: `${row.homepage.replace(/\/$/, "")}/v1`,
      crawlAdapter: row.classify === "newapi" ? "newapi" : "auto",
      features: { usageBased: true },
      tags: tags.length ? tags : ["openai", "anthropic", "google"],
      minTopUp: null,
      status: "pending",
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    });
    added += 1;
  }
  writeFileSync(PROVIDERS_FILE, JSON.stringify(full, null, 2) + "\n");
  console.log(`providers added (pending): ${added}, total ${full.length}`);
} else {
  console.log("dry run — pass --commit to upsert providers");
}
}

main().catch((error) => {
  console.error(String((error as Error).stack ?? error));
  process.exit(1);
});
