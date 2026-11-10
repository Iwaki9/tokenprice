import type { Metadata } from "next";
import type { Dictionary } from "@/lib/i18n";
import { dictionaries } from "@/lib/i18n";
import { isLang } from "@/lib/site";
import type { Lang } from "@/lib/site";

type Section = { h: string; p: string };

export function ProsePage({
  title,
  intro,
  sections,
  footer,
}: {
  title: string;
  intro: string;
  sections?: Section[];
  footer?: React.ReactNode;
}) {
  return (
    <div className="wrap py-12">
      <header className="max-w-2xl">
        <h1 className="display text-[38px] leading-none">{title}</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-muted">{intro}</p>
      </header>
      {sections ? (
        <div className="mt-8 max-w-3xl space-y-6">
          {sections.map((section) => (
            <section key={section.h}>
              <h2 className="text-[15px] font-semibold">{section.h}</h2>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{section.p}</p>
            </section>
          ))}
        </div>
      ) : null}
      {footer ? <div className="mt-8 max-w-3xl">{footer}</div> : null}
    </div>
  );
}

export function legalMeta(
  pick: (dict: Dictionary) => { title: string; intro: string },
  path: string,
): (props: { params: Promise<{ lang: string }> }) => Promise<Metadata> {
  return async ({ params }) => {
    const { lang: raw } = await params;
    const lang: Lang = isLang(raw) ? raw : "ru";
    const { title, intro } = pick(dictionaries[lang]);
    return {
      title,
      description: intro,
      alternates: {
        canonical: `/${lang}/${path}`,
        languages: { ru: `/ru/${path}`, en: `/en/${path}` },
      },
    };
  };
}
