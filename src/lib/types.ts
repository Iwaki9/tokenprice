export type Lang = "ru" | "en";

export const LANGS: Lang[] = ["ru", "en"];

/** All prices are stored in USD per 1,000,000 tokens. */
export type OfficialPrice = {
  input: number;
  output: number;
  cacheRead?: number | null;
  cacheWrite?: number | null;
  sourceUrl: string;
};

export type Vendor = {
  slug: string;
  name: string;
  /** Short label used in chips, e.g. "Anthropic" */
  brandColor: string;
  /** Single glyph used when no logo asset is available. */
  mark: string;
};

export type Model = {
  slug: string;
  vendor: string;
  name: string;
  official: OfficialPrice;
  releasedAt?: string;
  contextWindow?: number;
  status: "ga" | "preview" | "retired";
  /** Set to exclude from homepage boards while keeping the page live. */
  featured?: boolean;
  summaryRu?: string;
  summaryEn?: string;
};

export type ProviderFeatures = {
  trialCredit?: boolean;
  invoice?: boolean;
  refunds?: boolean;
  alipay?: boolean;
  wechat?: boolean;
  crypto?: boolean;
  usageBased?: boolean;
  card?: boolean;
  mirCard?: boolean;
  sbp?: boolean;
  usdt?: boolean;
  subscription?: boolean;
};

export type ProviderPlan = {
  name: string;
  /** Monthly price in USD. */
  price: number;
  note?: string;
};

export type ProviderStatus = "active" | "hidden" | "pending";

/** Scale of the numbers a price source publishes, before normalising to USD/1M. */
export type PriceUnit = "per_token" | "per_1k" | "per_10k" | "per_1m";

/**
 * Per-provider crawl recipe. Presets cover the well-known public APIs; the
 * generic `json` adapter uses these paths when a site has its own shape.
 * Paths are dot-separated, e.g. `metadata.pricing.input_tokens`.
 */
export type CrawlConfig = {
  /** Where the array of model rows lives. Auto-detected when omitted. */
  listPath?: string;
  idPath?: string;
  inputPath?: string;
  outputPath?: string;
  cacheReadPath?: string;
  cacheWritePath?: string;
  /** Scale of the published numbers. Auto-detected when omitted. */
  unit?: PriceUnit;
  currency?: "USD" | "CNY" | "RUB";
  /** Source model id → catalogue slug, for names the matcher cannot resolve. */
  modelAliases?: Record<string, string>;
  /** `newapi` adapter: $ per 1M tokens represented by one unit of model_ratio. */
  ratioFactor?: number;
};

/**
 * `auto` sniffs the response; the named presets know a specific provider's
 * schema; `json`/`html-table`/`json-ld` are the generic fallbacks.
 */
export type CrawlAdapter =
  | "auto"
  | "json"
  | "json-ld"
  | "html-table"
  | "newapi"
  | "deepinfra"
  | "novita"
  | "chutes"
  | "sambanova"
  | "openrouter"
  | "together"
  | "kukuai"
  | "wokey"
  | "modelflare"
  | "flyrouter";

export type Provider = {
  slug: string;
  name: string;
  /** Public marketing copy shown on the provider page. */
  taglineRu?: string;
  taglineEn?: string;
  homepage?: string;
  /**
   * Outbound link used by /visit/<slug>. Put the affiliate/referral URL here;
   * it is the only link the "Visit site" buttons point at.
   */
  referralUrl?: string;
  /** Optional per-site referral parameter name, appended to referralUrl. */
  referralParam?: string;
  features: ProviderFeatures;
  tags: string[];
  minTopUp?: { amount: number; currency: string } | null;
  /** Base URL of the OpenAI-compatible API, used by the health crawler. */
  apiBase?: string;
  /** Public pricing page or JSON endpoint the price crawler reads. */
  pricingUrl?: string;
  /** Billing model: payg (pay-as-you-go), subscription, or both. */
  billingModel?: "payg" | "subscription" | "both";
  /** Subscription plans shown on the provider page. */
  plans?: ProviderPlan[];
  /** How to interpret pricingUrl. `auto` sniffs the response. */
  crawlAdapter?: CrawlAdapter;
  /** Paths/units/aliases for the crawler. Built-in presets fill this in. */
  crawlConfig?: CrawlConfig;
  status: ProviderStatus;
  isDemo?: boolean;
  contactEmail?: string;
  createdAt: string;
  updatedAt: string;
};

export type PriceQuote = {
  providerSlug: string;
  modelSlug: string;
  input: number;
  output: number;
  cacheRead?: number | null;
  cacheWrite?: number | null;
  sourceUrl?: string;
  observedAt?: string;
  note?: string;
};

export type SubmissionStatus = "new" | "approved" | "rejected";

export type Submission = {
  id: string;
  name: string;
  homepage: string;
  referralUrl?: string;
  contactEmail: string;
  message?: string;
  status: SubmissionStatus;
  createdAt: string;
};

export type ClickEvent = {
  slug: string;
  at: string;
  ref?: string;
  country?: string;
  ua?: string;
};

export type Database = {
  vendors: Vendor[];
  models: Model[];
  providers: Provider[];
  prices: PriceQuote[];
  submissions: Submission[];
};
