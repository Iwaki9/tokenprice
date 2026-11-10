"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Dictionary } from "@/lib/i18n";
import type { Lang } from "@/lib/site";

type Props = {
  lang: Lang;
  dict: Dictionary;
};

const LOGO = (
  <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
    <rect width="26" height="26" rx="8" fill="#4b45d6" />
    <path
      d="M7 17.5 11 11.5l3 3.5 5-7"
      stroke="#fff"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <circle cx="19" cy="8" r="2" fill="#fff" />
  </svg>
);

export function SiteHeader({ lang, dict }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const path = pathname ?? `/${lang}`;

  const links = [
    { href: `/${lang}/compare`, label: dict.nav.compare },
    { href: `/${lang}/models`, label: dict.nav.models },
    { href: `/${lang}/providers`, label: dict.nav.providers },
    { href: `/${lang}/check`, label: dict.nav.check },
    { href: `/${lang}/blog`, label: dict.nav.blog },
  ];

  const rest = path.replace(/^\/(ru|en)/, "");
  const otherLang: Lang = lang === "ru" ? "en" : "ru";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="wrap flex h-16 items-center gap-6">
        <Link href={`/${lang}`} className="flex items-center gap-2.5 focus-ring">
          {LOGO}
          <span className="text-[17px] font-semibold tracking-tight text-brand">
            TokenRate
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active = path === link.href || path.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`focus-ring rounded-full px-3 py-1.5 text-[14px] transition-colors ${
                  active
                    ? "bg-brand-soft text-brand-ink"
                    : "text-ink/75 hover:bg-white hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href={`/${otherLang}${rest || ""}`}
            aria-label={dict.footer.language}
            className="focus-ring hidden rounded-full border border-line bg-white px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted hover:text-ink sm:inline-flex"
          >
            {otherLang}
          </Link>
          <Link
            href={`/${lang}/submit`}
            className="btn btn-primary hidden !px-4 !py-2 text-[13px] sm:inline-flex"
          >
            {dict.nav.submit}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="focus-ring rounded-lg border border-line bg-white p-2 md:hidden"
            aria-expanded={open}
            aria-label="Menu"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-line bg-white md:hidden">
          <nav className="wrap flex flex-col py-2">
            {[...links, { href: `/${lang}/submit`, label: dict.nav.submit }].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2.5 text-[15px] hover:bg-canvas"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={`/${otherLang}${rest || ""}`}
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-2.5 text-[15px] uppercase tracking-wider text-muted hover:bg-canvas"
            >
              {otherLang}
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
