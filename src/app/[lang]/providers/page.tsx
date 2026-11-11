import type { Metadata } from "next";
import Link from "next/link";
import { ProviderList } from "@/components/provider-list";
import { dictionaries } from "@/lib/i18n";
import { readStatsMap } from "@/lib/monitoring";
import { blendedCost } from "@/lib/ranking";
import { getDb } from "@/lib/store";
import { isListable } from "@/lib/visibility";
import { isLang } from "@/lib/site";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ru";
  const dict = dictionaries[lang];
  return {
    title: dict.providers.title,
    description: dict.providers.subtitle,
    alternates: {
      canonical: `/${lang}/providers`,
      languages: { ru: "/ru/providers", en: "/en/providers" },
    },
  };
}

export default async function ProvidersPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ru";
  const dict = dictionaries[lang];
  const db = await getDb();

  const stats = await readStatsMap();

  const modelsBySlug = new Map(db.models.map((m) => [m.slug, m]));

  const providers = db.providers
    .filter((p) =>
      isListable(p, {
        stats: stats.get(p.slug) ?? null,
        quotes: db.prices.filter((q) => q.providerSlug === p.slug),
      }),
    )
    .map((provider) => {
      const quotes = db.prices.filter((q) => q.providerSlug === provider.slug);
      let bestSaving = 0;
      for (const quote of quotes) {
        const model = modelsBySlug.get(quote.modelSlug);
        if (!model) continue;
        const official = blendedCost(model.official.input, model.official.output, 1);
        const own = blendedCost(quote.input, quote.output, 1);
        if (official > 0) bestSaving = Math.max(bestSaving, 1 - own / official);
      }
      const monitor = stats.get(provider.slug);
      return {
        slug: provider.slug,
        name: provider.name,
        tagline: (lang === "ru" ? provider.taglineRu : provider.taglineEn) ?? "",
        tags: provider.tags,
        features: provider.features,
        minTopUp: provider.minTopUp ?? null,
        modelsCount: quotes.length,
        bestSaving,
        status: monitor?.status ?? "unknown",
        uptime7d: monitor?.uptime7d ?? null,
        isDemo: provider.isDemo ?? false,
      };
    });

  return (
    <div className="wrap py-10">
      <header className="max-w-2xl">
        <h1 className="display text-[38px] leading-none">{dict.providers.title}</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-muted">{dict.providers.subtitle}</p>
      </header>

      <div className="mt-8">
        <ProviderList lang={lang} dict={dict} providers={providers} />
      </div>

      <div className="card mt-10 flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-[14px] font-medium">{dict.providers.addYours}</p>
          <p className="mt-1 text-[12.5px] text-muted">
            {lang === "ru"
              ? "Бесплатно. Мы проверяем цены и условия вручную."
              : "Free. We verify prices and terms manually."}
          </p>
        </div>
        <Link href={`/${lang}/submit`} className="btn btn-primary">
          {dict.providers.addYoursCta}
        </Link>
      </div>
    </div>
  );
}
