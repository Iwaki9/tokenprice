import type { MonitorStats } from "./monitoring";
import { computeStats, readProbes } from "./monitoring";
import { getDb } from "./store";
import type { PriceQuote, Provider } from "./types";

/**
 * Visibility gate for the public site.
 * A provider is listable when ALL of these hold:
 * 1. admin status is "active";
 * 2. a referral URL is configured (monetisation requirement);
 * 3. it is confirmed reachable: either a successful health probe or a fresh
 *    crawled quote within FRESH_MS.
 * This lets us park many providers in the directory: they appear on the site
 * automatically once the crawler confirms them and an affiliate link is added,
 * and disappear again if they go dark. Admin pages always see everything.
 *
 * Demo entries are exempt from rule 3 only (they have no real endpoint to
 * probe) and stay visible as clearly-labelled placeholders.
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
  if (!provider.referralUrl) return false;
  if (provider.isDemo) return true;
  const now = ctx.now ?? Date.now();
  const probeOk = !!ctx.stats?.lastOkAt && isFresh(ctx.stats.lastOkAt, now);
  const quoteOk = ctx.quotes.some((q) => isFresh(q.observedAt, now));
  return probeOk || quoteOk;
}

export function reasonNotListable(provider: Provider, ctx: ListableContext, now = Date.now()): string {
  if (provider.status !== "active") return `status=${provider.status}`;
  if (!provider.referralUrl) return "no referral url";
  if (provider.isDemo) return "";
  const probeOk = !!ctx.stats?.lastOkAt && isFresh(ctx.stats.lastOkAt, now);
  const quoteOk = ctx.quotes.some((q) => isFresh(q.observedAt, now));
  if (!probeOk && !quoteOk) return "unreachable (no fresh probe or quote)";
  return "";
}

export async function getListableProviders(): Promise<Provider[]> {
  const db = await getDb();
  const probes = await readProbes();
  const grouped = new Map<string, typeof probes>();
  for (const probe of probes) {
    const list = grouped.get(probe.providerSlug) ?? [];
    list.push(probe);
    grouped.set(probe.providerSlug, list);
  }
  const now = Date.now();
  return db.providers.filter((p) =>
    isListable(p, {
      stats: (() => {
        const list = grouped.get(p.slug);
        return list ? computeStats(list) : null;
      })(),
      quotes: db.prices.filter((q) => q.providerSlug === p.slug),
      now,
    }),
  );
}
