// Merges data/official-prices.json into data/models.json without touching other models.
// Run: npx tsx scripts/sync-official.ts
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type OfficialEntry = {
  slug: string;
  vendor: string;
  name: string;
  input: number;
  output: number;
  cacheRead: number | null;
  cacheWrite: number | null;
  sourceUrl: string;
  status: "ga" | "preview" | "retired";
  note?: string;
};

type Model = {
  slug: string;
  vendor: string;
  name: string;
  official: Record<string, unknown>;
  [key: string]: unknown;
};

const root = path.join(__dirname, "..");
const modelsFile = path.join(root, "data", "models.json");
const official = JSON.parse(
  readFileSync(path.join(root, "data", "official-prices.json"), "utf8"),
) as { models: OfficialEntry[] };
const models = JSON.parse(readFileSync(modelsFile, "utf8")) as Model[];
const vendors = JSON.parse(
  readFileSync(path.join(root, "data", "vendors.json"), "utf8"),
) as { slug: string; name: string }[];
const vendorName = new Map(vendors.map((v) => [v.slug, v.name]));

let added = 0;
let updated = 0;
for (const entry of official.models) {
  const vendor = vendorName.get(entry.vendor) ?? entry.vendor;
  const next: Model = {
    slug: entry.slug,
    vendor: entry.vendor,
    name: entry.name,
    official: {
      input: entry.input,
      output: entry.output,
      cacheRead: entry.cacheRead,
      cacheWrite: entry.cacheWrite,
      sourceUrl: entry.sourceUrl,
    },
    contextWindow: entry.vendor === "google" ? 1_048_576 : 400_000,
    status: entry.status,
    featured: true,
    summaryRu: `${entry.name} от ${vendor}. Официальная цена $${entry.input} за 1M входных и $${entry.output} за 1M выходных токенов.`,
    summaryEn: `${entry.name} by ${vendor}. Official list price: $${entry.input} per 1M input and $${entry.output} per 1M output tokens.`,
  };
  const index = models.findIndex((m) => m.slug === entry.slug);
  if (index >= 0) {
    models[index] = { ...models[index], ...next };
    updated += 1;
  } else {
    models.push(next);
    added += 1;
  }
}

writeFileSync(modelsFile, `${JSON.stringify(models, null, 2)}\n`, "utf8");
console.log(`official sync: ${added} added, ${updated} updated, ${models.length} models total`);
