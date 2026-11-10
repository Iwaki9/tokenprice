import type { Lang } from "./site";

const locale = (lang: Lang) => (lang === "ru" ? "ru-RU" : "en-US");

export function usd(value: number, opts: { compact?: boolean } = {}) {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const digits = abs === 0 ? 2 : abs < 0.01 ? 4 : abs < 1 ? 3 : 2;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: opts.compact ? 0 : digits,
    maximumFractionDigits: opts.compact ? 2 : digits,
  }).format(value);
  return `$${formatted}`;
}

export function money(value: number, currency: string) {
  const symbol =
    currency === "USD" ? "$" : currency === "CNY" ? "¥" : currency === "EUR" ? "€" : "";
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
  return symbol ? `${symbol}${formatted}` : `${formatted} ${currency}`;
}

export function tokens(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value >= 1e12) return `${trim(value / 1e12)}T`;
  if (value >= 1e9) return `${trim(value / 1e9)}B`;
  if (value >= 1e6) return `${trim(value / 1e6)}M`;
  if (value >= 1e3) return `${trim(value / 1e3)}K`;
  return `${Math.round(value)}`;
}

function trim(value: number) {
  return value >= 100 ? value.toFixed(0) : value >= 10 ? value.toFixed(1) : value.toFixed(2);
}

export function pct(fraction: number, digits = 0) {
  if (!Number.isFinite(fraction)) return "—";
  return `${(fraction * 100).toFixed(digits)}%`;
}

export function multiplier(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)}×`;
}

export function date(iso: string | undefined | null, lang: Lang) {
  if (!iso) return "—";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat(locale(lang), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function dateTime(iso: string | undefined | null, lang: Lang) {
  if (!iso) return "—";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat(locale(lang), {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function latency(ms: number | null | undefined) {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/** Replaces {name} placeholders in a dictionary string. */
export function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in values ? String(values[key]) : `{${key}}`,
  );
}
