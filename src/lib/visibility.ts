import type { MonitorStats } from "./monitoring";
import { readStatsMap } from "./monitoring";
import { getDb } from "./store";
import type { PriceQuote, Provider } from "./types";

/**
 * Visibility gate for the public site.
 * A provider is listable when ALL of these hold:
 * 1. admin status is "active";
 * 2. it is NOT a demo entry — the public site shows real providers only;
 * 3. a referral URL is configured — until you sign up for the partner
 *    programme, the provider stays in the directory (admin) but off the site;
 * 4. it is confirmed reachable: a successful health probe or a crawled quote
 *    within FRESH_MS.
 * Admin pages always see everything.
 */

const FRESH_MS = 36 * 60 * 60 * 1000;

function isFresh(iso: string | null | undefined, now: number): boolean {
  if (!iso) return false;
  const stamp = Date.parse(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  return Number.isFinite(stamp) && now - stamp < FRESH_MS;
}

export type ListableContext = {
  stats: MonitorStats | null;
  quotes: PriceQuote[];
  now?: number;
};

export function isListable(provider: Provider, ctx: ListableContext): boolean {
  if (provider.status !== "active") return false;
  if (provider.isDemo) return false;
  if (!provider.referralUrl) return false;
  const now = ctx.now ?? Date.now();
  const probeOk = !!ctx.stats?.lastOkAt && isFresh(ctx.stats.lastOkAt, now);
  const quoteOk = ctx.quotes.some((q) => isFresh(q.observedAt, now));
  // Subscription providers don't have crawled per-token quotes;
  // gate on active + referralUrl alone.
  const subscriptionOk =
    provider.billingModel !== undefined && provider.status === "active" && !!provider.referralUrl;
  return probeOk || quoteOk || subscriptionOk;
}

export function reasonNotListable(provider: Provider, ctx: ListableContext, now = Date.now()): string {
  if (provider.status !== "active") return `status=${provider.status}`;
  if (provider.isDemo) return "demo — never shown publicly";
  if (!provider.referralUrl) return "no referral url";
  const probeOk = !!ctx.stats?.lastOkAt && isFresh(ctx.stats.lastOkAt, now);
  const quoteOk = ctx.quotes.some((q) => isFresh(q.observedAt, now));
  const subscriptionOk =
    provider.billingModel !== undefined && provider.status === "active" && !!provider.referralUrl;
  if (!probeOk && !quoteOk && !subscriptionOk) return "unreachable (no fresh probe or quote)";
  return "";
}

export async function getListableProviders(): Promise<Provider[]> {
  const db = await getDb();
  const stats = await readStatsMap();
  const now = Date.now();
  return db.providers.filter((p) =>
    isListable(p, {
      stats: stats.get(p.slug) ?? null,
      quotes: db.prices.filter((q) => q.providerSlug === p.slug),
      now,
    }),
  );
}
