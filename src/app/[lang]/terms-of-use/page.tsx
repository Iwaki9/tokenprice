import { ProsePage, legalMeta } from "@/components/prose-page";
import { dictionaries } from "@/lib/i18n";
import { isLang } from "@/lib/site";

export const generateMetadata = legalMeta((dict) => ({
  title: dict.legal.termsTitle,
  intro: dict.legal.termsIntro,
}), "terms-of-use");

export default async function TermsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ru";
  const dict = dictionaries[lang];
  return (
    <ProsePage
      title={dict.legal.termsTitle}
      intro={dict.legal.termsIntro}
      sections={[...dict.legal.termsSections]}
    />
  );
}
