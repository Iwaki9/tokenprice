import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHead, VendorMark, DemoTag } from "@/components/ui";
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/components/json-ld";
import { usd, pct, tokens } from "@/lib/format";
import { mixById, buildBoard } from "@/lib/ranking";
import { getDb } from "@/lib/store";
import { cheapestCopy, modelFaq } from "@/lib/seo-copy";
import { isLang, site } from "@/lib/site";

export const revalidate = 60;

async function load(slug: string) {
  const db = await getDb();
  const model = db.models.find((m) => m.slug === slug);
  if (!model) return null;
  const vendor = db.vendors.find((v) => v.slug === model.vendor);
  const providers = db.providers.filter((p) => p.status === "active");
  const quotes = db.prices.filter((q) => q.modelSlug === slug);
  const rows = buildBoard(model, providers, quotes, { budget: 100, ratio: mixById("dev").ratio });
  return { model, vendor, rows };
}

function factsFrom(model: NonNullable<Awaited<ReturnType<typeof load>>>["model"], vendorName: string, rows: NonNullable<Awaited<ReturnType<typeof load>>>["rows"]) {
  return {
    name: model.name,
    vendor: vendorName,
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
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang: raw, slug } = await params;
  const lang = isLang(raw) ? raw : "ru";
  const data = await load(slug);
  if (!data) return { title: "404" };
  const facts = factsFrom(data.model, data.vendor?.name ?? data.model.vendor, data.rows);
  const copy = cheapestCopy(lang, facts);
  return {
    title: lang === "ru" ? `Дешёвый API ${data.model.name}` : `Cheap ${data.model.name} API`,
    description: copy.intro.slice(0, 300),
    alternates: {
      canonical: `/${lang}/cheapest/${slug}`,
      languages: { ru: `/ru/cheapest/${slug}`, en: `/en/cheapest/${slug}` },
    },
  };
}

export default async function CheapestPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang: raw, slug } = await params;
  const lang = isLang(raw) ? raw : "ru";
  const data = await load(slug);
  if (!data) notFound();
  const { model, vendor, rows } = data;
  const facts = factsFrom(model, vendor?.name ?? model.vendor, rows);
  const copy = cheapestCopy(lang, facts);
  const top = rows.slice(0, 8);
  const faqItems = modelFaq(lang, facts);

  return (
    <div className="wrap py-8">
      <nav className="mb-5 flex items-center gap-2 text-[12.5px] text-muted">
        <Link href={`/${lang}`} className="link-underline">{site.name}</Link>
        <span>/</span>
        <Link href={`/${lang}/models`} className="link-underline">{lang === "ru" ? "Модели" : "Models"}</Link>
        <span>/</span>
        <Link href={`/${lang}/models/${slug}`} className="link-underline">{model.name}</Link>
        <span>/</span>
        <span className="text-ink">{lang === "ru" ? "где дешевле" : "cheapest"}</span>
      </nav>

      <h1 className="display max-w-3xl text-[32px] leading-tight sm:text-[38px]">{copy.title}</h1>
      <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted">{copy.intro}</p>

      <div className="card mt-8 overflow-hidden">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="border-b border-line text-[11.5px] uppercase tracking-[0.06em] text-muted">
              <th className="px-3 py-2.5 font-medium">#</th>
              <th className="px-3 py-2.5 font-medium">{lang === "ru" ? "Провайдер" : "Provider"}</th>
              <th className="px-3 py-2.5 text-right font-medium">1M {lang === "ru" ? "вход" : "input"}</th>
              <th className="px-3 py-2.5 text-right font-medium">1M {lang === "ru" ? "выход" : "output"}</th>
              <th className="px-3 py-2.5 text-right font-medium">{lang === "ru" ? "Скидка" : "Discount"}</th>
              <th className="px-3 py-2.5 text-right font-medium">{lang === "ru" ? "Токенов на $100" : "Tokens per $100"}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-line bg-canvas/60 text-[13px]">
              <td className="px-3 py-2.5 text-muted">—</td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <VendorMark name={vendor?.name ?? model.vendor} color={vendor?.brandColor} mark={vendor?.mark} size={18} />
                  <span className="text-muted">{lang === "ru" ? "Официальная цена" : "Official list"}</span>
                </div>
              </td>
              <td className="tick px-3 py-2.5 text-right">{usd(model.official.input)}</td>
              <td className="tick px-3 py-2.5 text-right">{usd(model.official.output)}</td>
              <td className="px-3 py-2.5 text-right text-muted">0%</td>
              <td className="tick px-3 py-2.5 text-right">{tokens((100 / ((5 * model.official.input + model.official.output) / 6)) * 1_000_000)}</td>
            </tr>
            {top.map((row, i) => (
              <tr key={row.provider.slug} className="row-hover border-b border-line/70 text-[13px] last:border-0">
                <td className="tick px-3 py-2.5 text-muted">{i + 1}</td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/${lang}/providers/${row.provider.slug}`} className="link-underline font-medium">
                      {row.provider.name}
                    </Link>
                    {row.provider.isDemo ? <DemoTag lang={lang} /> : null}
                  </div>
                </td>
                <td className="tick px-3 py-2.5 text-right">{usd(row.quote.input)}</td>
                <td className="tick px-3 py-2.5 text-right">{usd(row.quote.output)}</td>
                <td className="tick px-3 py-2.5 text-right font-semibold" style={{ color: row.savings > 0 ? "var(--color-save)" : "var(--color-muted)" }}>
                  {row.savings > 0 ? `−${pct(row.savings)}` : "—"}
                </td>
                <td className="tick px-3 py-2.5 text-right font-medium">{tokens(row.totalTokens)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-muted">
            {lang === "ru" ? "Котировок посредников пока нет — сравниваем прайсы ежедневно." : "No third-party quotes yet — we check price lists daily."}
          </p>
        ) : null}
      </div>

      <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
        {lang === "ru"
          ? "Токенов на $100 — при смешанной нагрузке «код»: 5 входных токенов на 1 выходной. Цены обновляет краулер; перед покупкой проверьте актуальность на странице провайдера."
          : "Tokens per $100 assume a “code” mix: 5 input tokens per output token. Prices are crawled; verify them on the provider page before buying."}
      </p>

      <section className="mt-10 max-w-3xl">
        <SectionHead title={lang === "ru" ? "Что проверить перед покупкой" : "What to check before buying"} />
        <ul className="list-disc space-y-1.5 pl-5 text-[13.5px] leading-relaxed text-muted">
          <li>
            {lang === "ru" ? (
              <>Проверьте ключ бесплатным <Link href={`/${lang}/check`} className="link-underline">чекером API</Link> — он покажет, что эндпоинт отвечает, без отправки токенов.</>
            ) : (
              <>Test the key with the free <Link href={`/${lang}/check`} className="link-underline">API checker</Link> — it verifies the endpoint responds, without sending tokens.</>
            )}
          </li>
          <li>
            {lang === "ru"
              ? "Сравнивайте смешанную цену под свою задачу, а не только «цену за вход»: у агентных нагрузок выходные токены дороже."
              : "Compare the blended cost for your workload, not just the input price: output tokens dominate in agent workloads."}
          </li>
          <li>
            {lang === "ru"
              ? "Смотрите на аптайм и минимальное пополнение: самый дешёвый провайдер бесполезен, если лежит полдня."
              : "Check uptime and minimum top-up: the cheapest provider is useless if it is down half the day."}
          </li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href={`/${lang}/models/${slug}`} className="btn btn-ghost !py-1.5 !text-[12.5px]">
            {lang === "ru" ? `Все котировки ${model.name} →` : `All ${model.name} quotes →`}
          </Link>
          <Link href={`/${lang}/compare`} className="btn btn-ghost !py-1.5 !text-[12.5px]">
            {lang === "ru" ? "Сравнить модели →" : "Compare models →"}
          </Link>
        </div>
        <JsonLd data={faqJsonLd(faqItems)} />
        <JsonLd
          data={breadcrumbJsonLd([
            { name: site.name, path: `/${lang}` },
            { name: lang === "ru" ? "Модели" : "Models", path: `/${lang}/models` },
            { name: model.name, path: `/${lang}/models/${slug}` },
            { name: lang === "ru" ? "где дешевле" : "cheapest", path: `/${lang}/cheapest/${slug}` },
          ])}
        />
      </section>
    </div>
  );
}
