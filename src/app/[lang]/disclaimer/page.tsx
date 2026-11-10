import { ProsePage, legalMeta } from "@/components/prose-page";
import { dictionaries } from "@/lib/i18n";
import { isLang } from "@/lib/site";

export const generateMetadata = legalMeta((dict) => ({
  title: dict.legal.disclaimerTitle,
  intro: dict.legal.disclaimerBody,
}), "disclaimer");

export default async function DisclaimerPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ru";
  const dict = dictionaries[lang];
  return (
    <ProsePage
      title={dict.legal.disclaimerTitle}
      intro={dict.legal.disclaimerBody}
    />
  );
}
