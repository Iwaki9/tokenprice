// One-shot: add provider candidates to data/providers.json (idempotent by slug).
// They stay hidden on the public site until a referral URL is set AND the
// crawler confirms reachability — see src/lib/visibility.ts.
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "data", "providers.json");
const list = JSON.parse(fs.readFileSync(file, "utf8"));
const now = new Date().toISOString();

const add = [
  {
    slug: "openrouter",
    name: "OpenRouter",
    taglineRu: "460+ моделей через один API, публичный прайс за токен в JSON.",
    taglineEn: "460+ models behind one API with a public per-token price feed.",
    homepage: "https://openrouter.ai",
    pricingUrl: "https://openrouter.ai/api/v1/models",
    apiBase: "https://openrouter.ai/api",
    crawlAdapter: "openrouter",
    features: { usageBased: true },
    tags: ["openai", "anthropic", "google", "deepseek", "moonshot", "qwen", "zhipu", "xai"],
  },
  {
    slug: "sambanova",
    name: "SambaNova",
    taglineRu: "Быстрые инференции на собственных чипах, открытый список моделей с ценами.",
    taglineEn: "Fast inference on custom silicon, an open model list with prices.",
    homepage: "https://www.sambanova.ai",
    pricingUrl: "https://api.sambanova.ai/v1/models",
    apiBase: "https://api.sambanova.ai/v1",
    crawlAdapter: "sambanova",
    features: { usageBased: true, trialCredit: true },
    tags: ["openai", "deepseek", "qwen", "meta"],
  },
  {
    slug: "chutes",
    name: "Chutes",
    taglineRu: "Децентрализованный хостинг открытых моделей, цены прямо в API списков.",
    taglineEn: "Decentralised open-model hosting with prices inside the models API.",
    homepage: "https://chutes.ai",
    pricingUrl: "https://llm.chutes.ai/v1/models",
    apiBase: "https://llm.chutes.ai/v1",
    crawlAdapter: "chutes",
    features: { usageBased: true, crypto: true },
    tags: ["deepseek", "qwen", "moonshot", "zhipu", "meta"],
  },
  {
    slug: "groq",
    name: "Groq",
    taglineRu: "LPU-инференция с самой низкой латентностью, публичный прайс-лист.",
    taglineEn: "LPU inference with the lowest latency and a published price list.",
    homepage: "https://groq.com",
    pricingUrl: "https://groq.com/pricing",
    apiBase: "https://api.groq.com/openai/v1",
    crawlAdapter: "auto",
    features: { usageBased: true, trialCredit: true },
    tags: ["openai", "google", "meta", "deepseek"],
  },
  {
    slug: "cerebras",
    name: "Cerebras",
    taglineRu: "WSE-3 инференция, открытые модели с агрессивными ценами.",
    taglineEn: "WSE-3 inference with aggressively priced open models.",
    homepage: "https://www.cerebras.ai",
    pricingUrl: "https://www.cerebras.ai/pricing",
    crawlAdapter: "auto",
    features: { usageBased: true, trialCredit: true },
    tags: ["deepseek", "qwen", "meta", "zhipu"],
  },
  {
    slug: "mistral",
    name: "Mistral AI (La Plateforme)",
    taglineRu: "Официальный API Mistral с публичной страницей тарифов.",
    taglineEn: "Official Mistral API with a public pricing page.",
    homepage: "https://mistral.ai",
    pricingUrl: "https://mistral.ai/pricing",
    apiBase: "https://api.mistral.ai/v1",
    crawlAdapter: "auto",
    features: { usageBased: true },
    tags: ["mistral"],
  },
  {
    slug: "deepseek-direct",
    name: "DeepSeek (официальный API)",
    taglineRu: "Официальный DeepSeek — прайс в документации, один из самых дешёвых R1.",
    taglineEn: "Official DeepSeek API — priced in the docs, one of the cheapest R1s.",
    homepage: "https://www.deepseek.com",
    pricingUrl: "https://api-docs.deepseek.com/quick_start/pricing",
    apiBase: "https://api.deepseek.com/v1",
    crawlAdapter: "auto",
    features: { usageBased: true },
    tags: ["deepseek"],
  },
  {
    slug: "moonshot-direct",
    name: "Moonshot AI (официальный API)",
    taglineRu: "Прямой API Kimi с опубликованной таблицей цен.",
    taglineEn: "Direct Kimi API with a published price table.",
    homepage: "https://www.moonshot.ai",
    pricingUrl: "https://platform.moonshot.ai/docs/pricing",
    apiBase: "https://api.moonshot.ai/v1",
    crawlAdapter: "auto",
    features: { usageBased: true },
    tags: ["moonshot"],
  },
  {
    slug: "aimlapi",
    name: "AIMLAPI",
    taglineRu: "Мультивендорный агрегатор 500+ моделей, есть партнёрская программа.",
    taglineEn: "Multi-vendor aggregator of 500+ models with an affiliate program.",
    homepage: "https://aimlapi.com",
    pricingUrl: "https://aimlapi.com/models",
    apiBase: "https://api.aimlapi.com/v1",
    crawlAdapter: "auto",
    features: { usageBased: true, card: true, crypto: true },
    tags: ["openai", "anthropic", "google", "deepseek", "meta", "mistral"],
  },
  {
    slug: "hyperbolic",
    name: "Hyperbolic",
    taglineRu: "OpenAI-совместимые эндпоинты открытых моделей, почасовая оплата GPU.",
    taglineEn: "OpenAI-compatible endpoints for open models plus hourly GPUs.",
    homepage: "https://www.hyperbolic.ai",
    apiBase: "https://api.hyperbolic.xyz/v1",
    features: { usageBased: true },
    tags: ["deepseek", "meta", "qwen"],
  },
  {
    slug: "fireworks",
    name: "Fireworks AI",
    taglineRu: "Скоростной хостинг открытых и фирменных моделей, публичный прайс.",
    taglineEn: "Fast hosting of open and first-party models with public pricing.",
    homepage: "https://fireworks.ai",
    pricingUrl: "https://fireworks.ai/pricing",
    apiBase: "https://api.fireworks.ai/inference/v1",
    crawlAdapter: "auto",
    features: { usageBased: true },
    tags: ["deepseek", "meta", "qwen", "fireworks-llama"],
  },
  {
    slug: "xai",
    name: "xAI (Grok)",
    taglineRu: "Официальный API Grok с прайсом в документации.",
    taglineEn: "Official Grok API with pricing in the docs.",
    homepage: "https://x.ai",
    pricingUrl: "https://docs.x.ai/docs/models",
    apiBase: "https://api.x.ai/v1",
    crawlAdapter: "auto",
    features: { usageBased: true },
    tags: ["xai"],
  },
  {
    slug: "302ai",
    name: "302.AI",
    taglineRu: "Китайский pay-as-you-go агрегатор с партнёрской программой.",
    taglineEn: "Chinese pay-as-you-go aggregator with a partner program.",
    homepage: "https://302.ai",
    apiBase: "https://dash.302.ai",
    features: { usageBased: true, card: true },
    tags: ["openai", "anthropic", "google", "deepseek", "moonshot", "qwen"],
  },
];

let added = 0;
for (const p of add) {
  if (list.some((x) => x.slug === p.slug)) continue;
  list.push({ ...p, minTopUp: null, status: "active", isDemo: false, createdAt: now, updatedAt: now });
  added += 1;
}
fs.writeFileSync(file, `${JSON.stringify(list, null, 2)}\n`);
console.log(`providers: +${added} (total ${list.length})`);
