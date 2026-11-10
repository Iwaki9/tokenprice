import type { Metadata } from "next";
import { SubmitForm } from "@/components/submit-form";
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
    title: dict.submit.title,
    description: dict.submit.subtitle,
    alternates: {
      canonical: `/${lang}/submit`,
      languages: { ru: "/ru/submit", en: "/en/submit" },
    },
  };
}

export default async function SubmitPage({
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
        <h1 className="display text-[38px] leading-none">{dict.submit.title}</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-muted">{dict.submit.subtitle}</p>
      </header>
      <div className="mt-8">
        <SubmitForm dict={dict} />
      </div>
    </div>
  );
}
