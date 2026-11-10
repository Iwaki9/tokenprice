import Link from "next/link";
import { dateTime } from "@/lib/format";
import { dictionaries } from "@/lib/i18n";
import { getClickStats, getDb } from "@/lib/store";
import { isLang } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function AdminClicks({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ru";
  const dict = dictionaries[lang];
  const db = await getDb();
  const clicks = await getClickStats(30);

  const rows = [...clicks.entries()]
    .map(([slug, stat]) => ({
      slug,
      name: db.providers.find((p) => p.slug === slug)?.name ?? slug,
      ...stat,
    }))
    .sort((a, b) => b.recent - a.recent);

  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const recent = rows.reduce((sum, row) => sum + row.recent, 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="display text-[26px]">{dict.admin.clicks}</h1>
        <a
          href="/api/admin/clicks"
          className="btn btn-ghost !py-1.5 !text-[12.5px]"
          download
        >
          {dict.admin.exportCsv}
        </a>
      </div>

      <p className="mb-4 max-w-2xl text-[12px] text-muted">{dict.admin.clicksNote}</p>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="card p-4">
          <p className="text-[11.5px] text-muted">{dict.admin.totalClicks}</p>
          <p className="display mt-1 text-[30px] leading-none">{total}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11.5px] text-muted">{dict.admin.recentClicks}</p>
          <p className="display mt-1 text-[30px] leading-none">{recent}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="card px-4 py-8 text-center text-[13px] text-muted">{dict.admin.noClicks}</p>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-[0.06em] text-muted">
                <th className="px-4 py-2 font-medium">{dict.admin.providersTab}</th>
                <th className="px-4 py-2 text-right font-medium">{dict.admin.totalClicks}</th>
                <th className="px-4 py-2 text-right font-medium">{dict.admin.recentClicks}</th>
                <th className="px-4 py-2 text-right font-medium">{dict.admin.lastClick}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.slug} className="row-hover border-b border-line/70 last:border-0">
                  <td className="px-4 py-2.5">
                    <Link href={`/${lang}/providers/${row.slug}`} className="link-underline font-medium">
                      {row.name}
                    </Link>
                  </td>
                  <td className="tick px-4 py-2.5 text-right">{row.total}</td>
                  <td className="tick px-4 py-2.5 text-right">{row.recent}</td>
                  <td className="px-4 py-2.5 text-right text-[12px] text-muted">
                    {dateTime(row.last, lang)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
