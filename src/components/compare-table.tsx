"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { pct, tokens, usd } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import type { Lang } from "@/lib/site";
import { blendedCost } from "@/lib/ranking";

type ModelOption = {
  slug: string;
  name: string;
  vendorName: string;
  officialInput: number;
  officialOutput: number;
};

type QuoteRow = {
  providerSlug: string;
  providerName: string;
  modelSlug: string;
  input: number;
  output: number;
};

export function CompareTable({
  lang,
  dict,
  models,
  quotes,
  initial,
}: {
  lang: Lang;
  dict: Dictionary;
  models: ModelOption[];
  quotes: QuoteRow[];
  initial: string[];
}) {
  const [selected, setSelected] = useState<string[]>(initial);
  const [budget, setBudget] = useState(100);

  const columns = models.filter((model) => selected.includes(model.slug));

  const table = useMemo(() => {
    const providerSet = new Map<string, { name: string; cells: Map<string, number> }>();
    for (const quote of quotes) {
      if (!selected.includes(quote.modelSlug)) continue;
      const entry = providerSet.get(quote.providerSlug) ?? {
        name: quote.providerName,
        cells: new Map<string, number>(),
      };
      const blend = blendedCost(quote.input, quote.output, 1);
      const model = models.find((m) => m.slug === quote.modelSlug);
      if (!model) continue;
      const officialBlend = blendedCost(model.officialInput, model.officialOutput, 1);
      const value = blend > 0 ? (budget / blend) * 1_000_000 : 0;
      entry.cells.set(quote.modelSlug, value);
      entry.cells.set(`${quote.modelSlug}:save`, officialBlend > 0 ? 1 - blend / officialBlend : 0);
      providerSet.set(quote.providerSlug, entry);
    }
    return [...providerSet.entries()]
      .map(([slug, entry]) => ({
        slug,
        name: entry.name,
        cells: entry.cells,
        total: columns.reduce((sum, model) => sum + (entry.cells.get(model.slug) ?? 0), 0),
      }))
      .sort((a, b) => b.total - a.total);
  }, [quotes, selected, budget, models, columns]);

  const bestByModel = new Map<string, number>();
  for (const model of columns) {
    bestByModel.set(
      model.slug,
      Math.max(...table.map((row) => row.cells.get(model.slug) ?? 0), 0),
    );
  }

  const toggle = (slug: string) =>
    setSelected((current) =>
      current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug],
    );

  return (
    <div>
      <div className="card mb-4 p-4">
        <p className="kicker">{dict.compare.addModel}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {models.map((model) => (
            <button
              key={model.slug}
              type="button"
              onClick={() => toggle(model.slug)}
              aria-pressed={selected.includes(model.slug)}
              className={`chip !text-[12px] ${
                selected.includes(model.slug) ? "!border-brand !bg-brand-soft !text-brand-ink" : ""
              }`}
            >
              {model.name}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <label className="flex items-center gap-2 text-[12.5px] text-muted">
            {dict.compare.budget}
            <input
              type="number"
              min={5}
              step={5}
              value={budget}
              onChange={(event) => setBudget(Math.max(5, Number(event.target.value) || 0))}
              className="input !w-28 !py-1.5 tick"
            />
          </label>
          <span className="text-[11.5px] text-muted">
            {lang === "ru" ? "смесь 1:1, токенов за бюджет" : "1:1 mix, tokens per budget"}
          </span>
        </div>
      </div>

      {columns.length === 0 ? (
        <p className="card px-4 py-8 text-center text-[13px] text-muted">{dict.compare.empty}</p>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11.5px] text-muted">
                  <th className="px-4 py-2.5 font-medium">{dict.model.colProvider}</th>
                  {columns.map((model) => (
                    <th key={model.slug} className="px-4 py-2.5 text-right font-medium">
                      <Link href={`/${lang}/models/${model.slug}`} className="link-underline hover:text-ink">
                        {model.name}
                      </Link>
                      <div className="text-[10.5px] font-normal">
                        {usd(model.officialInput)} / {usd(model.officialOutput)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.map((row) => (
                  <tr key={row.slug} className="row-hover border-b border-line/70 last:border-0">
                    <td className="px-4 py-2.5">
                      <Link href={`/${lang}/providers/${row.slug}`} className="link-underline font-medium">
                        {row.name}
                      </Link>
                    </td>
                    {columns.map((model) => {
                      const value = row.cells.get(model.slug);
                      const saving = row.cells.get(`${model.slug}:save`) ?? 0;
                      const best = value !== undefined && value === bestByModel.get(model.slug);
                      return (
                        <td key={model.slug} className="px-4 py-2.5 text-right">
                          {value === undefined ? (
                            <span className="text-muted">—</span>
                          ) : (
                            <>
                              <div
                                className={`tick ${best ? "font-semibold" : ""}`}
                                style={best ? { color: "var(--color-save)" } : undefined}
                              >
                                {tokens(value)}
                              </div>
                              <div className="tick text-[10.5px] text-muted">
                                {saving > 0 ? `−${pct(saving)}` : pct(saving)}
                              </div>
                            </>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
