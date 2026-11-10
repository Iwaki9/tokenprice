import { ProsePage, legalMeta } from "@/components/prose-page";
import { dictionaries } from "@/lib/i18n";
import { isLang } from "@/lib/site";

export const generateMetadata = legalMeta((dict) => ({
  title: dict.methodology.title,
  intro: dict.methodology.subtitle,
}), "methodology");

export default async function MethodologyPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ru";
  const dict = dictionaries[lang];

  return (
    <ProsePage
      title={dict.methodology.title}
      intro={dict.methodology.subtitle}
      sections={[...dict.methodology.sections]}
    />
  );
}
