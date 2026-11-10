import type { Metadata } from "next";
import { CompareTable } from "@/components/compare-table";
import { dictionaries } from "@/lib/i18n";
import { getDb } from "@/lib/store";
import { getListableProviders } from "@/lib/visibility";
import { isLang } from "@/lib/site";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ru";
  const dict = dictionaries[lang];
  return {
    title: dict.compare.title,
    description: dict.compare.subtitle,
    alternates: {
      canonical: `/${lang}/compare`,
      languages: { ru: "/ru/compare", en: "/en/compare" },
    },
  };
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ru";
  const dict = dictionaries[lang];
  const db = await getDb();

  const vendorBySlug = new Map(db.vendors.map((v) => [v.slug, v]));
  const providers = await getListableProviders();
  const providerBySlug = new Map(providers.map((p) => [p.slug, p]));

  const models = db.models
    .filter((m) => m.status !== "retired")
    .map((model) => ({
      slug: model.slug,
      name: model.name,
      vendorName: vendorBySlug.get(model.vendor)?.name ?? model.vendor,
      officialInput: model.official.input,
      officialOutput: model.official.output,
      quotes: db.prices.filter((q) => q.modelSlug === model.slug).length,
    }))
    .filter((model) => model.quotes > 0);

  const quotes = db.prices
    .filter((quote) => providerBySlug.has(quote.providerSlug))
    .map((quote) => ({
      providerSlug: quote.providerSlug,
      providerName: providerBySlug.get(quote.providerSlug)!.name,
      modelSlug: quote.modelSlug,
      input: quote.input,
      output: quote.output,
    }));

  const initial = models.slice(0, 3).map((model) => model.slug);

  return (
    <div className="wrap py-10">
      <header className="max-w-2xl">
        <h1 className="display text-[38px] leading-none">{dict.compare.title}</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-muted">{dict.compare.subtitle}</p>
      </header>
      <div className="mt-8">
        <CompareTable lang={lang} dict={dict} models={models} quotes={quotes} initial={initial} />
      </div>
    </div>
  );
}
