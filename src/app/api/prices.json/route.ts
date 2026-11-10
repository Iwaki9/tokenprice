import { NextResponse } from "next/server";
import { getDb } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public price feed for the CLI and third-party tools.
 * Only public catalogue data: no submissions, clicks, contact emails or referral URLs.
 */
export async function GET() {
  const db = await getDb();
  const providers = db.providers
    .filter((p) => p.status === "active" && !p.isDemo)
    .map((p) => ({ slug: p.slug, name: p.name, homepage: p.homepage ?? null }));
  const activeSlugs = new Set(providers.map((p) => p.slug));

  const models = db.models.map((m) => ({
    slug: m.slug,
    vendor: m.vendor,
    name: m.name,
    status: m.status,
    contextWindow: m.contextWindow ?? null,
    official: {
      input: m.official.input,
      output: m.official.output,
      cacheRead: m.official.cacheRead ?? null,
      cacheWrite: m.official.cacheWrite ?? null,
      sourceUrl: m.official.sourceUrl,
    },
  }));

  const quotes = db.prices
    .filter((q) => activeSlugs.has(q.providerSlug))
    .map((q) => ({
      provider: q.providerSlug,
      model: q.modelSlug,
      input: q.input,
      output: q.output,
      cacheRead: q.cacheRead ?? null,
      cacheWrite: q.cacheWrite ?? null,
      observedAt: q.observedAt ?? null,
    }));

  return NextResponse.json(
    {
      unit: "USD per 1M tokens",
      generatedAt: new Date().toISOString(),
      providers,
      models,
      quotes,
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
