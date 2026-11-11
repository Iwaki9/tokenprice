import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoTag, MonitorBadge, SectionHead, Sparkline, VendorMark } from "@/components/ui";
import { date, dateTime, fill, latency, money, pct, usd } from "@/lib/format";
import { dictionaries } from "@/lib/i18n";
import { blendedCost } from "@/lib/ranking";
import { EMPTY_STATS, readStatsMap } from "@/lib/monitoring";
import { getDb } from "@/lib/store";
import { isLang } from "@/lib/site";
import { isListable } from "@/lib/visibility";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang: raw, slug } = await params;
  const lang = isLang(raw) ? raw : "ru";
  const db = await getDb();
  const provider = db.providers.find((p) => p.slug === slug);
  if (!provider) return { title: "404" };
  const tagline = (lang === "ru" ? provider.taglineRu : provider.taglineEn) ?? "";
  return {
    title: `${provider.name} — ${lang === "ru" ? "цены на API и условия" : "API pricing and terms"}`,
    description: `${provider.name}: ${tagline}`,
    alternates: {
      canonical: `/${lang}/providers/${slug}`,
      languages: { ru: `/ru/providers/${slug}`, en: `/en/providers/${slug}` },
    },
  };
}

export default async function ProviderPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang: raw, slug } = await params;
  const lang = isLang(raw) ? raw : "ru";
  const dict = dictionaries[lang];
  const db = await getDb();

  const provider = db.providers.find((p) => p.slug === slug);
  if (!provider) notFound();

  const vendorBySlug = new Map(db.vendors.map((v) => [v.slug, v]));
  const modelBySlug = new Map(db.models.map((m) => [m.slug, m]));
  const quotes = db.prices.filter((q) => q.providerSlug === provider.slug);

  const statsMap = await readStatsMap();
  const stats = statsMap.get(provider.slug) ?? EMPTY_STATS;

  // hidden until it has a referral link and is confirmed reachable
  if (!isListable(provider, { stats: statsMap.get(provider.slug) ?? null, quotes })) notFound();

  const groupedQuotes = new Map<string, typeof quotes>();
  for (const quote of quotes) {
    const model = modelBySlug.get(quote.modelSlug);
    if (!model) continue;
    const list = groupedQuotes.get(model.vendor) ?? [];
    list.push(quote);
    groupedQuotes.set(model.vendor, list);
  }

  let bestSaving = 0;
  for (const quote of quotes) {
    const model = modelBySlug.get(quote.modelSlug);
    if (!model) continue;
    const official = blendedCost(model.official.input, model.official.output, 1);
    const own = blendedCost(quote.input, quote.output, 1);
    if (official > 0) bestSaving = Math.max(bestSaving, 1 - own / official);
  }

  const alternatives = db.providers
    .filter(
      (p) =>
        p.slug !== provider.slug &&
        isListable(p, {
          stats: statsMap.get(p.slug) ?? null,
          quotes: db.prices.filter((q) => q.providerSlug === p.slug),
        }) &&
        p.tags.some((tag) => provider.tags.includes(tag)),
    )
    .slice(0, 3);

  const featureEntries = Object.entries(provider.features ?? {}).filter(([, value]) => value);
  const lastObserved = quotes
    .map((q) => q.observedAt ?? "")
    .sort()
    .at(-1);

  const referralHref = provider.referralUrl ? `/visit/${provider.slug}?from=profile` : provider.homepage ?? "#";

  return (
    <div className="wrap py-8">
      <nav className="mb-5 flex items-center gap-2 text-[12.5px] text-muted">
        <Link href={`/${lang}`} className="link-underline">TokenRate</Link>
        <span>/</span>
        <Link href={`/${lang}/providers`} className="link-underline">{dict.provider.breadcrumb}</Link>
        <span>/</span>
        <span className="text-ink">{provider.name}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <VendorMark name={provider.name} size={40} />
            <div>
              <h1 className="display text-[34px] leading-none">{provider.name}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <MonitorBadge status={stats.status} lang={lang} uptime={stats.uptime7d} />
                {provider.isDemo ? <DemoTag lang={lang} /> : null}
              </div>
            </div>
          </div>
          <p className="mt-4 text-[14px] leading-relaxed text-muted">
            {(lang === "ru" ? provider.taglineRu : provider.taglineEn) ?? ""}
          </p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {provider.tags.map((tag) => {
              const vendor = vendorBySlug.get(tag);
              return (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-[11.5px]"
                >
                  {vendor ? <VendorMark name={vendor.name} color={vendor.brandColor} mark={vendor.mark} size={13} /> : null}
                  {vendor?.name ?? tag}
                </span>
              );
            })}
          </div>
        </div>

        <div className="card w-full max-w-[320px] p-4">
          <a
            href={referralHref}
            target="_blank"
            rel="sponsored nofollow noopener"
            className="btn btn-primary w-full"
          >
            {dict.provider.visitSite} ↗
          </a>
          <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted">
            {provider.referralUrl ? dict.provider.referralNote : dict.provider.noReferral}
          </p>
          {provider.homepage ? (
            <p className="mt-2 truncate text-[11.5px] text-muted">
              {dict.provider.website}:{" "}
              <a href={provider.homepage} target="_blank" rel="nofollow noopener" className="underline underline-offset-2">
                {provider.homepage.replace(/^https?:\/\//, "")}
              </a>
            </p>
          ) : null}
          {provider.minTopUp ? (
            <p className="mt-1 text-[11.5px] text-muted">
              {dict.provider.minTopUp}: {money(provider.minTopUp.amount, provider.minTopUp.currency)}
            </p>
          ) : null}
          {lastObserved ? (
            <p className="mt-1 text-[11.5px] text-muted">
              {dict.provider.lastChecked}: {date(lastObserved, lang)}
            </p>
          ) : null}
        </div>
      </header>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <p className="kicker">{lang === "ru" ? "Мониторинг" : "Monitoring"}</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <p className="display text-[28px] leading-none">
                {stats.uptime7d !== null ? pct(stats.uptime7d, 2) : "—"}
              </p>
              <p className="mt-1 text-[11.5px] text-muted">
                {lang === "ru" ? "аптайм за 7 дней" : "7-day uptime"}
              </p>
            </div>
            <Sparkline data={stats.spark} width={100} height={28} />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 text-[12px]">
            <div>
              <dt className="text-muted">p95</dt>
              <dd className="tick font-medium">{latency(stats.p95)}</dd>
            </div>
            <div>
              <dt className="text-muted">{lang === "ru" ? "Индекс" : "Score"}</dt>
              <dd className="tick font-medium">{stats.composite ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">{lang === "ru" ? "Проверок / сутки" : "Checks / day"}</dt>
              <dd className="tick font-medium">{stats.samples24h}</dd>
            </div>
            <div>
              <dt className="text-muted">{lang === "ru" ? "Последняя" : "Last check"}</dt>
              <dd className="font-medium">{dateTime(stats.lastAt, lang)}</dd>
            </div>
          </dl>
        </div>

        <div className="card p-4">
          <p className="kicker">{dict.provider.paymentTitle}</p>
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12.5px]">
            {featureEntries.map(([key]) => (
              <li key={key} className="flex items-center gap-1.5">
                <span style={{ color: "var(--color-save)" }}>✓</span>
                {dict.provider.feature[key as keyof typeof dict.provider.feature] ?? key}
              </li>
            ))}
            {featureEntries.length === 0 ? <li className="text-muted">—</li> : null}
          </ul>
        </div>

        <div className="card p-4">
          <p className="kicker">{lang === "ru" ? "В индексе" : "In the index"}</p>
          <p className="display mt-2 text-[28px] leading-none">{quotes.length}</p>
          <p className="mt-1 text-[11.5px] text-muted">
            {lang === "ru" ? "моделей с ценой" : "models with a price"}
          </p>
          {bestSaving > 0 ? (
            <p className="mt-3 border-t border-line pt-3 text-[12.5px]">
              {lang === "ru" ? "Максимальная скидка" : "Best discount"}:{" "}
              <span className="tick font-semibold" style={{ color: "var(--color-save)" }}>
                −{pct(bestSaving)}
              </span>
            </p>
          ) : null}
        </div>
      </div>

      <section className="mt-10">
        <SectionHead title={dict.provider.pricingTitle} note={dict.provider.pricingNote} />
        {groupedQuotes.size === 0 ? (
          <p className="card px-4 py-8 text-center text-[13px] text-muted">{dict.provider.noQuotes}</p>
        ) : (
          <div className="space-y-6">
            {[...groupedQuotes.entries()].map(([vendorSlug, list]) => {
              const vendor = vendorBySlug.get(vendorSlug);
              return (
                <div key={vendorSlug} className="card overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
                    {vendor ? (
                      <VendorMark name={vendor.name} color={vendor.brandColor} mark={vendor.mark} size={18} />
                    ) : null}
                    <h3 className="text-[13.5px] font-semibold">{vendor?.name ?? vendorSlug}</h3>
                    <span className="text-[11.5px] text-muted">{list.length}</span>
                  </div>
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-line text-[11px] uppercase tracking-[0.06em] text-muted">
                        <th className="px-4 py-2 font-medium">{dict.provider.model}</th>
                        <th className="px-4 py-2 text-right font-medium">{dict.provider.official}</th>
                        <th className="px-4 py-2 text-right font-medium">{dict.provider.providerPrice}</th>
                        <th className="px-4 py-2 text-right font-medium">{dict.provider.diff}</th>
                        <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">
                          {dict.common.updated}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((quote) => {
                        const model = modelBySlug.get(quote.modelSlug);
                        if (!model) return null;
                        const official = blendedCost(model.official.input, model.official.output, 1);
                        const own = blendedCost(quote.input, quote.output, 1);
                        const diff = official > 0 ? 1 - own / official : 0;
                        return (
                          <tr key={quote.modelSlug} className="row-hover border-b border-line/70 last:border-0">
                            <td className="px-4 py-2.5">
                              <Link
                                href={`/${lang}/models/${model.slug}`}
                                className="link-underline font-medium"
                              >
                                {model.name}
                              </Link>
                            </td>
                            <td className="tick px-4 py-2.5 text-right text-muted">
                              {usd(model.official.input)} / {usd(model.official.output)}
                            </td>
                            <td className="tick px-4 py-2.5 text-right">
                              {usd(quote.input)} / {usd(quote.output)}
                            </td>
                            <td
                              className="tick px-4 py-2.5 text-right font-semibold"
                              style={{ color: diff > 0 ? "var(--color-save)" : "var(--color-muted)" }}
                            >
                              {diff > 0 ? `−${pct(diff)}` : `+${pct(-diff)}`}
                            </td>
                            <td className="hidden px-4 py-2.5 text-right text-[12px] text-muted sm:table-cell">
                              {quote.observedAt ? date(quote.observedAt, lang) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {alternatives.length > 0 ? (
        <section className="mt-10">
          <SectionHead title={dict.provider.alternatives} />
          <div className="grid gap-3 md:grid-cols-3">
            {alternatives.map((alt) => (
              <Link
                key={alt.slug}
                href={`/${lang}/providers/${alt.slug}`}
                className="card p-4 transition-colors hover:border-line-strong"
              >
                <div className="flex items-center gap-2">
                  <VendorMark name={alt.name} size={22} />
                  <span className="text-[13.5px] font-medium">{alt.name}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-[12px] text-muted">
                  {(lang === "ru" ? alt.taglineRu : alt.taglineEn) ?? ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {alt.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded bg-canvas px-1.5 py-[1px] text-[10.5px] uppercase tracking-wider text-muted">
                      {vendorBySlug.get(tag)?.name ?? tag}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <p className="mt-8 max-w-3xl text-[11.5px] leading-relaxed text-muted">
        {fill(dict.legal.disclaimerBody, {})}
      </p>
    </div>
  );
}
