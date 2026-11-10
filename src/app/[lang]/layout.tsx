import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { dictionaries } from "@/lib/i18n";
import { isLang, site } from "@/lib/site";
import "../globals.css";

export function generateStaticParams() {
  return [{ lang: "ru" }, { lang: "en" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = dictionaries[isLang(lang) ? lang : "ru"];
  return {
    metadataBase: new URL(`https://${site.domain}`),
    title: {
      default: dict.meta.homeTitle,
      template: `%s · ${site.name}`,
    },
    description: dict.meta.homeDescription,
    alternates: {
      canonical: `/${lang}`,
      languages: { ru: "/ru", en: "/en" },
    },
    openGraph: {
      siteName: site.name,
      type: "website",
      locale: lang === "ru" ? "ru_RU" : "en_US",
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const dict = dictionaries[lang];

  return (
    <html lang={lang}>
      <body className="min-h-screen antialiased">
        <SiteHeader lang={lang} dict={dict} />
        <main>{children}</main>
        <SiteFooter lang={lang} dict={dict} />
      </body>
    </html>
  );
}
