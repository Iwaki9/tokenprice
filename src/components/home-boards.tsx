"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { money, pct, tokens, usd } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import type { Lang } from "@/lib/site";
import type { BoardView, VendorView } from "@/lib/view";
import { Empty, VendorMark } from "./ui";

type FilterKey =
  | "card"
  | "alipay"
  | "wechat"
  | "crypto"
  | "trial"
  | "invoice"
  | "refunds"
  | "new"
  | "subscription"
  | "mirCard";

const FILTERS: { key: FilterKey; labelKey: keyof Dictionary["home"] }[] = [
  { key: "card", labelKey: "filterPayment" },
  { key: "subscription", labelKey: "filterSubscription" },
  { key: "mirCard", labelKey: "filterMirCard" },
  { key: "trial", labelKey: "filterTrial" },
  { key: "invoice", labelKey: "filterInvoice" },
  { key: "refunds", labelKey: "filterRefunds" },
  { key: "new", labelKey: "filterNew" },
];

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export function HomeBoards({
  lang,
  dict,
  boards,
  vendors,
  providerCount,
}: {
  lang: Lang;
  dict: Dictionary;
  boards: BoardView[];
  vendors: VendorView[];
  providerCount: number;
}) {
  const [filters, setFilters] = useState<FilterKey[]>([]);
  const [vendor, setVendor] = useState<string>("all");

  const toggle = (key: FilterKey) =>
    setFilters((current) =>
      current.includes(key) ? current.filter((f) => f !== key) : [...current, key],
    );

  const matches = (row: BoardView["rows"][number]) => {
    const now = Date.now();
    return filters.every((filter) => {
      switch (filter) {
        case "new":
          return now - new Date(row.createdAt).getTime() < THIRTY_DAYS;
        case "trial":
          return Boolean(row.features.trialCredit);
        case "invoice":
          return Boolean(row.features.invoice);
        case "refunds":
          return Boolean(row.features.refunds);
        case "subscription":
          return Boolean(row.features.subscription);
        case "mirCard":
          return Boolean(row.features.mirCard || row.features.sbp);
        default:
          return Boolean(row.features?.[filter]);
      }
    });
  };

  const filteredBoards = useMemo(() => {
    return boards
      .map((board) => ({ ...board, rows: board.rows.filter(matches) }))
      .filter((board) => board.rows.length > 0)
      .filter((board) => vendor === "all" || board.vendorSlug === vendor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boards, filters, vendor]);

  const matchingProviders = useMemo(() => {
    const set = new Set<string>();
    for (const board of filteredBoards) for (const row of board.rows) set.add(row.slug);
    return set.size;
  }, [filteredBoards]);

  return (
    <>
      <div className="card mb-6 flex flex-wrap items-center gap-2 px-3 py-2.5">
        <span className="mr-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">
          {dict.home.filtersLabel}
        </span>
        {FILTERS.map((filter) => {
          const active = filters.includes(filter.key);
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => toggle(filter.key)}
              aria-pressed={active}
              className={`chip transition-colors ${
                active
                  ? "!border-brand !bg-brand-soft !text-brand-ink"
                  : "text-ink/80 hover:!border-line-strong"
              }`}
            >
              {dict.home[filter.labelKey] as string}
            </button>
          );
        })}
        {filters.length > 0 ? (
          <button
            type="button"
            onClick={() => setFilters([])}
            className="text-[12.5px] text-muted underline underline-offset-2 hover:text-ink"
          >
            {dict.home.filterClear}
          </button>
        ) : null}
        <span className="ml-auto text-[12px] text-muted">
          {matchingProviders} {dict.home.providersMatch}
        </span>
      </div>

      <div className="mb-7 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setVendor("all")}
          className={`chip ${vendor === "all" ? "!border-ink !bg-ink !text-white" : ""}`}
        >
          {dict.home.vendorAll}
        </button>
        {vendors.map((v) => (
          <button
            key={v.slug}
            type="button"
            onClick={() => setVendor(v.slug)}
            className={`chip gap-2 ${vendor === v.slug ? "!border-ink !bg-ink !text-white" : ""}`}
          >
            <VendorMark name={v.name} color={v.color} mark={v.mark} size={16} />
            {v.name}
          </button>
        ))}
      </div>

      {filteredBoards.length === 0 ? <Empty>{dict.home.emptyFilter}</Empty> : null}

      <div className="space-y-10">
        {vendors
          .filter((v) => filteredBoards.some((b) => b.vendorSlug === v.slug))
          .map((v) => {
            const items = filteredBoards.filter((b) => b.vendorSlug === v.slug);
            return (
              <section key={v.slug} id={`ranking-${v.slug}`}>
                <div className="mb-3 flex items-center gap-2.5">
                  <VendorMark name={v.name} color={v.color} mark={v.mark} size={24} />
                  <h3 className="text-[15px] font-semibold">{v.name}</h3>
                  <span className="text-[12px] text-muted">
                    {items.length} {dict.common.models}
                  </span>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {items.map((board) => (
                    <BoardCard
                      key={board.modelSlug}
                      lang={lang}
                      dict={dict}
                      board={board}
                      providerCount={providerCount}
                    />
                  ))}
                </div>
              </section>
            );
          })}
      </div>
    </>
  );
}

function BoardCard({
  lang,
  dict,
  board,
  providerCount,
}: {
  lang: Lang;
  dict: Dictionary;
  board: BoardView;
  providerCount: number;
}) {
  const rows = board.rows.slice(0, 8);
  const bestSaving = board.rows[0]?.savings ?? 0;

  return (
    <article className="card-soft overflow-hidden">
      <header className="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
        <VendorMark name={board.vendorName} color={board.vendorColor} mark={board.vendorMark} size={20} />
        <Link
          href={`/${lang}/models/${board.modelSlug}`}
          className="link-underline truncate text-[13.5px] font-medium"
        >
          {board.modelName}
        </Link>
        <span className="ml-auto hidden text-[11.5px] text-muted sm:inline tick">
          {usd(board.officialInput)} / {usd(board.officialOutput)}
        </span>
        <span
          className="rounded-full px-2 py-[2px] text-[11px] font-semibold tick"
          style={{ background: "var(--color-save-soft)", color: "var(--color-save)" }}
        >
          −{pct(bestSaving)}
        </span>
      </header>

      <ol>
        {rows.map((row, index) => (
          <li
            key={row.slug}
            className="row-hover grid grid-cols-[18px_1fr_auto] items-center gap-2.5 px-3.5 py-2"
          >
            <span className="tick text-right text-[11.5px] text-muted">{index + 1}</span>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <Link
                  href={`/${lang}/providers/${row.slug}`}
                  className="link-underline truncate text-[13px] font-medium"
                >
                  {row.name}
                </Link>
                {row.minTopUp ? (
                  <span className="hidden text-[11px] text-muted sm:inline">
                    от {money(row.minTopUp.amount, row.minTopUp.currency)}
                  </span>
                ) : null}
              </div>
              <div className="mt-1 h-[3px] w-full overflow-hidden rounded-full bg-line/70">
                <div
                  className="bar"
                  style={{ width: `${Math.max(3, row.bar * 100)}%` }}
                />
              </div>
            </div>
            <span
              className="tick text-[11.5px] font-semibold"
              style={{ color: row.savings > 0 ? "var(--color-save)" : "var(--color-muted)" }}
            >
              {row.savings > 0 ? `−${pct(row.savings)}` : pct(row.savings)}
            </span>
          </li>
        ))}
      </ol>

      <footer className="flex items-center justify-between border-t border-line px-3.5 py-2 text-[11.5px] text-muted">
        <span className="tick">
          {tokens(board.rows[0]?.inputTokens ?? 0)} {dict.home.tokens}
        </span>
        <Link
          href={`/${lang}/models/${board.modelSlug}`}
          className="link-underline font-medium text-brand"
        >
          {providerCount > board.rows.length
            ? `${dict.home.modelPage} →`
            : `${dict.home.modelPage} →`}
        </Link>
      </footer>
    </article>
  );
}
