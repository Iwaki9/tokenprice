export const site = {
  name: "TokenRate",
  domain: "tokenprice.rest",
  defaultLang: "ru" as const,
  /** Public contact address shown on legal pages and the submission form. */
  email: "hello@tokenprice.rest",
  social: "@tokenrate",
};

export const LANGS = ["ru", "en"] as const;
export type Lang = (typeof LANGS)[number];

export function isLang(value: string): value is Lang {
  return (LANGS as readonly string[]).includes(value);
}
