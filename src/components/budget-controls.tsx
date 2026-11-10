"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { usd } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { MIX_PRESETS } from "@/lib/ranking";
import type { Lang } from "@/lib/site";

export function BudgetControls({
  lang,
  dict,
  budget,
  mix,
}: {
  lang: Lang;
  dict: Dictionary;
  budget: number;
  mix: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(budget);

  useEffect(() => setValue(budget), [budget]);

  const apply = (nextBudget: number, nextMix: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("budget", String(nextBudget));
    params.set("mix", nextMix);
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="card p-4 md:p-5" data-pending={pending ? "1" : "0"}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">{dict.model.budgetTitle}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="display text-[32px] leading-none">{usd(value, { compact: true })}</span>
            <span className="text-[12px] text-muted">{dict.model.budgetLabel}</span>
          </div>
        </div>
        <label className="flex items-center gap-2 text-[12.5px] text-muted">
          $
          <input
            type="number"
            min={5}
            max={100000}
            step={5}
            value={value}
            onChange={(event) => setValue(Number(event.target.value) || 0)}
            onBlur={() => apply(Math.max(5, value), mix)}
            onKeyDown={(event) => {
              if (event.key === "Enter") apply(Math.max(5, value), mix);
            }}
            className="input !w-28 !py-1.5 text-right tick"
            aria-label={dict.model.budgetLabel}
          />
        </label>
      </div>

      <input
        type="range"
        min={10}
        max={1000}
        step={10}
        value={Math.min(1000, Math.max(10, value))}
        onChange={(event) => setValue(Number(event.target.value))}
        onMouseUp={() => apply(Math.max(5, value), mix)}
        onTouchEnd={() => apply(Math.max(5, value), mix)}
        onKeyUp={() => apply(Math.max(5, value), mix)}
        className="mt-4 w-full accent-[#4b45d6]"
        aria-label={dict.model.budgetLabel}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        {MIX_PRESETS.map((preset) => {
          const active = preset.id === mix;
          const label = dict.model.mix[preset.id as keyof Dictionary["model"]["mix"]];
          const description =
            dict.model.mixDesc[preset.id as keyof Dictionary["model"]["mixDesc"]];
          return (
            <button
              key={preset.id}
              type="button"
              title={description}
              onClick={() => apply(value, preset.id)}
              aria-pressed={active}
              className={`chip transition-colors ${
                active ? "!border-brand !bg-brand-soft !text-brand-ink" : ""
              }`}
            >
              {label}
              <span className="tick text-[11px] text-muted">
                {preset.id === "doc" ? "50:3" : `${Math.round(preset.ratio)}:1`}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[11.5px] text-muted">
        {dict.model.patternNote} ·{" "}
        {dict.model.mixDesc[mix as keyof Dictionary["model"]["mixDesc"]] ?? ""}
      </p>
    </div>
  );
}
