import Link from "next/link";
import { ProsePage, legalMeta } from "@/components/prose-page";
import { dictionaries } from "@/lib/i18n";
import { isLang, site } from "@/lib/site";

export const generateMetadata = legalMeta((dict) => ({
  title: dict.legal.contactTitle,
  intro: dict.legal.contactBody,
}), "contact");

export default async function ContactPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ru";
  const dict = dictionaries[lang];

  return (
    <ProsePage
      title={dict.legal.contactTitle}
      intro={dict.legal.contactBody}
      footer={
        <div className="card p-6">
          <p className="text-[13px] text-muted">
            {lang === "ru" ? "Почта" : "Email"}:
          </p>
          <a
            href={`mailto:${site.email}`}
            className="mt-1 inline-block text-[18px] font-medium text-brand underline underline-offset-4"
          >
            {site.email}
          </a>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/${lang}/submit`} className="btn btn-primary !py-1.5 !text-[12.5px]">
              {dict.nav.submit}
            </Link>
            <Link href={`/${lang}/methodology`} className="btn btn-ghost !py-1.5 !text-[12.5px]">
              {dict.nav.methodology}
            </Link>
          </div>
        </div>
      }
    />
  );
}
