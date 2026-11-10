/**
 * Renders a JSON-LD block for search engines. Safe to place inside a page body.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

export type FaqItem = { q: string; a: string };

export function faqJsonLd(items: FaqItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function articleJsonLd(input: {
  title: string;
  description: string;
  path: string;
  lang: "ru" | "en";
  publishedAt: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    inLanguage: input.lang === "ru" ? "ru-RU" : "en-US",
    datePublished: input.publishedAt,
    dateModified: input.publishedAt,
    author: { "@type": "Organization", name: "TokenRate" },
    publisher: { "@type": "Organization", name: "TokenRate" },
    mainEntityOfPage: `https://tokenprice.rest${input.path}`,
  };
}

export function breadcrumbJsonLd(
  crumbs: { name: string; path: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `https://tokenprice.rest${c.path}`,
    })),
  };
}
