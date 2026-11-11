import Link from "next/link";
import { HomeBoards } from "@/components/home-boards";
import { DemoTag, StatBlock } from "@/components/ui";
import { date, usd } from "@/lib/format";
import { dictionaries } from "@/lib/i18n";
import { buildBoard } from "@/lib/ranking";
import { getDb } from "@/lib/store";
import { getListableProviders } from "@/lib/visibility";
import { isLang, site } from "@/lib/site";
import { toRowView, type BoardView, type VendorView } from "@/lib/view";

export const revalidate = 300;

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ru";
  const dict = dictionaries[lang];
  const db = await getDb();

  const providers = await getListableProviders();
  const vendorViews: VendorView[] = db.vendors.map((v) => ({
    slug: v.slug,
    name: v.name,
    color: v.brandColor,
    mark: v.mark,
  }));
  const vendorOrder = new Map(vendorViews.map((v, i) => [v.slug, i]));
  const priceByModel = new Map<string, typeof db.prices>();
  for (const quote of db.prices) {
    const list = priceByModel.get(quote.modelSlug) ?? [];
    list.push(quote);
    priceByModel.set(quote.modelSlug, list);
  }

  const models = db.models
    .filter((m) => m.featured !== false && m.status !== "retired")
    .sort((a, b) => {
      const va = vendorOrder.get(a.vendor) ?? 99;
      const vb = vendorOrder.get(b.vendor) ?? 99;
      if (va !== vb) return va - vb;
      return (b.releasedAt ?? "").localeCompare(a.releasedAt ?? "");
    });

  const boards: BoardView[] = models.map((model) => {
    const vendor = vendorViews.find((v) => v.slug === model.vendor);
    const rows = buildBoard(model, providers, priceByModel.get(model.slug) ?? [], {
      budget: 100,
      ratio: 1,
    }).map((row) =>
      toRowView(row.provider, row.quote, {
        totalTokens: row.totalTokens,
        inputTokens: row.inputTokens,
        outputTokens: row.outputTokens,
        savings: row.savings,
        multiple: row.multiple,
        bar: row.bar,
      }),
    );
    return {
      modelSlug: model.slug,
      modelName: model.name,
      vendorSlug: model.vendor,
      vendorName: vendor?.name ?? model.vendor,
      vendorColor: vendor?.color ?? "#4b45d6",
      vendorMark: vendor?.mark ?? "?",
      officialInput: model.official.input,
      officialOutput: model.official.output,
      rows,
    };
  });

  const withRows = boards.filter((b) => b.rows.length > 0);
  const hasDemo = providers.some((p) => p.isDemo);
  const newest = db.prices
    .map((q) => q.observedAt ?? "")
    .sort()
    .at(-1);

  return (
    <div>
      <section className="border-b border-line bg-white">
        <div className="wrap py-14 md:py-20">
          <p className="kicker">{dict.home.kicker}</p>
          <h1 className="display mt-4 max-w-3xl text-balance text-[42px] leading-[1.03] sm:text-[56px] md:text-[64px]">
            {dict.home.title}
          </h1>
          <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-muted">
            {dict.home.subtitle}
          </p>

          <div className="mt-10 grid max-w-2xl grid-cols-2 gap-6 border-t border-line pt-6 sm:grid-cols-4">
            <StatBlock
              value={String(db.providers.length)}
              label={dict.home.statsProviders}
            />
            <StatBlock value={String(db.models.length)} label={dict.home.statsModels} />
            <StatBlock
              value={String(db.prices.length)}
              label={dict.home.statsQuotes}
              hint={dict.home.statQuotesNote}
            />
            <StatBlock value={newest ? date(newest, lang) : "—"} label={dict.home.rankingUpdated} />
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={`/${lang}/models`} className="btn btn-primary">
              {dict.nav.models}
            </Link>
            <Link href={`/${lang}/check`} className="btn btn-ghost">
              {dict.nav.check}
            </Link>
            <Link href={`/${lang}/methodology`} className="text-[13.5px] text-muted underline underline-offset-4 hover:text-ink">
              {dict.home.howItWorks}
            </Link>
          </div>
        </div>
      </section>

      <div className="wrap py-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="display text-[28px]">{dict.home.listedTitle}</h2>
            <p className="mt-1 max-w-2xl text-[13.5px] text-muted">{dict.home.listedNote}</p>
          </div>
          {hasDemo ? (
            <p className="flex items-center gap-1.5 text-[12px] text-muted">
              <DemoTag lang={lang} />
              {lang === "ru"
                ? "котировки провайдеров сгенерированы для примера"
                : "provider quotes are generated for the demo"}
            </p>
          ) : null}
        </div>

        <HomeBoards
          lang={lang}
          dict={dict}
          boards={withRows}
          vendors={vendorViews.filter((v) => withRows.some((b) => b.vendorSlug === v.slug))}
          providerCount={providers.length}
        />
      </div>

      <section className="wrap py-10">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-6">
            <p className="kicker">{dict.nav.compare}</p>
            <h2 className="display mt-2 text-[24px]">{dict.compare.title}</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
              {dict.compare.subtitle}
            </p>
            <Link href={`/${lang}/compare`} className="btn btn-ghost mt-4">
              {dict.compare.title} →
            </Link>
          </div>
          <div className="card p-6">
            <p className="kicker">API</p>
            <h2 className="display mt-2 text-[24px]">{dict.check.title}</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
              {dict.check.subtitle}
            </p>
            <Link href={`/${lang}/check`} className="btn btn-ghost mt-4">
              {dict.check.button} →
            </Link>
          </div>
        </div>
      </section>

      <section className="wrap py-10">
        <h2 className="display text-[26px]">{dict.home.faqTitle}</h2>
        <div className="mt-4 divide-y divide-line rounded-[14px] border border-line bg-white">
          {dict.methodology.sections.map((section) => (
            <details key={section.h} className="group px-5 py-4">
              <summary className="cursor-pointer list-none text-[14.5px] font-medium marker:hidden">
                <span className="flex items-center justify-between gap-4">
                  {section.h}
                  <span className="text-muted transition-transform group-open:rotate-45">＋</span>
                </span>
              </summary>
              <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-muted">
                {section.p}
              </p>
            </details>
          ))}
        </div>
        <p className="mt-4 text-[12px] text-muted">
          {site.name} ·{" "}
          {lang === "ru" ? "цены в USD за 1M токенов" : "prices in USD per 1M tokens"}
        </p>
      </section>
    </div>
  );
}
