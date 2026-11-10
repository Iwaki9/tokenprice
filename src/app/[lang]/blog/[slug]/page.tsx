import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProsePage } from "@/components/prose-page";
import { JsonLd, articleJsonLd } from "@/components/json-ld";
import { articles } from "@/lib/articles";
import { isLang } from "@/lib/site";
import Link from "next/link";

export function generateStaticParams() {
  return articles.flatMap((a) => [{ lang: "ru", slug: a.slug }, { lang: "en", slug: a.slug }]);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang: raw, slug } = await params;
  const lang = isLang(raw) ? raw : "ru";
  const article = articles.find((a) => a.slug === slug);
  if (!article) return { title: "404" };
  const copy = article[lang];
  return {
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical: `/${lang}/blog/${slug}`,
      languages: { ru: `/ru/blog/${slug}`, en: `/en/blog/${slug}` },
    },
    openGraph: { type: "article", publishedTime: article.publishedAt, title: copy.title, description: copy.description },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang: raw, slug } = await params;
  const lang = isLang(raw) ? raw : "ru";
  const article = articles.find((a) => a.slug === slug);
  if (!article) notFound();
  const copy = article[lang];

  return (
    <div>
      <ProsePage
        title={copy.title}
        intro={copy.intro}
        sections={copy.sections}
        footer={
          <div className="card p-6">
            <p className="text-[12.5px] text-muted">
              {(lang === "ru" ? "Опубликовано " : "Published ")}
              {article.publishedAt}
              {lang === "ru" ? ". Цены — официальные прайсы вендоров на дату публикации; актуальные котировки — в каталоге." : ". Prices are vendor list prices on the publish date; live quotes are in the catalogue."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/${lang}/models`} className="btn btn-ghost !py-1.5 !text-[12.5px]">
                {lang === "ru" ? "Каталог моделей →" : "Model catalogue →"}
              </Link>
              <Link href={`/${lang}/compare`} className="btn btn-ghost !py-1.5 !text-[12.5px]">
                {lang === "ru" ? "Сравнить цены →" : "Compare prices →"}
              </Link>
              <Link href={`/${lang}/check`} className="btn btn-ghost !py-1.5 !text-[12.5px]">
                {lang === "ru" ? "Проверить ключ →" : "Check your key →"}
              </Link>
            </div>
          </div>
        }
      />
      <JsonLd
        data={articleJsonLd({
          title: copy.title,
          description: copy.description,
          path: `/${lang}/blog/${slug}`,
          lang,
          publishedAt: article.publishedAt,
        })}
      />
    </div>
  );
}
