"use client";

import { useMemo, useState } from "react";
import { money, pct, tokens, usd } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { requestCost, monthlyCost } from "@/lib/ranking";

type Option = {
  slug: string;
  name: string;
  input: number;
  output: number;
  isDemo: boolean;
};

export function CostEstimator({
  dict,
  options,
  official,
}: {
  dict: Dictionary;
  options: Option[];
  official: { name: string; input: number; output: number };
}) {
  const [slug, setSlug] = useState(options[0]?.slug ?? "official");
  const [inputTokens, setInputTokens] = useState(1200);
  const [outputTokens, setOutputTokens] = useState(500);
  const [perDay, setPerDay] = useState(200);

  const selected = options.find((o) => o.slug === slug) ?? null;
  const quote = selected ?? official;

  const perRequest = useMemo(
    () => requestCost(quote, inputTokens, outputTokens),
    [quote, inputTokens, outputTokens],
  );
  const perMonth = monthlyCost(perRequest, perDay);

  const officialPerRequest = requestCost(official, inputTokens, outputTokens);
  const saving = officialPerRequest > 0 ? 1 - perRequest / officialPerRequest : 0;

  return (
    <div className="card p-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-[12px] text-muted">{dict.model.perRequestInput}</span>
          <input
            type="number"
            min={0}
            step={100}
            value={inputTokens}
            onChange={(event) => setInputTokens(Math.max(0, Number(event.target.value) || 0))}
            className="input mt-1 tick"
          />
        </label>
        <label className="block">
          <span className="text-[12px] text-muted">{dict.model.perRequestOutput}</span>
          <input
            type="number"
            min={0}
            step={100}
            value={outputTokens}
            onChange={(event) => setOutputTokens(Math.max(0, Number(event.target.value) || 0))}
            className="input mt-1 tick"
          />
        </label>
        <label className="block">
          <span className="text-[12px] text-muted">{dict.model.perRequestDay}</span>
          <input
            type="number"
            min={0}
            step={10}
            value={perDay}
            onChange={(event) => setPerDay(Math.max(0, Number(event.target.value) || 0))}
            className="input mt-1 tick"
          />
        </label>
      </div>

      <div className="mt-4">
        <label className="block">
          <span className="text-[12px] text-muted">{dict.model.colProvider}</span>
          <select
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            className="input mt-1"
          >
            <option value="official">{dict.model.perRequestOfficial}</option>
            {options.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.name} · {usd(option.input)} / {usd(option.output)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-canvas p-4">
        <div>
          <p className="text-[11.5px] text-muted">{dict.model.perRequestCost}</p>
          <p className="display mt-1 text-[26px] leading-none tick">
            {money(perRequest, "USD")}
          </p>
        </div>
        <div>
          <p className="text-[11.5px] text-muted">{dict.model.perRequestMonth}</p>
          <p className="display mt-1 text-[26px] leading-none tick">
            {money(perMonth, "USD")}
          </p>
        </div>
      </div>

      <p className="mt-3 text-[12px] text-muted">
        {selected ? `${selected.name} · ` : `${dict.model.perRequestOfficial} · `}
        {saving > 0 ? (
          <span style={{ color: "var(--color-save)" }}>−{pct(saving)}</span>
        ) : (
          <span>+{pct(Math.abs(saving))}</span>
        )}{" "}
        · {tokens(inputTokens)} / {tokens(outputTokens)}
      </p>
    </div>
  );
}
