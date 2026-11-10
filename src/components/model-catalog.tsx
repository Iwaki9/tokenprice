"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { pct, usd } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import type { Lang } from "@/lib/site";
import type { VendorView } from "@/lib/view";
import { Empty, VendorMark } from "./ui";

type Item = {
  slug: string;
  name: string;
  officialInput: number;
  officialOutput: number;
  quotes: number;
  bestSaving: number;
  status: string;
};

export function ModelCatalog({
  lang,
  dict,
  groups,
}: {
  lang: Lang;
  dict: Dictionary;
  groups: { vendor: VendorView; items: Item[] }[];
}) {
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) =>
              !term ||
              item.name.toLowerCase().includes(term) ||
              item.slug.includes(term) ||
              group.vendor.name.toLowerCase().includes(term),
          ),
        }))
        .filter((group) => group.items.length > 0),
    [groups, term],
  );

  return (
    <>
      <div className="mb-6">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={dict.models.searchPlaceholder}
          className="input max-w-sm"
          type="search"
        />
      </div>

      {filtered.length === 0 ? <Empty>{dict.providers.empty}</Empty> : null}

      <div className="space-y-8">
        {filtered.map((group) => (
          <section key={group.vendor.slug}>
            <div className="mb-3 flex items-center gap-2.5">
              <VendorMark
                name={group.vendor.name}
                color={group.vendor.color}
                mark={group.vendor.mark}
                size={22}
              />
              <h2 className="text-[15px] font-semibold">{group.vendor.name}</h2>
              <span className="text-[12px] text-muted">
                {group.items.length} {dict.common.models}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => (
                <Link
                  key={item.slug}
                  href={`/${lang}/models/${item.slug}`}
                  className="card group p-4 transition-colors hover:border-line-strong"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-[14px] font-medium group-hover:text-brand">
                      {item.name}
                    </h3>
                    {item.status === "preview" ? (
                      <span className="rounded bg-brand-soft px-1.5 py-[1px] text-[10px] font-semibold uppercase tracking-wider text-brand-ink">
                        preview
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-[11.5px] text-muted">{dict.models.officialFrom}</p>
                  <p className="tick mt-0.5 text-[15px]">
                    {usd(item.officialInput)} <span className="text-muted">/</span>{" "}
                    {usd(item.officialOutput)}
                  </p>
                  <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5 text-[11.5px] text-muted">
                    <span>
                      {item.quotes} {dict.models.quotes}
                    </span>
                    {item.bestSaving > 0 ? (
                      <span className="tick font-semibold" style={{ color: "var(--color-save)" }}>
                        −{pct(item.bestSaving)}
                      </span>
                    ) : (
                      <span>—</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
