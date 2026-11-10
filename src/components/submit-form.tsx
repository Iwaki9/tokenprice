"use client";

import { useActionState } from "react";
import { submitProviderAction, type SubmitState } from "@/lib/actions/public";
import type { Dictionary } from "@/lib/i18n";

const initial: SubmitState = { status: "idle" };

export function SubmitForm({ dict }: { dict: Dictionary }) {
  const [state, action, pending] = useActionState(submitProviderAction, initial);

  if (state.status === "ok") {
    return (
      <div className="card p-8 text-center">
        <p className="display text-[26px]">{dict.submit.success}</p>
        <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-muted">
          {dict.submit.successNote}
        </p>
      </div>
    );
  }

  const errorMessage =
    state.status === "error"
      ? state.message === "email"
        ? dict.submit.errorEmail
        : state.message === "url"
          ? dict.submit.errorUrl
          : state.message === "length"
            ? dict.common.error
            : dict.submit.errorRequired
      : null;

  return (
    <form action={action} className="card max-w-2xl p-5 md:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-[12.5px] font-medium">{dict.submit.name} *</span>
          <input name="name" required maxLength={80} className="input mt-1.5" />
        </label>
        <label className="block">
          <span className="text-[12.5px] font-medium">{dict.submit.homepage} *</span>
          <input
            name="homepage"
            required
            placeholder="https://"
            className="input mt-1.5 font-mono !text-[13px]"
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="text-[12.5px] font-medium">
          {dict.submit.referralUrl}{" "}
          <span className="font-normal text-muted">({dict.common.optional})</span>
        </span>
        <input
          name="referralUrl"
          placeholder="https://your.site/ref/tokenrate"
          className="input mt-1.5 font-mono !text-[13px]"
        />
        <span className="mt-1 block text-[11.5px] leading-relaxed text-muted">
          {dict.submit.referralHint}
        </span>
      </label>

      <label className="mt-4 block">
        <span className="text-[12.5px] font-medium">{dict.submit.email} *</span>
        <input name="email" type="email" required className="input mt-1.5" />
      </label>

      <label className="mt-4 block">
        <span className="text-[12.5px] font-medium">{dict.submit.message}</span>
        <textarea
          name="message"
          rows={4}
          maxLength={2000}
          placeholder={dict.submit.messagePlaceholder}
          className="input mt-1.5 resize-y"
        />
      </label>

      <label className="mt-4 flex items-start gap-2.5 text-[12.5px] leading-relaxed text-muted">
        <input type="checkbox" name="agree" required className="mt-0.5" />
        <span>{dict.submit.agree}</span>
      </label>

      {errorMessage ? (
        <p
          className="mt-4 rounded-lg px-3 py-2 text-[12.5px]"
          style={{ background: "#fdecea", color: "#b42318" }}
        >
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? dict.common.loading : dict.submit.submit}
        </button>
        <p className="max-w-md text-[11.5px] leading-relaxed text-muted">
          {dict.submit.disclosure}
        </p>
      </div>
    </form>
  );
}
