// Generates the public README.md from the repo's own data files.
// Run: npx tsx scripts/gen-readme.ts
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "..");
const read = <T>(p: string): T => JSON.parse(readFileSync(path.join(ROOT, p), "utf8")) as T;

type Model = {
  slug: string;
  vendor: string;
  name: string;
  status: string;
  contextWindow?: number;
  official: { input: number; output: number; cacheRead?: number | null; sourceUrl: string };
  summaryEn?: string;
};
type Provider = { slug: string; name: string; homepage?: string; status: string; isDemo?: boolean };
type Quote = { providerSlug: string; modelSlug: string; input: number; output: number; cacheRead?: number | null; observedAt?: string; note?: string };
type Official = { checkedAt: string; models: { slug: string; note?: string }[] };

const models = read<Model[]>("data/models.json");
const providers = read<Provider[]>("data/providers.json").filter((p) => p.status === "active" && !p.isDemo);
const quotes = read<Quote[]>("data/prices.json").filter((q) => providers.some((p) => p.slug === q.providerSlug));
const officialFile = read<Official>("data/official-prices.json");
const notes = new Map(officialFile.models.map((m) => [m.slug, m.note]));

const money = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : `$${v >= 10 ? v.toFixed(0) : v.toFixed(v >= 1 ? 2 : 3)}`;
const blend = (i: number, o: number) => (5 * i + o) / 6; // dev ratio, 5:1
const ctx = (t?: number) => (t ? `${Math.round(t / 1000)}K` : "—");

const byModel = new Map<string, Quote[]>();
for (const q of quotes) byModel.set(q.modelSlug, [...(byModel.get(q.modelSlug) ?? []), q]);

const rows = models
  .map((m) => {
    const qs = (byModel.get(m.slug) ?? []).sort((a, b) => blend(a.input, a.output) - blend(b.input, b.output));
    const best = qs[0];
    const officialBlend = blend(m.official.input, m.official.output);
    const discount = best && officialBlend > 0 ? Math.round((1 - blend(best.input, best.output) / officialBlend) * 100) : null;
    const note = notes.get(m.slug);
    return {
      name: m.name,
      vendor: m.vendor,
      input: money(m.official.input),
      output: money(m.official.output),
      cache: money(m.official.cacheRead),
      context: ctx(m.contextWindow),
      best: best ? `[${providers.find((p) => p.slug === best.providerSlug)?.name}](${providers.find((p) => p.slug === best.providerSlug)?.homepage}) ${money(best.input)} / ${money(best.output)}${discount && discount > 0 ? ` (**−${discount}%**)` : ""}` : "—",
      note: note ? note : "",
      source: m.official.sourceUrl,
    };
  });

const quoteDate = quotes[0]?.observedAt ?? officialFile.checkedAt;

const readme = `# LLM API price comparison (open data)

Curated, machine-readable comparison of LLM API list prices from official vendor
pages plus third-party provider quotes from our crawler. **${models.length} models**,
updated automatically.

👉 Interactive version with hourly price checks, uptime monitoring and a cost
calculator: **[tokenprice.rest](https://tokenprice.rest)**
_(this site uses sponsored referral links; ranking is independent of them — see
[methodology](https://tokenprice.rest/en/methodology))._

## Official list prices (USD per 1M tokens)

Prices are the vendors' standard API tiers (not batch/flex), checked on
${officialFile.checkedAt}. Sources are linked per model in
[\`data/official-prices.json\`](data/official-prices.json).

| Model | Vendor | Input | Output | Cached input | Context | Cheapest crawler-verified quote |
|---|---|---:|---:|---:|---:|---|
${rows
  .map((r) => `| **${r.name}**${r.note ? `<br>_⚠ ${r.note}_` : ""} | ${r.vendor} | ${r.input} | ${r.output} | ${r.cache} | ${r.context} | ${r.best} |`)
  .join("\n")}

Provider quotes above are fetched by the crawler in this repo
([\`crawler/index.ts\`](crawler/index.ts)) from the providers' public pricing
APIs on ${quoteDate}. **They change often — treat the table as a snapshot and
check [the live feed](https://tokenprice.rest/api/prices.json).**

## Machine-readable data

All data files are in [\`data/\`](data/) and regenerate daily via CI:

| File | What it contains |
|---|---|
| [\`data/models.json\`](data/models.json) | Model catalogue + official prices + source URLs |
| [\`data/official-prices.json\`](data/official-prices.json) | Official vendor prices with per-entry source and date |
| [\`data/providers.json\`](data/providers.json) | Provider directory + crawl configs |
| [\`data/prices.json\`](data/prices.json) | Latest provider quotes (USD per 1M tokens) |
| Live feed | \`GET https://tokenprice.rest/api/prices.json\` |

## CLI

A tiny dependency-free CLI that uses the same feed:

\`\`\`bash
npx tokenrate-cli price gpt-5-6-luna --in 2000 --out 500
npx tokenrate-cli cheapest --mix dev
\`\`\`

Source: [\`cli/\`](cli/).

## Methodology

- **Blended cost** normalises "price per 1M tokens" to a chosen input:output
  ratio (chat, code, agents), because output tokens cost 3–6× input everywhere.
- **Quality index** = 40% uptime + 30% stability (30d) + 30% p95 latency, from
  probes every 30 minutes against public endpoints.
- Referral/sponsored links never affect ranking. Listings without a verified
  price source are labelled as demo.

## This repository

The website, admin panel and crawler are the same codebase — see
[docs/PROJECT.md](docs/PROJECT.md) (Next.js 16 + Cloudflare Workers + D1).

## Disclaimer

Prices are collected in good faith and are provided **without warranty of any
kind**. Always verify prices on the vendor's own page before purchasing.
Vendors change pricing, run promos with deadlines and add new models faster
than any static table can follow.

## License

Data and code in this repository are licensed under [MIT](LICENSE).
`;

writeFileSync(path.join(ROOT, "README.md"), readme, "utf8");
console.log(`README.md written: ${rows.length} model rows, ${providers.length} real providers, ${quotes.length} quotes`);
