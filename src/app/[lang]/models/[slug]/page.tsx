import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BudgetControls } from "@/components/budget-controls";
import { CostEstimator } from "@/components/cost-estimator";
import { DemoTag, MonitorBadge, SectionHead, VendorMark } from "@/components/ui";
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/components/json-ld";
import { modelFaq, modelSeoParagraph } from "@/lib/seo-copy";
import { date, fill, latency, pct, tokens, usd } from "@/lib/format";
import { dictionaries } from "@/lib/i18n";
import { buildBoard, mixById } from "@/lib/ranking";
import { computeStats, readProbes, type MonitorStats } from "@/lib/monitoring";
import { getDb } from "@/lib/store";
import { isLang } from "@/lib/site";

export const revalidate = 60;

const SORTS = {
  tokens_desc: "Токенов на бюджет",
  input_asc: "Цена входа",
  output_asc: "Цена выхода",
  savings_desc: "Скидка",
  composite_desc: "Индекс качества",
  availability_desc: "Аптайм",
  latency_asc: "Латентность",
  name_asc: "Название",
} as const;

type SortKey = keyof typeof SORTS;

function parseSort(value: string | undefined): SortKey {
  return value && value in SORTS ? (value as SortKey) : "tokens_desc";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang: raw, slug } = await params;
  const lang = isLang(raw) ? raw : "ru";
  const db = await getDb();
  const model = db.models.find((m) => m.slug === slug);
  if (!model) return { title: "404" };
  const dict = dictionaries[lang];
  return {
    title: `${model.name} ${dict.model.titleSuffix}`,
    description: fill(dict.model.intro, { model: model.name }),
    alternates: {
      canonical: `/${lang}/models/${slug}`,
      languages: {
        ru: `/ru/models/${slug}`,
        en: `/en/models/${slug}`,
      },
    },
  };
}

export default async function ModelPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang: raw, slug } = await params;
  const lang = isLang(raw) ? raw : "ru";
  const dict = dictionaries[lang];
  const query = await searchParams;

  const db = await getDb();
  const model = db.models.find((m) => m.slug === slug);
  if (!model) notFound();

  const vendor = db.vendors.find((v) => v.slug === model.vendor);
  const providers = db.providers.filter((p) => p.status === "active");
  const quotes = db.prices.filter((q) => q.modelSlug === slug);

  const budget = Math.min(100_000, Math.max(5, Number(query.budget) || 100));
  const mix = String(query.mix ?? "balanced");
  const ratio = mixById(mix).ratio;
  const sort = parseSort(typeof query.sort === "string" ? query.sort : undefined);
  const minUptime = Number(query.minUptime) || 0;
  const maxLatency = Number(query.maxLatency) || 0;

  const probes = await readProbes();
  const statsByProvider = new Map<string, MonitorStats>();
  const grouped = new Map<string, typeof probes>();
  for (const probe of probes) {
    const list = grouped.get(probe.providerSlug) ?? [];
    list.push(probe);
    grouped.set(probe.providerSlug, list);
  }
  for (const [providerSlug, list] of grouped) {
    statsByProvider.set(providerSlug, computeStats(list));
  }

  const rows = buildBoard(model, providers, quotes, { budget, ratio }).map((row) => {
    const stats = statsByProvider.get(row.provider.slug) ?? null;
    return { ...row, stats };
  });

  const filtered = rows.filter((row) => {
    if (minUptime > 0 && (row.stats?.uptime7d ?? 0) * 100 < minUptime) return false;
    if (maxLatency > 0 && (row.stats?.p95 ?? Number.POSITIVE_INFINITY) > maxLatency) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "input_asc":
        return a.quote.input - b.quote.input;
      case "output_asc":
        return a.quote.output - b.quote.output;
      case "savings_desc":
        return b.savings - a.savings;
      case "composite_desc":
        return (b.stats?.composite ?? -1) - (a.stats?.composite ?? -1);
      case "availability_desc":
        return (b.stats?.uptime7d ?? -1) - (a.stats?.uptime7d ?? -1);
      case "latency_asc":
        return (a.stats?.p95 ?? Number.POSITIVE_INFINITY) - (b.stats?.p95 ?? Number.POSITIVE_INFINITY);
      case "name_asc":
        return a.provider.name.localeCompare(b.provider.name);
      default:
        return b.totalTokens - a.totalTokens;
    }
  });

  const officialRow = {
    input: model.official.input,
    output: model.official.output,
    totalTokens: budget / ((ratio * model.official.input + model.official.output) / (ratio + 1)) * 1_000_000,
    savings: 0,
  };

  const bestSaving = rows[0]?.savings ?? 0;
  const mixLabel = dict.model.mix[mix as keyof typeof dict.model.mix] ?? mix;
  const related = db.models
    .filter((m) => m.vendor === model.vendor && m.slug !== model.slug)
    .slice(0, 6);

  const seoFacts = {
    name: model.name,
    vendor: vendor?.name ?? model.vendor,
    input: model.official.input,
    output: model.official.output,
    cacheRead: model.official.cacheRead ?? null,
    contextWindow: model.contextWindow ?? null,
    cheapest: rows[0]
      ? {
          name: rows[0].provider.name,
          input: rows[0].quote.input,
          output: rows[0].quote.output,
          savings: rows[0].savings,
          isDemo: !!rows[0].provider.isDemo,
        }
      : null,
    providerCount: rows.length,
  };
  const faqItems = modelFaq(lang, seoFacts);

  const hrefFor = (overrides: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const base: Record<string, string | number> = { budget, mix, sort };
    for (const [key, value] of Object.entries({ ...base, ...overrides })) {
      if (value !== undefined && value !== "" && value !== 0) params.set(key, String(value));
    }
    return `?${params.toString()}`;
  };

  return (
    <div className="wrap py-8">
      <nav className="mb-5 flex items-center gap-2 text-[12.5px] text-muted">
        <Link href={`/${lang}`} className="link-underline">TokenRate</Link>
        <span>/</span>
        <Link href={`/${lang}/models`} className="link-underline">{dict.model.breadcrumb}</Link>
        <span>/</span>
        <span className="text-ink">{model.name}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[12.5px] text-muted">
            <VendorMark
              name={vendor?.name ?? model.vendor}
              color={vendor?.brandColor}
              mark={vendor?.mark}
              size={18}
            />
            <span>{vendor?.name ?? model.vendor}</span>
            {model.status === "preview" ? (
              <span className="rounded bg-brand-soft px-1.5 py-[1px] text-[10.5px] font-semibold uppercase tracking-wider text-brand-ink">
                preview
              </span>
            ) : null}
          </div>
          <h1 className="display mt-2 text-[36px] leading-none sm:text-[42px]">
            {model.name}
          </h1>
          <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted">
            {lang === "ru" ? model.summaryRu ?? fill(dict.model.intro, { model: model.name }) : model.summaryEn ?? fill(dict.model.intro, { model: model.name })}
          </p>
        </div>

        <div className="card min-w-[280px] p-4">
          <p className="kicker">{dict.model.officialTitle}</p>
          <p className="mt-1 text-[11.5px] text-muted">{dict.model.officialNote}</p>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-[12.5px]">
            <div>
              <dt className="text-muted">{dict.model.input}</dt>
              <dd className="tick mt-0.5 text-[16px] font-medium">{usd(model.official.input)}</dd>
            </div>
            <div>
              <dt className="text-muted">{dict.model.output}</dt>
              <dd className="tick mt-0.5 text-[16px] font-medium">{usd(model.official.output)}</dd>
            </div>
            <div>
              <dt className="text-muted">{dict.model.cacheRead}</dt>
              <dd className="tick mt-0.5 text-[16px] font-medium">
                {model.official.cacheRead ? usd(model.official.cacheRead) : "—"}
              </dd>
            </div>
          </dl>
          <a
            href={model.official.sourceUrl}
            target="_blank"
            rel="nofollow noopener"
            className="mt-3 inline-block text-[12px] text-brand underline underline-offset-2"
          >
            {dict.model.officialLink} ↗
          </a>
        </div>
      </header>

      <div className="mt-8 grid items-start gap-4 lg:grid-cols-[1.1fr_1fr]">
        <BudgetControls lang={lang} dict={dict} budget={budget} mix={mix} />
        <div className="card flex flex-col justify-between p-5">
          <div>
            <p className="kicker">{dict.model.rankingTitle}</p>
            <p className="mt-2 text-[13px] text-muted">
              {fill(dict.model.rankingNote, {
                budget: usd(budget, { compact: true }),
                model: model.name,
                mix: mixLabel,
              })}
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-canvas p-3">
              <p className="text-[11.5px] text-muted">{dict.model.cheapest}</p>
              <p className="mt-1 text-[15px] font-medium">{rows[0]?.provider.name ?? "—"}</p>
              <p className="text-[12px] tick" style={{ color: "var(--color-save)" }}>
                {rows[0] ? `−${pct(rows[0].savings)}` : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-canvas p-3">
              <p className="text-[11.5px] text-muted">{dict.common.providers}</p>
              <p className="display mt-1 text-[22px] leading-none">{rows.length}</p>
              <p className="text-[12px] text-muted tick">
                max −{pct(bestSaving)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-10">
        <SectionHead
          title={dict.model.rankingTitle}
          note={dict.provider.pricingNote}
          action={
            <div className="flex flex-wrap gap-2">
              <FilterLink
                href={hrefFor({ minUptime: minUptime === 99 ? undefined : 99 })}
                active={minUptime === 99}
              >
                {lang === "ru" ? "Аптайм ≥ 99%" : "Uptime ≥ 99%"}
              </FilterLink>
              <FilterLink
                href={hrefFor({ maxLatency: maxLatency === 1000 ? undefined : 1000 })}
                active={maxLatency === 1000}
              >
                {lang === "ru" ? "Латентность ≤ 1 с" : "Latency ≤ 1 s"}
              </FilterLink>
            </div>
          }
        />

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-line text-[11.5px] uppercase tracking-[0.06em] text-muted">
                  <th className="w-10 px-3 py-2.5 font-medium">#</th>
                  <th className="px-3 py-2.5 font-medium">
                    <SortLink href={hrefFor({ sort: "name_asc" })} active={sort === "name_asc"}>
                      {dict.model.colProvider}
                    </SortLink>
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    <SortLink href={hrefFor({ sort: "input_asc" })} active={sort === "input_asc"}>
                      {dict.model.colInput}
                    </SortLink>
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    <SortLink href={hrefFor({ sort: "output_asc" })} active={sort === "output_asc"}>
                      {dict.model.colOutput}
                    </SortLink>
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">{dict.model.colCache}</th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    <SortLink href={hrefFor({ sort: "availability_desc" })} active={sort === "availability_desc"}>
                      {lang === "ru" ? "Аптайм" : "Uptime"}
                    </SortLink>
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    <SortLink href={hrefFor({ sort: "latency_asc" })} active={sort === "latency_asc"}>
                      {lang === "ru" ? "Латентность" : "Latency"}
                    </SortLink>
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    <SortLink href={hrefFor({ sort: "composite_desc" })} active={sort === "composite_desc"}>
                      {lang === "ru" ? "Индекс" : "Score"}
                    </SortLink>
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    <SortLink href={hrefFor({ sort: "tokens_desc" })} active={sort === "tokens_desc"}>
                      {dict.model.colTokens}
                    </SortLink>
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    <SortLink href={hrefFor({ sort: "savings_desc" })} active={sort === "savings_desc"}>
                      {dict.home.save}
                    </SortLink>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-line bg-canvas/60 text-[13px]">
                  <td className="px-3 py-2.5 text-muted">—</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <VendorMark
                        name={vendor?.name ?? model.vendor}
                        color={vendor?.brandColor}
                        mark={vendor?.mark}
                        size={18}
                      />
                      <span className="text-muted">{dict.model.officialRow}</span>
                    </div>
                  </td>
                  <td className="tick px-3 py-2.5 text-right">{usd(model.official.input)}</td>
                  <td className="tick px-3 py-2.5 text-right">{usd(model.official.output)}</td>
                  <td className="tick px-3 py-2.5 text-right">
                    {model.official.cacheRead ? usd(model.official.cacheRead) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right text-muted">—</td>
                  <td className="px-3 py-2.5 text-right text-muted">—</td>
                  <td className="px-3 py-2.5 text-right text-muted">—</td>
                  <td className="tick px-3 py-2.5 text-right">{tokens(officialRow.totalTokens)}</td>
                  <td className="tick px-3 py-2.5 text-right text-muted">0%</td>
                </tr>

                {sorted.map((row, index) => {
                  const stats = row.stats;
                  return (
                    <tr key={row.provider.slug} className="row-hover border-b border-line/70 text-[13px] last:border-0">
                      <td className="tick px-3 py-2.5 text-muted">{index + 1}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/${lang}/providers/${row.provider.slug}`}
                            className="link-underline font-medium"
                          >
                            {row.provider.name}
                          </Link>
                          {row.provider.isDemo ? <DemoTag lang={lang} /> : null}
                          {stats ? (
                            <MonitorBadge status={stats.status} lang={lang} />
                          ) : null}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[11.5px] text-muted">
                          {row.provider.minTopUp ? (
                            <span>
                              {dict.provider.minTopUp}: {row.provider.minTopUp.currency === "USD" ? "$" : "¥"}
                              {row.provider.minTopUp.amount}
                            </span>
                          ) : null}
                          {row.quote.observedAt ? (
                            <span>· {date(row.quote.observedAt, lang)}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="tick px-3 py-2.5 text-right">{usd(row.quote.input)}</td>
                      <td className="tick px-3 py-2.5 text-right">{usd(row.quote.output)}</td>
                      <td className="tick px-3 py-2.5 text-right text-muted">
                        {row.quote.cacheRead ? usd(row.quote.cacheRead) : "—"}
                      </td>
                      <td className="tick px-3 py-2.5 text-right">
                        {stats?.uptime7d !== null && stats?.uptime7d !== undefined ? pct(stats.uptime7d, 1) : "—"}
                      </td>
                      <td className="tick px-3 py-2.5 text-right">{latency(stats?.p95)}</td>
                      <td className="tick px-3 py-2.5 text-right">
                        {stats?.composite ?? "—"}
                      </td>
                      <td className="tick px-3 py-2.5 text-right font-medium">
                        {tokens(row.totalTokens)}
                      </td>
                      <td
                        className="tick px-3 py-2.5 text-right font-semibold"
                        style={{ color: row.savings > 0 ? "var(--color-save)" : "var(--color-muted)" }}
                      >
                        {row.savings > 0 ? `−${pct(row.savings)}` : pct(row.savings)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {sorted.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-muted">
              {rows.length === 0 ? dict.model.noQuotes : dict.home.emptyFilter}
            </p>
          ) : null}
        </div>

        <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
          {dict.footer.referral} {lang === "ru"
            ? "Аптайм и латентность — результаты наших проверок GET /models каждые 30 минут, а не гарантия доступности модели."
            : "Uptime and latency come from our own GET /models probes every 30 minutes, not a guarantee that the model is available."}
        </p>
      </section>

      <section className="mt-10">
        <SectionHead title={dict.model.perRequestTitle} note={dict.model.perRequestNote} />
        <CostEstimator
          dict={dict}
          official={{ name: dict.model.perRequestOfficial, input: model.official.input, output: model.official.output }}
          options={sorted.map((row) => ({
            slug: row.provider.slug,
            name: row.provider.name,
            input: row.quote.input,
            output: row.quote.output,
            isDemo: row.provider.isDemo ?? false,
          }))}
        />
      </section>

      {related.length > 0 ? (
        <section className="mt-12">
          <SectionHead title={dict.model.relatedTitle} />
          <div className="flex flex-wrap gap-2">
            {rows.length > 0 ? (
              <Link href={`/${lang}/cheapest/${model.slug}`} className="chip !border-brand !text-brand-ink">
                {lang === "ru" ? `Где ${model.name} дешевле →` : `Cheapest ${model.name} →`}
              </Link>
            ) : null}
            {related.map((item) => (
              <Link key={item.slug} href={`/${lang}/models/${item.slug}`} className="chip">
                {item.name}
                <span className="tick text-[11px] text-muted">
                  {usd(item.official.input)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-12 max-w-3xl">
        <SectionHead
          title={lang === "ru" ? "Частые вопросы" : "Frequently asked questions"}
          note={lang === "ru" ? "Ответы формируются автоматически из актуальных котировок." : "Answers are generated from the live quotes."}
        />
        <p className="mb-4 text-[13.5px] leading-relaxed text-muted">{modelSeoParagraph(lang, seoFacts)}</p>
        <div className="space-y-2">
          {faqItems.map((item) => (
            <details key={item.q} className="card px-4 py-3">
              <summary className="cursor-pointer text-[13.5px] font-medium">{item.q}</summary>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </div>
        <JsonLd data={faqJsonLd(faqItems)} />
        <JsonLd
          data={breadcrumbJsonLd([
            { name: "TokenRate", path: `/${lang}` },
            { name: lang === "ru" ? "Модели" : "Models", path: `/${lang}/models` },
            { name: model.name, path: `/${lang}/models/${model.slug}` },
          ])}
        />
      </section>
    </div>
  );
}

function SortLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`link-underline inline-flex items-center gap-1 hover:text-ink ${
        active ? "text-ink" : ""
      }`}
      style={active ? { color: "var(--color-brand)" } : undefined}
    >
      {children}
      {active ? <span aria-hidden="true">↓</span> : null}
    </Link>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`chip text-[12px] ${active ? "!border-brand !bg-brand-soft !text-brand-ink" : ""}`}
    >
      {children}
    </Link>
  );
}
