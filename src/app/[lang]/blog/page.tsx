import Link from "next/link";
import { ProsePage, legalMeta } from "@/components/prose-page";
import { dictionaries } from "@/lib/i18n";
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
        <div className="card p-6">
          <p className="text-[13.5px] text-muted">{dict.blog.empty}</p>
          <p className="mt-2 text-[12.5px] text-muted">
            {lang === "ru"
              ? "Пока собираем цены — статьи появятся вместе с первыми разборами провайдеров. Есть идея темы? Напишите на "
              : "We are still collecting prices — posts will land with the first provider breakdowns. Got a topic? Write to "}
            <a href={`mailto:${site.email}`} className="text-brand underline underline-offset-2">
              {site.email}
            </a>
            .
          </p>
          <Link href={`/${lang}/models`} className="btn btn-ghost mt-4 !py-1.5 !text-[12.5px]">
            {dict.nav.models} →
          </Link>
        </div>
      }
    />
  );
}
