// Adds the three monetised providers (user-registered referrals). Idempotent by slug.
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "data", "providers.json");
const list = JSON.parse(fs.readFileSync(file, "utf8"));
const now = new Date().toISOString();

const add = [
  {
    slug: "clidex",
    name: "Clidex",
    taglineRu: "Шлюз для Claude и Codex CLI: пул аккаунтов без rate-limit, тарифы до −90% к официальным.",
    taglineEn: "Claude & Codex CLI gateway with account pooling; rates up to 90% below official.",
    homepage: "https://clidex.dev",
    referralUrl: "https://dash.clidex.dev/login?ref=2c765a3f&ch=tokenprice",
    pricingUrl: "https://clidex.dev/en/pricing",
    apiBase: "https://api.clidex.dev/v1",
    crawlAdapter: "auto",
    features: { usageBased: true },
    tags: ["anthropic", "openai"],
  },
  {
    slug: "foxrouter",
    name: "FoxRouter",
    taglineRu: "API-гейтвей моделей на платформе New API, OpenAI-совместимый эндпоинт.",
    taglineEn: "Model API gateway built on the New API panel, OpenAI-compatible endpoint.",
    homepage: "https://foxrouter.org",
    referralUrl: "https://foxrouter.org/sign-up?aff=rC1D",
    apiBase: "https://foxrouter.org/v1",
    crawlAdapter: "auto",
    features: { usageBased: true },
    tags: ["openai", "anthropic", "google", "deepseek"],
  },
  {
    slug: "xcli",
    name: "XCLI",
    taglineRu: "Pay-as-you-go шлюз Claude, GPT и Gemini; совместим с OpenAI-клиентами, Claude Code и Cursor.",
    taglineEn: "Pay-as-you-go gateway for Claude, GPT and Gemini; works with OpenAI clients, Claude Code and Cursor.",
    homepage: "https://xcli.si",
    referralUrl: "https://xcli.si/ref/EWNME",
    pricingUrl: "https://xcli.si/pricing",
    apiBase: "https://xcli.si/v1",
    crawlAdapter: "auto",
    features: { usageBased: true },
    tags: ["anthropic", "openai", "google", "deepseek", "qwen"],
  },
];

let changed = 0;
for (const p of add) {
  const i = list.findIndex((x) => x.slug === p.slug);
  if (i >= 0) {
    list[i] = { ...list[i], ...p, updatedAt: now };
  } else {
    list.push({ ...p, minTopUp: null, status: "active", isDemo: false, createdAt: now, updatedAt: now });
  }
  changed += 1;
}
fs.writeFileSync(file, JSON.stringify(list, null, 2) + "\n");
console.log(`providers upserted: ${changed}, total ${list.length}`);
