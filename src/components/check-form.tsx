"use client";

import { useState } from "react";
import type { Dictionary } from "@/lib/i18n";
import { latency as fmtLatency } from "@/lib/format";

type Result = {
  ok: boolean;
  status: number | null;
  latencyMs: number;
  endpoint: string;
  models: string[];
  hint?: string | null;
  error?: string;
  message?: string;
};

export function CheckForm({ dict }: { dict: Dictionary }) {
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!/^https?:\/\//.test(baseUrl.trim())) {
      setError(dict.check.errorUrl);
      return;
    }
    if (!apiKey.trim()) {
      setError(dict.check.errorKey);
      return;
    }

    setState("loading");
    try {
      const response = await fetch("/api/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ baseUrl, apiKey }),
      });
      const payload = (await response.json()) as Result;
      if (payload.error === "private") setError(dict.check.errorPrivate);
      else if (payload.error === "url" || payload.error === "dns") setError(dict.check.errorUrl);
      else if (!response.ok && payload.error === "rate") setError(payload.message ?? dict.common.error);
      setResult(payload);
    } catch {
      setError(dict.check.errorRequest);
    } finally {
      setState("done");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form onSubmit={submit} className="card p-5">
        <label className="block">
          <span className="text-[12.5px] font-medium">{dict.check.baseUrl}</span>
          <input
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder={dict.check.baseUrlHint}
            className="input mt-1.5 font-mono !text-[13px]"
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <label className="mt-4 block">
          <span className="text-[12.5px] font-medium">{dict.check.apiKey}</span>
          <input
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="sk-…"
            type="password"
            className="input mt-1.5 font-mono !text-[13px]"
            autoComplete="off"
            spellCheck={false}
          />
          <span className="mt-1 block text-[11.5px] text-muted">{dict.check.apiKeyHint}</span>
        </label>

        {error ? (
          <p className="mt-3 rounded-lg px-3 py-2 text-[12.5px]" style={{ background: "#fdecea", color: "#b42318" }}>
            {error}
          </p>
        ) : null}

        <button type="submit" className="btn btn-primary mt-5" disabled={state === "loading"}>
          {state === "loading" ? dict.check.checking : dict.check.button}
        </button>

        <p className="mt-4 border-t border-line pt-3 text-[11.5px] leading-relaxed text-muted">
          {dict.check.note}
        </p>
      </form>

      <div className="card p-5">
        <p className="kicker">{dict.check.resultTitle}</p>
        {!result ? (
          <p className="mt-6 text-center text-[13px] text-muted">—</p>
        ) : (
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: result.ok ? "var(--color-save)" : "var(--color-danger)" }}
              />
              <p className="text-[14px] font-medium">
                {result.ok ? dict.check.ok : dict.check.fail}
              </p>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-[12.5px]">
              <div className="rounded-lg bg-canvas p-3">
                <dt className="text-muted">{dict.check.statusLabel}</dt>
                <dd className="tick mt-0.5 text-[16px] font-medium">{result.status ?? "—"}</dd>
              </div>
              <div className="rounded-lg bg-canvas p-3">
                <dt className="text-muted">{dict.check.latencyLabel}</dt>
                <dd className="tick mt-0.5 text-[16px] font-medium">{fmtLatency(result.latencyMs)}</dd>
              </div>
            </dl>

            <p className="mt-3 break-all font-mono text-[11.5px] text-muted">{result.endpoint}</p>

            <div className="mt-4">
              <p className="text-[12px] text-muted">
                {dict.check.modelsSeen}
                {result.models.length > 0
                  ? ` · ${dict.check.modelsNote.replace("{count}", String(result.models.length))}`
                  : ""}
              </p>
              {result.models.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {result.models.slice(0, 18).map((model) => (
                    <span key={model} className="chip !py-1 font-mono !text-[11px]">
                      {model}
                    </span>
                  ))}
                  {result.models.length > 18 ? (
                    <span className="chip !py-1 !text-[11px] text-muted">
                      +{result.models.length - 18}
                    </span>
                  ) : null}
                </div>
              ) : (
                <p className="mt-1 text-[12px] text-muted">{dict.check.noModels}</p>
              )}
            </div>

            {result.hint === "auth" ? (
              <p className="mt-3 rounded-lg px-3 py-2 text-[12px]" style={{ background: "var(--color-warn-soft)", color: "var(--color-warn)" }}>
                {result.status === 401
                  ? "401 — ключ не принят. Проверьте формат ключа."
                  : "403 — ключ принят, но доступ к /models закрыт."}
              </p>
            ) : null}
            {result.error ? (
              <p className="mt-3 rounded-lg px-3 py-2 text-[12px]" style={{ background: "#fdecea", color: "#b42318" }}>
                {result.error === "timeout"
                  ? "Таймаут: эндпоинт не ответил за 9 секунд."
                  : dict.check.errorRequest}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
