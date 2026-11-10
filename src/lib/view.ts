import type { Model, PriceQuote, Provider } from "./types";

export type RowView = {
  slug: string;
  name: string;
  features: Provider["features"];
  isDemo: boolean;
  input: number;
  output: number;
  cacheRead: number | null;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  savings: number;
  multiple: number;
  bar: number;
  minTopUp: Provider["minTopUp"];
  observedAt?: string;
  createdAt: string;
};

export type BoardView = {
  modelSlug: string;
  modelName: string;
  vendorSlug: string;
  vendorName: string;
  vendorColor: string;
  vendorMark: string;
  officialInput: number;
  officialOutput: number;
  rows: RowView[];
};

export type VendorView = { slug: string; name: string; color: string; mark: string };

export function toRowView(
  provider: Provider,
  quote: PriceQuote,
  metrics: { totalTokens: number; inputTokens: number; outputTokens: number; savings: number; multiple: number; bar: number },
): RowView {
  return {
    slug: provider.slug,
    name: provider.name,
    features: provider.features,
    isDemo: provider.isDemo ?? false,
    input: quote.input,
    output: quote.output,
    cacheRead: quote.cacheRead ?? null,
    minTopUp: provider.minTopUp ?? null,
    observedAt: quote.observedAt,
    createdAt: provider.createdAt,
    ...metrics,
  };
}

export function vendorList(models: Model[]): VendorView[] {
  const seen = new Map<string, VendorView>();
  for (const model of models) {
    if (seen.has(model.vendor)) continue;
    seen.set(model.vendor, {
      slug: model.vendor,
      name: model.vendor,
      color: "#4b45d6",
      mark: model.vendor.slice(0, 1).toUpperCase(),
    });
  }
  return [...seen.values()];
}
