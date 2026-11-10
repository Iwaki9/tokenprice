import { ProsePage, legalMeta } from "@/components/prose-page";
import { dictionaries } from "@/lib/i18n";
import { isLang } from "@/lib/site";

export const generateMetadata = legalMeta((dict) => ({
  title: dict.legal.privacyTitle,
  intro: dict.legal.privacyIntro,
}), "privacy-policy");

export default async function PrivacyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ru";
  const dict = dictionaries[lang];
  return (
    <ProsePage
      title={dict.legal.privacyTitle}
      intro={dict.legal.privacyIntro}
      sections={[...dict.legal.privacySections]}
    />
  );
}
