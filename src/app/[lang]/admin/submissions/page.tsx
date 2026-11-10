import Link from "next/link";
import {
  convertSubmissionAction,
  updateSubmissionAction,
} from "@/lib/actions/admin";
import { date } from "@/lib/format";
import { dictionaries } from "@/lib/i18n";
import { getDb } from "@/lib/store";
import { isLang } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function AdminSubmissions({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ru";
  const dict = dictionaries[lang];
  const db = await getDb();

  const statusColor: Record<string, string> = {
    new: "var(--color-warn)",
    approved: "var(--color-save)",
    rejected: "var(--color-muted)",
  };

  return (
    <div>
      <h1 className="display mb-4 text-[26px]">{dict.admin.submissions}</h1>

      {db.submissions.length === 0 ? (
        <p className="card px-4 py-8 text-center text-[13px] text-muted">
          {dict.admin.noSubmissions}
        </p>
      ) : (
        <div className="space-y-3">
          {db.submissions.map((submission) => (
            <article key={submission.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[14px] font-medium">{submission.name}</h2>
                    <span
                      className="rounded px-1.5 py-[1px] text-[10.5px] font-semibold uppercase tracking-wider"
                      style={{ color: statusColor[submission.status] }}
                    >
                      {submission.status}
                    </span>
                    <span className="text-[11.5px] text-muted">
                      {date(submission.createdAt, lang)}
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] text-muted">
                    <a href={submission.homepage} target="_blank" rel="nofollow noopener" className="underline underline-offset-2">
                      {submission.homepage}
                    </a>
                    {" · "}
                    {submission.contactEmail}
                  </p>
                  {submission.referralUrl ? (
                    <p className="mt-1 break-all font-mono text-[11.5px] text-muted">
                      ref: {submission.referralUrl}
                    </p>
                  ) : null}
                  {submission.message ? (
                    <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed">{submission.message}</p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {submission.status === "new" ? (
                    <>
                      <form action={convertSubmissionAction}>
                        <input type="hidden" name="lang" value={lang} />
                        <input type="hidden" name="id" value={submission.id} />
                        <input type="hidden" name="name" value={submission.name} />
                        <input type="hidden" name="homepage" value={submission.homepage} />
                        <input type="hidden" name="referralUrl" value={submission.referralUrl ?? ""} />
                        <input type="hidden" name="email" value={submission.contactEmail} />
                        <button type="submit" className="btn btn-primary !py-1.5 !text-[12px]">
                          {dict.admin.approve} + {dict.admin.newProvider}
                        </button>
                      </form>
                      <form action={updateSubmissionAction}>
                        <input type="hidden" name="lang" value={lang} />
                        <input type="hidden" name="id" value={submission.id} />
                        <input type="hidden" name="decision" value="reject" />
                        <button type="submit" className="btn btn-ghost !py-1.5 !text-[12px]">
                          {dict.admin.reject}
                        </button>
                      </form>
                    </>
                  ) : (
                    <Link
                      href={`/${lang}/admin/providers`}
                      className="text-[12px] text-brand underline underline-offset-2"
                    >
                      {dict.admin.providersTab} →
                    </Link>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
