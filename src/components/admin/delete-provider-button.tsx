"use client";

import { useTransition } from "react";

/**
 * One-click provider delete for the admin list: confirm natively, then run
 * the existing deleteProviderAction server action without leaving the page
 * until it finishes (pending state disables the button).
 */
export function AdminDeleteProvider({
  action,
  lang,
  slug,
  confirmLabel,
  deleteLabel,
  cancelLabel,
  pendingLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  lang: string;
  slug: string;
  confirmLabel: string;
  deleteLabel: string;
  cancelLabel: string;
  pendingLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      action={(formData) => {
        if (!window.confirm(confirmLabel)) return;
        startTransition(() => action(formData));
      }}
      className="flex items-center gap-1.5"
    >
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="slug" value={slug} />
      <button
        type="submit"
        disabled={pending}
        className="btn btn-ghost !border-0 !px-2 !py-1 !text-[11.5px]"
        style={{ color: "var(--color-danger)" }}
        title={deleteLabel}
      >
        {pending ? pendingLabel : `✕ ${deleteLabel}`}
      </button>
    </form>
  );
}
