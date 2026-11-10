// merge extra official-price entries into data/official-prices.json (idempotent by slug)
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "data", "official-prices.json");
const db = JSON.parse(fs.readFileSync(file, "utf8"));

const OAI = "https://developers.openai.com/api/docs/pricing";
const GOO = "https://ai.google.dev/gemini-api/docs/pricing";
const add = [
  { slug: "gpt-6-sol", vendor: "openai", name: "GPT-6 Sol", input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5, sourceUrl: OAI, status: "ga", note: "Контекст до 272K; свыше — $4 / $15." },
  { slug: "gpt-5-6-sol", vendor: "openai", name: "GPT-5.6 Sol", input: 4, output: 20, cacheRead: 0.4, cacheWrite: 5, sourceUrl: OAI, status: "ga", note: "Промо-цена до 30.11.2026; затем $8 / $40." },
  { slug: "gpt-5-5-pro", vendor: "openai", name: "GPT-5.5 Pro", input: 30, output: 180, cacheRead: null, cacheWrite: null, sourceUrl: OAI, status: "ga", note: "Контекст до 272K; свыше — $60 / $270." },
  { slug: "gpt-5-4", vendor: "openai", name: "GPT-5.4", input: 2.5, output: 15, cacheRead: 0.25, cacheWrite: null, sourceUrl: OAI, status: "ga", note: "Контекст до 272K; свыше — $5 / $22.50." },
  { slug: "gpt-5-4-mini", vendor: "openai", name: "GPT-5.4 mini", input: 0.75, output: 4.5, cacheRead: 0.075, cacheWrite: null, sourceUrl: OAI, status: "ga" },
  { slug: "gpt-5-4-nano", vendor: "openai", name: "GPT-5.4 nano", input: 0.2, output: 1.25, cacheRead: 0.02, cacheWrite: null, sourceUrl: OAI, status: "ga" },
  { slug: "gpt-5-2", vendor: "openai", name: "GPT-5.2", input: 1.75, output: 14, cacheRead: 0.175, cacheWrite: null, sourceUrl: OAI, status: "ga" },
  { slug: "gpt-5-2-pro", vendor: "openai", name: "GPT-5.2 Pro", input: 21, output: 168, cacheRead: null, cacheWrite: null, sourceUrl: OAI, status: "ga" },
  { slug: "gpt-5-1", vendor: "openai", name: "GPT-5.1", input: 1.25, output: 10, cacheRead: 0.125, cacheWrite: null, sourceUrl: OAI, status: "ga" },
  { slug: "gpt-5-nano", vendor: "openai", name: "GPT-5 nano", input: 0.05, output: 0.4, cacheRead: 0.005, cacheWrite: null, sourceUrl: OAI, status: "ga" },
  { slug: "gpt-5-pro", vendor: "openai", name: "GPT-5 Pro", input: 15, output: 120, cacheRead: null, cacheWrite: null, sourceUrl: OAI, status: "ga" },
  { slug: "o3-pro", vendor: "openai", name: "o3-pro", input: 20, output: 80, cacheRead: null, cacheWrite: null, sourceUrl: OAI, status: "ga" },
  { slug: "gemini-3-6-flash", vendor: "google", name: "Gemini 3.6 Flash", input: 0.75, output: 3.75, cacheRead: 0.075, cacheWrite: null, sourceUrl: GOO, status: "ga", note: "Цена до 31.12.2026; с 01.01.2027 — $1.50 / $7.50." },
  { slug: "gemini-3-5-flash-lite", vendor: "google", name: "Gemini 3.5 Flash-Lite", input: 0.3, output: 2.5, cacheRead: 0.03, cacheWrite: null, sourceUrl: GOO, status: "ga" },
];

let added = 0;
for (const m of add) {
  if (db.models.some((x) => x.slug === m.slug)) continue;
  db.models.push(m);
  added += 1;
}
db.checkedAt = new Date().toISOString().slice(0, 10);
fs.writeFileSync(file, JSON.stringify(db, null, 2) + "\n");
console.log(`official-prices: +${added} (total ${db.models.length})`);
