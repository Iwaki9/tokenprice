import Link from "next/link";
import type { Dictionary } from "@/lib/i18n";
import type { Lang } from "@/lib/site";
import { site } from "@/lib/site";

export function SiteFooter({ lang, dict }: { lang: Lang; dict: Dictionary }) {
  const explore = [
    { href: `/${lang}/compare`, label: dict.nav.compare },
    { href: `/${lang}/models`, label: dict.nav.models },
    { href: `/${lang}/providers`, label: dict.nav.providers },
    { href: `/${lang}/check`, label: dict.nav.check },
  ];
  const resources = [
    { href: `/${lang}/blog`, label: dict.nav.blog },
    { href: `/${lang}/methodology`, label: dict.nav.methodology },
    { href: `/${lang}/submit`, label: dict.nav.submit },
  ];
  const legal = [
    { href: `/${lang}/privacy-policy`, label: lang === "ru" ? "Политика конфиденциальности" : "Privacy policy" },
    { href: `/${lang}/terms-of-use`, label: lang === "ru" ? "Условия использования" : "Terms of use" },
    { href: `/${lang}/disclaimer`, label: lang === "ru" ? "Дисклеймер" : "Disclaimer" },
    { href: `/${lang}/contact`, label: dict.footer.contact },
  ];

  return (
    <footer className="mt-24 border-t border-line bg-white">
      <div className="wrap grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <div className="flex items-center gap-2.5">
            <svg width="22" height="22" viewBox="0 0 26 26" aria-hidden="true">
              <rect width="26" height="26" rx="8" fill="#4b45d6" />
              <path d="M7 17.5 11 11.5l3 3.5 5-7" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <span className="text-[16px] font-semibold text-brand">TokenRate</span>
          </div>
          <p className="mt-3 max-w-xs text-[13.5px] leading-relaxed text-muted">
            {dict.footer.tagline}
          </p>
          <p className="mt-4 max-w-xs text-[12px] leading-relaxed text-muted/80">
            {dict.footer.referral}
          </p>
        </div>

        <FooterColumn title={dict.footer.explore} links={explore} />
        <FooterColumn title={dict.footer.resources} links={resources} />
        <FooterColumn title={dict.footer.legal} links={legal} />
      </div>

      <div className="border-t border-line">
        <div className="wrap flex flex-col gap-2 py-5 text-[12px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name}. {dict.footer.rights}
          </p>
          <p className="text-muted/80">{dict.footer.dataNote}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
        {title}
      </h2>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="link-underline text-[13.5px] text-ink/80 hover:text-ink"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
