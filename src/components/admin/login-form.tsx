"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions/admin";
import type { Dictionary } from "@/lib/i18n";
import type { Lang } from "@/lib/site";

export function AdminLogin({
  lang,
  dict,
  defaultPassword,
}: {
  lang: Lang;
  dict: Dictionary;
  defaultPassword: boolean;
}) {
  const [state, action, pending] = useActionState(loginAction, {} as { error?: string });

  return (
    <div className="mx-auto max-w-sm py-20">
      <div className="card p-6">
        <h1 className="display text-[26px]">{dict.admin.title}</h1>
        <p className="mt-1 text-[12.5px] text-muted">{dict.admin.login}</p>

        <form action={action} className="mt-5">
          <input type="hidden" name="lang" value={lang} />
          <label className="block">
            <span className="text-[12.5px] font-medium">{dict.admin.password}</span>
            <input
              name="password"
              type="password"
              autoFocus
              className="input mt-1.5"
              required
            />
          </label>
          {state?.error ? (
            <p className="mt-3 text-[12.5px]" style={{ color: "var(--color-danger)" }}>
              {dict.admin.wrongPassword}
            </p>
          ) : null}
          <button type="submit" className="btn btn-primary mt-4 w-full" disabled={pending}>
            {pending ? dict.common.loading : dict.admin.signIn}
          </button>
        </form>

        {defaultPassword ? (
          <p
            className="mt-4 rounded-lg px-3 py-2 text-[11.5px] leading-relaxed"
            style={{ background: "var(--color-warn-soft)", color: "var(--color-warn)" }}
          >
            {dict.admin.devPasswordHint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
