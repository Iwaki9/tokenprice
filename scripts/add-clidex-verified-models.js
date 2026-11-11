// Add models whose official prices were cross-verified via Clidex's public
// pricing API (https://api.clidex.dev/api/v1/pricing), 2026-11-11.
// Idempotent by slug. Image/per-call tools are intentionally skipped: the
// boards compare token prices only.
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "data", "official-prices.json");
const db = JSON.parse(fs.readFileSync(file, "utf8"));
const ANT = "https://www.anthropic.com/pricing";
const NOTE = "Официальная цена сверена 2026-11-11 по публичному прайс-API Clidex (api.clidex.dev/api/v1/pricing); модель может быть снята вендором с продажи.";

const add = [
  { slug: "claude-fable-5", vendor: "anthropic", name: "Claude Fable 5", input: 10, output: 50, cacheRead: 1, cacheWrite: 12.5, sourceUrl: ANT, status: "ga", note: NOTE },
  { slug: "claude-fable-5-1", vendor: "anthropic", name: "Claude Fable 5.1", input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5, sourceUrl: ANT, status: "ga", note: NOTE },
  { slug: "claude-opus-4-5", vendor: "anthropic", name: "Claude Opus 4.5", input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25, sourceUrl: ANT, status: "ga", note: NOTE },
  { slug: "claude-opus-4-6", vendor: "anthropic", name: "Claude Opus 4.6", input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25, sourceUrl: ANT, status: "ga", note: NOTE },
  { slug: "claude-sonnet-4-6", vendor: "anthropic", name: "Claude Sonnet 4.6", input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75, sourceUrl: ANT, status: "ga", note: NOTE },
  { slug: "claude-sonnet-5", vendor: "anthropic", name: "Claude Sonnet 5", input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5, sourceUrl: ANT, status: "ga", note: NOTE },
  { slug: "claude-haiku-4-5", vendor: "anthropic", name: "Claude Haiku 4.5", input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25, sourceUrl: ANT, status: "ga", note: NOTE },
  { slug: "claude-opus-4-7", vendor: "anthropic", name: "Claude Opus 4.7", input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25, sourceUrl: ANT, status: "ga", note: NOTE },
  { slug: "claude-opus-4-8", vendor: "anthropic", name: "Claude Opus 4.8", input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25, sourceUrl: ANT, status: "ga", note: NOTE },
  { slug: "claude-opus-5", vendor: "anthropic", name: "Claude Opus 5", input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25, sourceUrl: ANT, status: "ga", note: NOTE },
];

let added = 0;
for (const m of add) {
  if (db.models.some((x) => x.slug === m.slug)) continue;
  db.models.push(m);
  added += 1;
}
db.checkedAt = "2026-11-11";
fs.writeFileSync(file, JSON.stringify(db, null, 2) + "\n");
console.log(`official-prices: +${added} (total ${db.models.length})`);
