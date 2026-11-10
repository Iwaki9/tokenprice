"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { money, pct } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import type { Lang } from "@/lib/site";
import { Empty, MonitorBadge, VendorMark } from "./ui";
import type { MonitorStatus } from "@/lib/monitoring";

export type ProviderCard = {
  slug: string;
  name: string;
  tagline: string;
  tags: string[];
  features: Record<string, boolean | undefined>;
  minTopUp: { amount: number; currency: string } | null;
  modelsCount: number;
  bestSaving: number;
  status: MonitorStatus;
  uptime7d: number | null;
  isDemo: boolean;
};

type Sort = "models" | "name" | "discount";

export function ProviderList({
  lang,
  dict,
  providers,
}: {
  lang: Lang;
  dict: Dictionary;
  providers: ProviderCard[];
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("models");
  const term = query.trim().toLowerCase();

  const items = useMemo(() => {
    const filtered = providers.filter(
      (provider) =>
        !term ||
        provider.name.toLowerCase().includes(term) ||
        provider.slug.includes(term) ||
        provider.tags.some((tag) => tag.toLowerCase().includes(term)),
    );
    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "discount") return b.bestSaving - a.bestSaving;
      return b.modelsCount - a.modelsCount;
    });
  }, [providers, term, sort]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={dict.providers.searchPlaceholder}
          className="input max-w-sm"
          type="search"
        />
        <div className="flex items-center gap-2 text-[12.5px] text-muted">
          <span>{dict.providers.sortBy}</span>
          {(
            [
              ["models", dict.providers.sortByModels],
              ["discount", dict.providers.sortByCheapest],
              ["name", dict.providers.sortByName],
            ] as [Sort, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              className={`chip !py-1 !text-[12px] ${sort === key ? "!border-ink !bg-ink !text-white" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? <Empty>{dict.providers.empty}</Empty> : null}

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((provider) => (
          <article key={provider.slug} className="card flex flex-col p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <VendorMark name={provider.name} size={26} />
                <div>
                  <Link
                    href={`/${lang}/providers/${provider.slug}`}
                    className="link-underline text-[14.5px] font-medium"
                  >
                    {provider.name}
                  </Link>
                  <div className="mt-0.5">
                    <MonitorBadge
                      status={provider.status}
                      lang={lang}
                      uptime={provider.uptime7d}
                    />
                  </div>
                </div>
              </div>
              {provider.bestSaving > 0 ? (
                <span
                  className="tick rounded-full px-2 py-[2px] text-[11.5px] font-semibold"
                  style={{ background: "var(--color-save-soft)", color: "var(--color-save)" }}
                >
                  −{pct(provider.bestSaving)}
                </span>
              ) : null}
            </div>

            <p className="mt-3 line-clamp-2 text-[12.5px] leading-relaxed text-muted">
              {provider.tagline}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {provider.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-canvas px-1.5 py-[2px] text-[10.5px] uppercase tracking-wider text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-line pt-3 text-[11.5px] text-muted">
              <span>
                {provider.modelsCount} {dict.providers.modelsCount}
              </span>
              {provider.minTopUp ? (
                <span>
                  {dict.provider.minTopUp}: {money(provider.minTopUp.amount, provider.minTopUp.currency)}
                </span>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
