import type { Metadata } from "next";
import { ModelCatalog } from "@/components/model-catalog";
import { dictionaries } from "@/lib/i18n";
import { buildBoard } from "@/lib/ranking";
import { getDb } from "@/lib/store";
import { isLang } from "@/lib/site";
import type { VendorView } from "@/lib/view";

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
    title: dict.models.title,
    description: dict.models.subtitle,
    alternates: {
      canonical: `/${lang}/models`,
      languages: { ru: "/ru/models", en: "/en/models" },
    },
  };
}

export default async function ModelsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ru";
  const dict = dictionaries[lang];
  const db = await getDb();

  const providers = db.providers.filter((p) => p.status === "active");
  const vendorViews: VendorView[] = db.vendors.map((v) => ({
    slug: v.slug,
    name: v.name,
    color: v.brandColor,
    mark: v.mark,
  }));

  const groups = vendorViews
    .map((vendor) => ({
      vendor,
      items: db.models
        .filter((model) => model.vendor === vendor.slug && model.status !== "retired")
        .sort((a, b) => (b.releasedAt ?? "").localeCompare(a.releasedAt ?? ""))
        .map((model) => {
          const quotes = db.prices.filter((q) => q.modelSlug === model.slug);
          const rows = buildBoard(model, providers, quotes, { budget: 100, ratio: 1 });
          return {
            slug: model.slug,
            name: model.name,
            officialInput: model.official.input,
            officialOutput: model.official.output,
            quotes: rows.length,
            bestSaving: rows[0]?.savings ?? 0,
            status: model.status,
          };
        }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="wrap py-10">
      <header className="max-w-2xl">
        <h1 className="display text-[38px] leading-none">{dict.models.title}</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-muted">{dict.models.subtitle}</p>
      </header>
      <div className="mt-8">
        <ModelCatalog lang={lang} dict={dict} groups={groups} />
      </div>
    </div>
  );
}
