import Link from "next/link";
import { DemoTag } from "@/components/ui";
import { computeStats, readProbes } from "@/lib/monitoring";
import { dictionaries } from "@/lib/i18n";
import { getClickStats, getDb } from "@/lib/store";
import { isLang } from "@/lib/site";
import { reasonNotListable } from "@/lib/visibility";

export const dynamic = "force-dynamic";

export default async function AdminProviders({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "ru";
  const dict = dictionaries[lang];
  const db = await getDb();
  const clicks = await getClickStats(30);
  const probes = await readProbes();
  const probesByProvider = new Map<string, typeof probes>();
  for (const probe of probes) {
    const list = probesByProvider.get(probe.providerSlug) ?? [];
    list.push(probe);
    probesByProvider.set(probe.providerSlug, list);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="display text-[26px]">{dict.admin.providersTab}</h1>
        <Link href={`/${lang}/admin/providers/new`} className="btn btn-primary !py-1.5 !text-[12.5px]">
          + {dict.admin.newProvider}
        </Link>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-[0.06em] text-muted">
                <th className="px-4 py-2 font-medium">{dict.admin.name}</th>
                <th className="px-4 py-2 font-medium">Slug</th>
                <th className="px-4 py-2 font-medium">{dict.admin.status}</th>
                <th className="px-4 py-2 text-right font-medium">{dict.common.models}</th>
                <th className="px-4 py-2 text-right font-medium">{dict.admin.clicks}</th>
                <th className="px-4 py-2 font-medium">Referral</th>
                <th className="px-4 py-2 font-medium">{lang === "ru" ? "Сайт" : "Site"}</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {db.providers.map((provider) => {
                const count = db.prices.filter((q) => q.providerSlug === provider.slug).length;
                const stat = clicks.get(provider.slug);
                const hiddenReason = reasonNotListable(provider, {
                  stats: probesByProvider.has(provider.slug)
                    ? computeStats(probesByProvider.get(provider.slug)!)
                    : null,
                  quotes: db.prices.filter((q) => q.providerSlug === provider.slug),
                });
                return (
                  <tr key={provider.slug} className="row-hover border-b border-line/70 last:border-0">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{provider.name}</span>
                        {provider.isDemo ? <DemoTag lang={lang} /> : null}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11.5px] text-muted">{provider.slug}</td>
                    <td className="px-4 py-2.5 text-[12px]">{dict.provider.status[provider.status]}</td>
                    <td className="tick px-4 py-2.5 text-right">{count}</td>
                    <td className="tick px-4 py-2.5 text-right text-muted">
                      {stat ? `${stat.recent} / ${stat.total}` : "0"}
                    </td>
                    <td className="px-4 py-2.5">
                      {provider.referralUrl ? (
                        <span className="text-[11.5px]" style={{ color: "var(--color-save)" }}>
                          ✓
                        </span>
                      ) : (
                        <span className="text-[11.5px]" style={{ color: "var(--color-warn)" }}>
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {hiddenReason ? (
                        <span className="text-[11px] text-muted" title={hiddenReason}>
                          🚫 {hiddenReason}
                        </span>
                      ) : (
                        <span className="text-[11px]" style={{ color: "var(--color-save)" }}>
                          ✓ {lang === "ru" ? "на сайте" : "listed"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        href={`/${lang}/admin/providers/${provider.slug}`}
                        className="text-[12px] text-brand underline underline-offset-2"
                      >
                        {dict.common.edit}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
