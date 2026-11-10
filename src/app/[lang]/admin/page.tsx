import Link from "next/link";
import { DemoTag } from "@/components/ui";
import { date, pct, usd } from "@/lib/format";
import { dictionaries } from "@/lib/i18n";
import { getClickStats, getDb } from "@/lib/store";
import { isLang } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function AdminOverview({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ru";
  const dict = dictionaries[lang];
  const db = await getDb();
  const clicks = await getClickStats(30);

  const pending = db.submissions.filter((s) => s.status === "new");
  const demo = db.providers.filter((p) => p.isDemo).length;
  const missingReferral = db.providers.filter((p) => !p.referralUrl).length;

  const topClicks = [...clicks.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 6);

  const stats = [
    { label: dict.admin.totalProviders, value: String(db.providers.length) },
    { label: dict.admin.totalModels, value: String(db.models.length) },
    { label: dict.admin.totalQuotes, value: String(db.prices.length) },
    { label: dict.admin.pendingSubmissions, value: String(pending.length) },
  ];

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-4">
            <p className="text-[11.5px] text-muted">{stat.label}</p>
            <p className="display mt-1 text-[30px] leading-none">{stat.value}</p>
          </div>
        ))}
      </div>

      {demo > 0 ? (
        <div
          className="mt-4 flex flex-wrap items-center gap-2 rounded-xl px-4 py-3 text-[12.5px]"
          style={{ background: "var(--color-warn-soft)", color: "var(--color-warn)" }}
        >
          <DemoTag lang={lang} />
          {lang === "ru"
            ? `${demo} провайдеров содержат сгенерированные котировки. Замените их реальными: правьте цены вручную или запустите краулер.`
            : `${demo} providers hold generated quotes. Replace them with real observations: edit prices or run the crawler.`}
          {missingReferral > 0 ? (
            <span className="text-ink/70">
              · {missingReferral} {lang === "ru" ? "без реферальной ссылки" : "without a referral link"}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-medium">{dict.admin.clicksTab}</h2>
            <Link href={`/${lang}/admin/clicks`} className="text-[12px] text-brand underline underline-offset-2">
              {dict.admin.exportCsv}
            </Link>
          </div>
          <p className="mt-1 text-[11.5px] text-muted">{dict.admin.clicksNote}</p>
          {topClicks.length === 0 ? (
            <p className="mt-4 text-[12.5px] text-muted">{dict.admin.noClicks}</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {topClicks.map(([slug, stat]) => (
                <li key={slug} className="flex items-center justify-between py-2 text-[13px]">
                  <Link href={`/${lang}/providers/${slug}`} className="link-underline">
                    {db.providers.find((p) => p.slug === slug)?.name ?? slug}
                  </Link>
                  <span className="tick text-muted">
                    {stat.recent} / {stat.total}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-medium">{dict.admin.submissions}</h2>
            <Link href={`/${lang}/admin/submissions`} className="text-[12px] text-brand underline underline-offset-2">
              {dict.admin.approve} →
            </Link>
          </div>
          {pending.length === 0 ? (
            <p className="mt-4 text-[12.5px] text-muted">{dict.admin.noSubmissions}</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {pending.slice(0, 5).map((submission) => (
                <li key={submission.id} className="py-2 text-[13px]">
                  <p className="font-medium">{submission.name}</p>
                  <p className="text-[11.5px] text-muted">
                    {submission.contactEmail} · {date(submission.createdAt, lang)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card mt-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[14px] font-medium">{dict.admin.providersTab}</h2>
          <Link href={`/${lang}/admin/providers/new`} className="btn btn-primary !py-1.5 !text-[12.5px]">
            + {dict.admin.newProvider}
          </Link>
        </div>
        <ul className="mt-3 divide-y divide-line">
          {db.providers.slice(0, 8).map((provider) => {
            const count = db.prices.filter((q) => q.providerSlug === provider.slug).length;
            const best = db.prices
              .filter((q) => q.providerSlug === provider.slug)
              .map((q) => {
                const model = db.models.find((m) => m.slug === q.modelSlug);
                if (!model) return 0;
                const official = (model.official.input + model.official.output) / 2;
                const own = (q.input + q.output) / 2;
                return official > 0 ? 1 - own / official : 0;
              })
              .sort((a, b) => b - a)[0];
            return (
              <li key={provider.slug} className="flex flex-wrap items-center gap-3 py-2 text-[13px]">
                <Link href={`/${lang}/admin/providers/${provider.slug}`} className="link-underline font-medium">
                  {provider.name}
                </Link>
                {provider.isDemo ? <DemoTag lang={lang} /> : null}
                <span className="text-[11.5px] text-muted">{provider.status}</span>
                <span className="text-[11.5px] text-muted">
                  {count} {dict.common.models}
                </span>
                {provider.referralUrl ? (
                  <span className="text-[11.5px]" style={{ color: "var(--color-save)" }}>
                    ✓ referral
                  </span>
                ) : (
                  <span className="text-[11.5px]" style={{ color: "var(--color-warn)" }}>
                    no referral
                  </span>
                )}
                {best ? (
                  <span className="tick ml-auto text-[11.5px] text-muted">−{pct(best)}</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <p className="mt-4 text-[11.5px] text-muted">
        {lang === "ru"
          ? `Данные: ${db.prices.length} котировок · средняя цена входа ${usd(
              db.prices.reduce((sum, q) => sum + q.input, 0) / Math.max(1, db.prices.length),
            )}`
          : `${db.prices.length} quotes · average input price ${usd(
              db.prices.reduce((sum, q) => sum + q.input, 0) / Math.max(1, db.prices.length),
            )}`}
      </p>
    </div>
  );
}
