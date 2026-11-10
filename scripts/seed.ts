/**
 * Builds the demo dataset in /data.
 *
 * Official vendor prices are real list prices (USD per 1M tokens) with a link
 * to the vendor pricing page. Provider quotes are generated deterministically
 * from those prices and are marked `isDemo: true` — the crawler or the admin
 * panel replaces them with real observed prices.
 *
 * Run: npx tsx scripts/seed.ts
 */
import { promises as fs, readFileSync } from "node:fs";
import path from "node:path";
import type {
  Model,
  PriceQuote,
  Provider,
  Submission,
  Vendor,
} from "../src/lib/types";

const OUT = path.join(process.cwd(), "data");
const NOW = new Date();
const ISO = NOW.toISOString();

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (value: number, digits = 4) => Number(value.toFixed(digits));

const vendors: Vendor[] = [
  { slug: "anthropic", name: "Anthropic", brandColor: "#d97757", mark: "A" },
  { slug: "openai", name: "OpenAI", brandColor: "#0f9d76", mark: "O" },
  { slug: "google", name: "Google", brandColor: "#4285f4", mark: "G" },
  { slug: "xai", name: "xAI", brandColor: "#111111", mark: "X" },
  { slug: "deepseek", name: "DeepSeek", brandColor: "#4d6bfe", mark: "D" },
  { slug: "moonshot", name: "Moonshot", brandColor: "#7c3aed", mark: "K" },
  { slug: "zhipu", name: "Zhipu AI", brandColor: "#1e5eff", mark: "Z" },
  { slug: "qwen", name: "Qwen", brandColor: "#615ced", mark: "Q" },
];

type ModelSeed = [slug: string, vendor: string, name: string, input: number, output: number, cacheRead?: number, released?: string];

const modelSeeds: ModelSeed[] = [
  ["claude-opus-4-1", "anthropic", "Claude Opus 4.1", 15, 75, 1.5, "2025-08-05"],
  ["claude-opus-4", "anthropic", "Claude Opus 4", 15, 75, 1.5, "2025-05-22"],
  ["claude-sonnet-4-5", "anthropic", "Claude Sonnet 4.5", 3, 15, 0.3, "2025-09-29"],
  ["claude-sonnet-4", "anthropic", "Claude Sonnet 4", 3, 15, 0.3, "2025-05-22"],
  ["claude-haiku-3-5", "anthropic", "Claude Haiku 3.5", 0.8, 4, 0.08, "2024-10-22"],
  ["gpt-5", "openai", "GPT-5", 1.25, 10, 0.125, "2025-08-07"],
  ["gpt-5-mini", "openai", "GPT-5 mini", 0.25, 2, 0.025, "2025-08-07"],
  ["gpt-4o", "openai", "GPT-4o", 2.5, 10, 1.25, "2024-05-13"],
  ["gpt-4o-mini", "openai", "GPT-4o mini", 0.15, 0.6, 0.075, "2024-07-18"],
  ["o3", "openai", "o3", 2, 8, 0.5, "2025-04-16"],
  ["o4-mini", "openai", "o4-mini", 1.1, 4.4, 0.275, "2025-04-16"],
  ["gemini-2-5-pro", "google", "Gemini 2.5 Pro", 1.25, 10, 0.31, "2025-03-25"],
  ["gemini-2-5-flash", "google", "Gemini 2.5 Flash", 0.3, 2.5, 0.075, "2025-06-17"],
  ["gemini-2-5-flash-lite", "google", "Gemini 2.5 Flash Lite", 0.1, 0.4, 0.025, "2025-07-22"],
  ["grok-4", "xai", "Grok 4", 3, 15, 0.75, "2025-07-09"],
  ["grok-3", "xai", "Grok 3", 3, 15, 0.75, "2025-02-17"],
  ["grok-3-mini", "xai", "Grok 3 mini", 0.3, 0.5, undefined, "2025-02-17"],
  ["deepseek-v3-1", "deepseek", "DeepSeek V3.1", 0.27, 1.1, 0.07, "2025-08-21"],
  ["deepseek-r1", "deepseek", "DeepSeek R1", 0.55, 2.19, 0.14, "2025-01-20"],
  ["kimi-k2", "moonshot", "Kimi K2", 0.6, 2.5, undefined, "2025-07-11"],
  ["kimi-k2-thinking", "moonshot", "Kimi K2 Thinking", 0.6, 2.5, undefined, "2025-11-06"],
  ["glm-4-6", "zhipu", "GLM-4.6", 0.6, 2.2, undefined, "2025-09-30"],
  ["glm-4-5-air", "zhipu", "GLM-4.5 Air", 0.2, 1.1, undefined, "2025-07-28"],
  ["qwen3-max", "qwen", "Qwen3 Max", 1.2, 6, undefined, "2025-09-24"],
  ["qwen-plus", "qwen", "Qwen Plus", 0.4, 1.2, undefined, "2025-04-29"],
];

const sourceByVendor: Record<string, string> = {
  anthropic: "https://www.anthropic.com/pricing",
  openai: "https://openai.com/api/pricing/",
  google: "https://ai.google.dev/gemini-api/docs/pricing",
  xai: "https://docs.x.ai/docs/models",
  deepseek: "https://api-docs.deepseek.com/quick_start/pricing",
  moonshot: "https://platform.moonshot.ai/docs/pricing",
  zhipu: "https://open.bigmodel.cn/pricing",
  qwen: "https://www.alibabacloud.com/help/en/model-studio/models",
};

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

const officialFile = JSON.parse(
  readFileSync(path.join(process.cwd(), "data", "official-prices.json"), "utf8"),
) as { checkedAt: string; models: OfficialEntry[] };

const vendorNameBySlug = new Map(vendors.map((v) => [v.slug, v.name]));

const legacyModels: Model[] = modelSeeds.map(
  ([slug, vendor, name, input, output, cacheRead, released]) => ({
    slug,
    vendor,
    name,
    official: {
      input,
      output,
      cacheRead: cacheRead ?? null,
      cacheWrite: vendor === "anthropic" ? round(input * 1.25, 4) : null,
      sourceUrl: sourceByVendor[vendor],
    },
    releasedAt: released,
    contextWindow: vendor === "google" ? 1_048_576 : 200_000,
    status: slug === "kimi-k2-thinking" ? "preview" : "ga",
    featured: true,
    summaryRu: `${name} от ${vendorNameBySlug.get(vendor) ?? vendor}. Официальная цена $${input} за 1M входных и $${output} за 1M выходных токенов.`,
    summaryEn: `${name} by ${vendorNameBySlug.get(vendor) ?? vendor}. Official list price: $${input} per 1M input and $${output} per 1M output tokens.`,
  }),
);

const officialModels: Model[] = officialFile.models.map((entry) => ({
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
  releasedAt: undefined,
  contextWindow: entry.vendor === "google" ? 1_048_576 : 400_000,
  status: entry.status,
  featured: true,
  summaryRu: `${entry.name} от ${vendorNameBySlug.get(entry.vendor) ?? entry.vendor}. Официальная цена $${entry.input} за 1M входных и $${entry.output} за 1M выходных токенов.`,
  summaryEn: `${entry.name} by ${vendorNameBySlug.get(entry.vendor) ?? entry.vendor}. Official list price: $${entry.input} per 1M input and $${entry.output} per 1M output tokens.`,
}));

const models: Model[] = [...legacyModels, ...officialModels];

type ProviderSeed = {
  slug: string;
  name: string;
  base: number;
  vendors: string[];
  taglineRu: string;
  taglineEn: string;
  features: Provider["features"];
  minTopUp?: { amount: number; currency: string };
  latency: number;
  uptime: number;
};

const providerSeeds: ProviderSeed[] = [
  {
    slug: "tokemart",
    name: "Tokemart",
    base: 0.06,
    vendors: ["anthropic", "openai", "google"],
    taglineRu: "Агрессивно дешёвый пул с оплатой картой и криптой, без инвойсов.",
    taglineEn: "Aggressively cheap pool, card and crypto payments, no invoices.",
    features: { card: true, crypto: true, usageBased: true, trialCredit: true, refunds: false },
    minTopUp: { amount: 2, currency: "USD" },
    latency: 640,
    uptime: 0.992,
  },
  {
    slug: "swiftroute",
    name: "SwiftRoute",
    base: 0.08,
    vendors: ["anthropic", "openai", "google", "xai", "deepseek", "moonshot"],
    taglineRu: "Широкое покрытие моделей, стабильная маршрутизация, низкий минимум.",
    taglineEn: "Broad model coverage, stable routing, low minimum top-up.",
    features: { card: true, usageBased: true, trialCredit: true, invoice: true },
    minTopUp: { amount: 5, currency: "USD" },
    latency: 420,
    uptime: 0.997,
  },
  {
    slug: "claudepool",
    name: "ClaudePool",
    base: 0.09,
    vendors: ["anthropic"],
    taglineRu: "Только Anthropic, разбивка по группам и высокий лимит на конкурентность.",
    taglineEn: "Anthropic only, group multipliers and high concurrency limits.",
    features: { card: true, alipay: true, usageBased: true },
    minTopUp: { amount: 10, currency: "CNY" },
    latency: 780,
    uptime: 0.988,
  },
  {
    slug: "promptport",
    name: "PromptPort",
    base: 0.11,
    vendors: ["openai", "anthropic", "google"],
    taglineRu: "Европейская команда, инвойсы, оплата картой, поддержка по email.",
    taglineEn: "EU-based team, invoices, card payments, email support.",
    features: { card: true, invoice: true, refunds: true, usageBased: true },
    minTopUp: { amount: 10, currency: "EUR" },
    latency: 310,
    uptime: 0.999,
  },
  {
    slug: "modelmill",
    name: "ModelMill",
    base: 0.15,
    vendors: ["anthropic", "openai", "google", "deepseek", "zhipu", "qwen"],
    taglineRu: "Все модели в одном биллинге, есть пробный кредит на $1.",
    taglineEn: "Every model behind one billing account, $1 trial credit.",
    features: { card: true, invoice: true, trialCredit: true, usageBased: true },
    minTopUp: { amount: 1, currency: "USD" },
    latency: 520,
    uptime: 0.995,
  },
  {
    slug: "novarelay",
    name: "NovaRelay",
    base: 0.22,
    vendors: ["anthropic", "google", "deepseek"],
    taglineRu: "Прозрачный прайс без групп, оплата по факту, возвраты в течение 24 часов.",
    taglineEn: "Flat pricing with no groups, pay as you go, 24-hour refunds.",
    features: { card: true, usageBased: true, refunds: true },
    minTopUp: { amount: 5, currency: "USD" },
    latency: 360,
    uptime: 0.996,
  },
  {
    slug: "apibridge",
    name: "APIBridge",
    base: 0.3,
    vendors: ["openai", "xai", "deepseek", "moonshot", "zhipu", "qwen"],
    taglineRu: "Ориентирован на азиатские модели, Alipay и WeChat Pay, инвойсы.",
    taglineEn: "Focused on Asian models, Alipay and WeChat Pay, invoices available.",
    features: { alipay: true, wechat: true, invoice: true, usageBased: true },
    minTopUp: { amount: 20, currency: "CNY" },
    latency: 610,
    uptime: 0.991,
  },
  {
    slug: "fluxapi",
    name: "FluxAPI",
    base: 0.45,
    vendors: ["anthropic", "openai", "google", "xai"],
    taglineRu: "Средний ценник, но стабильная скорость и понятная документация.",
    taglineEn: "Mid-range pricing with steady latency and clear docs.",
    features: { card: true, invoice: true, usageBased: true, trialCredit: true },
    minTopUp: { amount: 10, currency: "USD" },
    latency: 270,
    uptime: 0.999,
  },
  {
    slug: "relayone",
    name: "RelayOne",
    base: 0.55,
    vendors: ["anthropic", "openai"],
    taglineRu: "Близко к официальной цене, корпоративные инвойсы и SLA.",
    taglineEn: "Close to list price, corporate invoicing and an SLA.",
    features: { invoice: true, card: true, refunds: true, usageBased: true },
    minTopUp: { amount: 50, currency: "USD" },
    latency: 240,
    uptime: 0.9995,
  },
  {
    slug: "bytegate",
    name: "ByteGate",
    base: 0.7,
    vendors: ["anthropic", "openai", "google", "xai"],
    taglineRu: "Перепродажа с наценкой к официальному прайсу, но с поддержкой 24/7.",
    taglineEn: "Resale above list price, with 24/7 support.",
    features: { invoice: true, card: true, usageBased: true, trialCredit: true },
    minTopUp: { amount: 25, currency: "USD" },
    latency: 450,
    uptime: 0.993,
  },
];

const vendorDiscountFactor: Record<string, number> = {
  anthropic: 1,
  openai: 1.04,
  google: 1.08,
  xai: 1.12,
  deepseek: 1.5,
  moonshot: 1.35,
  zhipu: 1.45,
  qwen: 1.55,
};

const providers: Provider[] = providerSeeds.map((seed) => ({
  slug: seed.slug,
  name: seed.name,
  taglineRu: seed.taglineRu,
  taglineEn: seed.taglineEn,
  homepage: `https://${seed.slug}.example.com`,
  referralUrl: `https://${seed.slug}.example.com/register?aff=tokenrate`,
  referralParam: "sub_id",
  pricingUrl: `https://${seed.slug}.example.com/pricing`,
  apiBase: `https://api.${seed.slug}.example.com/v1`,
  crawlAdapter: "html-table",
  features: seed.features,
  tags: seed.vendors,
  minTopUp: seed.minTopUp ?? null,
  status: "active",
  isDemo: true,
  createdAt: new Date(NOW.getTime() - 90 * 86400000).toISOString(),
  updatedAt: ISO,
}));

const prices: PriceQuote[] = [];
let seedCounter = 1;
for (const provider of providerSeeds) {
  for (const model of models) {
    if (!provider.vendors.includes(model.vendor)) continue;
    const rand = rng((seedCounter += 7) * 2654435761);
    const factor = vendorDiscountFactor[model.vendor] ?? 1;
    const jitter = 0.88 + rand() * 0.24;
    const raw = provider.base * factor * jitter;
    const multiplier = Math.min(1.15, Math.max(0.03, raw));
    const input = round(model.official.input * multiplier, 4);
    const output = round(model.official.output * multiplier, 4);
    prices.push({
      providerSlug: provider.slug,
      modelSlug: model.slug,
      input,
      output,
      cacheRead: model.official.cacheRead
        ? round(model.official.cacheRead * multiplier * (0.9 + rand() * 0.2), 4)
        : null,
      cacheWrite:
        model.official.cacheWrite && model.vendor === "anthropic"
          ? round(model.official.cacheWrite * multiplier, 4)
          : null,
      sourceUrl: `https://${provider.slug}.example.com/pricing`,
      observedAt: new Date(NOW.getTime() - Math.floor(rand() * 6) * 86400000)
        .toISOString()
        .slice(0, 10),
      note: "demo",
    });
  }
}

const submissions: Submission[] = [
  {
    id: "s1demo",
    name: "RelayHub",
    homepage: "https://relayhub.example.com",
    referralUrl: "https://relayhub.example.com/ref/tokenrate",
    contactEmail: "ops@relayhub.example.com",
    message: "Продаём Claude и GPT, Alipay + крипта, минимальный депозит $1.",
    status: "new",
    createdAt: new Date(NOW.getTime() - 2 * 86400000).toISOString(),
  },
  {
    id: "s2demo",
    name: "ModelDeck",
    homepage: "https://modeldeck.example.com",
    contactEmail: "hello@modeldeck.example.com",
    message: "Хотим попасть в индекс, есть реферальная программа 15%.",
    status: "new",
    createdAt: new Date(NOW.getTime() - 5 * 86400000).toISOString(),
  },
];

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const force = process.argv.includes("--force");
  const files: [string, unknown][] = [
    ["vendors.json", vendors],
    ["models.json", models],
    ["providers.json", providers],
    ["prices.json", prices],
    ["submissions.json", submissions],
  ];
  // Seed is a demo generator: never overwrite real providers or crawler quotes.
  const existing = await fs
    .readFile(path.join(OUT, "providers.json"), "utf8")
    .then((raw) => JSON.parse(raw) as { isDemo?: boolean }[])
    .catch(() => []);
  if (!force && existing.some((provider) => provider.isDemo === false)) {
    console.log("data already holds real providers; skipping seed (use --force to overwrite)");
    return;
  }
  for (const [name, payload] of files) {
    await fs.writeFile(
      path.join(OUT, name),
      `${JSON.stringify(payload, null, 2)}\n`,
      "utf8",
    );
  }

  // Demo monitoring history: 7 days of hourly probes per provider so the
  // uptime/latency UI has something to render before the crawler runs.
  const probeLines: string[] = [];
  let probeSeed = 42;
  for (const provider of providerSeeds) {
    const rand = rng((probeSeed += 13) * 2654435761);
    for (let hour = 7 * 24; hour >= 0; hour -= 1) {
      const at = new Date(NOW.getTime() - hour * 3_600_000).toISOString();
      const ok = rand() < provider.uptime;
      const latencyMs = Math.round(
        provider.latency * (0.7 + rand() * 0.8) * (ok ? 1 : 1.6),
      );
      probeLines.push(
        JSON.stringify({
          providerSlug: provider.slug,
          at,
          ok,
          status: ok ? 200 : rand() < 0.5 ? 502 : null,
          latencyMs,
          ...(ok ? {} : { error: "demo" }),
        }),
      );
    }
  }
  await fs.writeFile(path.join(OUT, "probes.jsonl"), `${probeLines.join("\n")}\n`, "utf8");

  console.log(
    `seed: ${vendors.length} vendors, ${models.length} models, ${providers.length} providers, ${prices.length} quotes, ${probeLines.length} probes`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
