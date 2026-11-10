import type { Metadata } from "next";
import Link from "next/link";
import { CheckForm } from "@/components/check-form";
import { dictionaries } from "@/lib/i18n";
import { isLang } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ru";
  const dict = dictionaries[lang];
  return {
    title: dict.check.title,
    description: dict.check.subtitle,
    alternates: {
      canonical: `/${lang}/check`,
      languages: { ru: "/ru/check", en: "/en/check" },
    },
  };
}

export default async function CheckPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ru";
  const dict = dictionaries[lang];

  return (
    <div className="wrap py-10">
      <header className="max-w-2xl">
        <h1 className="display text-[38px] leading-none">{dict.check.title}</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-muted">{dict.check.subtitle}</p>
      </header>

      <div className="mt-8">
        <CheckForm dict={dict} />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 text-[13px] text-muted">
        <span>{lang === "ru" ? "Не знаете, какой провайдер дешевле?" : "Not sure which provider is cheaper?"}</span>
        <Link href={`/${lang}/models`} className="text-brand underline underline-offset-4">
          {dict.nav.models} →
        </Link>
      </div>
    </div>
  );
}
