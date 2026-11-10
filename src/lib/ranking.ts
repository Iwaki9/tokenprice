import type { Model, PriceQuote, Provider } from "./types";

export type MixPreset = {
  id: string;
  /** input tokens per 1 output token */
  ratio: number;
};

export const MIX_PRESETS: MixPreset[] = [
  { id: "balanced", ratio: 1 },
  { id: "questions", ratio: 2 },
  { id: "dev", ratio: 5 },
  { id: "agent", ratio: 10 },
  { id: "doc", ratio: 50 / 3 },
  { id: "rag", ratio: 3 },
];

export function mixById(id: string | undefined): MixPreset {
  return MIX_PRESETS.find((m) => m.id === id) ?? MIX_PRESETS[0];
}

/** Blended cost of 1M tokens at a given input:output ratio. */
export function blendedCost(
  input: number,
  output: number,
  ratio: number,
): number {
  return (ratio * input + output) / (ratio + 1);
}

export type BoardRow = {
  provider: Provider;
  quote: PriceQuote;
  /** tokens of each kind that the budget buys at the selected mix */
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  /** fraction saved vs the vendor's list price, 0..1 */
  savings: number;
  /** how many times more tokens than the official price */
  multiple: number;
  /** 0..1, relative to the cheapest provider on this board */
  bar: number;
};

export function buildBoard(
  model: Model,
  providers: Provider[],
  quotes: PriceQuote[],
  opts: { budget: number; ratio: number },
): BoardRow[] {
  const { budget, ratio } = opts;
  const officialBlend = blendedCost(
    model.official.input,
    model.official.output,
    ratio,
  );
  const byProvider = new Map(providers.map((p) => [p.slug, p]));

  const rows = quotes
    .filter((q) => byProvider.has(q.providerSlug))
    .map((q) => {
      const blend = blendedCost(q.input, q.output, ratio);
      const totalTokens = blend > 0 ? (budget / blend) * 1_000_000 : 0;
      return {
        provider: byProvider.get(q.providerSlug)!,
        quote: q,
        totalTokens,
        inputTokens: (totalTokens * ratio) / (ratio + 1),
        outputTokens: totalTokens / (ratio + 1),
        savings: officialBlend > 0 ? 1 - blend / officialBlend : 0,
        multiple: blend > 0 ? officialBlend / blend : 0,
        bar: 0,
      };
    })
    .sort((a, b) => b.totalTokens - a.totalTokens);

  const best = rows[0]?.totalTokens ?? 0;
  for (const row of rows) row.bar = best > 0 ? row.totalTokens / best : 0;
  return rows;
}

/** Cost of a single request, in USD. */
export function requestCost(
  quote: Pick<PriceQuote, "input" | "output">,
  inputTokens: number,
  outputTokens: number,
) {
  return (inputTokens / 1_000_000) * quote.input + (outputTokens / 1_000_000) * quote.output;
}

export function monthlyCost(perRequest: number, requestsPerDay: number) {
  return perRequest * requestsPerDay * 30.44;
}
