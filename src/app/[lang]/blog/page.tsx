import Link from "next/link";
import { ProsePage, legalMeta } from "@/components/prose-page";
import { dictionaries } from "@/lib/i18n";
import { articles } from "@/lib/articles";
import { isLang, site } from "@/lib/site";

export const generateMetadata = legalMeta((dict) => ({
  title: dict.blog.title,
  intro: dict.blog.subtitle,
}), "blog");

export default async function BlogPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ru";
  const dict = dictionaries[lang];

  return (
    <ProsePage
      title={dict.blog.title}
      intro={dict.blog.subtitle}
      footer={
        <div className="space-y-3">
          {articles.map((a) => {
            const copy = a[lang];
            return (
              <Link key={a.slug} href={`/${lang}/blog/${a.slug}`} className="card block p-5 row-hover">
                <h2 className="text-[15px] font-semibold">{copy.title}</h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{copy.description}</p>
                <p className="mt-2 text-[11.5px] text-muted">{a.publishedAt}</p>
              </Link>
            );
          })}
          <p className="text-[12.5px] text-muted">
            {lang === "ru"
              ? "Есть идея темы? Напишите на "
              : "Got a topic idea? Write to "}
            <a href={`mailto:${site.email}`} className="text-brand underline underline-offset-2">
              {site.email}
            </a>
            .
          </p>
        </div>
      }
    />
  );
}
