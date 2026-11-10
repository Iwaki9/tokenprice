import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteProviderAction,
  deleteQuoteAction,
  saveProviderAction,
  saveQuoteAction,
} from "@/lib/actions/admin";
import { DemoTag } from "@/components/ui";
import { dictionaries } from "@/lib/i18n";
import { getDb } from "@/lib/store";
import { isLang } from "@/lib/site";
import type { Provider } from "@/lib/types";

export const dynamic = "force-dynamic";

const FEATURES: (keyof Provider["features"])[] = [
  "card",
  "alipay",
  "wechat",
  "crypto",
  "invoice",
  "refunds",
  "trialCredit",
  "usageBased",
];

export default async function ProviderEditor({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang: raw, slug } = await params;
  const lang = isLang(raw) ? raw : "ru";
  const dict = dictionaries[lang];
  const query = await searchParams;
  const db = await getDb();

  const isNew = slug === "new";
  const provider = isNew ? null : db.providers.find((p) => p.slug === slug);
  if (!isNew && !provider) notFound();

  const quotes = provider ? db.prices.filter((q) => q.providerSlug === provider.slug) : [];
  const modelBySlug = new Map(db.models.map((m) => [m.slug, m]));
  const vendorBySlug = new Map(db.vendors.map((v) => [v.slug, v]));
  const confirmDelete = query.confirm === "1";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link href={`/${lang}/admin/providers`} className="text-[12.5px] text-muted underline underline-offset-2">
          ← {dict.admin.providersTab}
        </Link>
        <h1 className="display text-[26px]">
          {isNew ? dict.admin.newProvider : provider?.name}
        </h1>
        {provider?.isDemo ? <DemoTag lang={lang} /> : null}
        {query.saved ? (
          <span className="text-[12px]" style={{ color: "var(--color-save)" }}>
            {dict.admin.providerSaved}
          </span>
        ) : null}
        {query.price === "1" ? (
          <span className="text-[12px]" style={{ color: "var(--color-save)" }}>
            {dict.admin.priceSaved}
          </span>
        ) : null}
        {query.price === "deleted" ? (
          <span className="text-[12px]" style={{ color: "var(--color-save)" }}>
            {dict.admin.priceDeleted}
          </span>
        ) : null}
      </div>

      <form action={saveProviderAction} className="card p-5">
        <input type="hidden" name="lang" value={lang} />

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-[12.5px] font-medium">{dict.admin.name} *</span>
            <input name="name" defaultValue={provider?.name ?? ""} required className="input mt-1.5" />
          </label>
          <label className="block">
            <span className="text-[12.5px] font-medium">{dict.admin.slug}</span>
            <input
              name="slug"
              defaultValue={provider?.slug ?? ""}
              placeholder="auto"
              className="input mt-1.5 font-mono !text-[13px]"
            />
            <span className="mt-1 block text-[11px] text-muted">{dict.admin.slugHint}</span>
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-[12.5px] font-medium">{dict.admin.tagline} (RU)</span>
            <input name="taglineRu" defaultValue={provider?.taglineRu ?? ""} className="input mt-1.5" />
          </label>
          <label className="block">
            <span className="text-[12.5px] font-medium">{dict.admin.tagline} (EN)</span>
            <input name="taglineEn" defaultValue={provider?.taglineEn ?? ""} className="input mt-1.5" />
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-[12.5px] font-medium">{dict.admin.homepage}</span>
            <input
              name="homepage"
              defaultValue={provider?.homepage ?? ""}
              placeholder="https://"
              className="input mt-1.5 font-mono !text-[13px]"
            />
          </label>
          <label className="block">
            <span className="text-[12.5px] font-medium">{dict.admin.contactEmail}</span>
            <input name="contactEmail" defaultValue={provider?.contactEmail ?? ""} className="input mt-1.5" />
          </label>
        </div>

        <div className="mt-5 rounded-xl bg-canvas p-4">
          <p className="kicker">{dict.admin.referralUrl}</p>
          <div className="mt-2 grid gap-4 md:grid-cols-[2fr_1fr]">
            <label className="block">
              <input
                name="referralUrl"
                defaultValue={provider?.referralUrl ?? ""}
                placeholder="https://provider.example/register?aff=tokenrate"
                className="input font-mono !text-[13px]"
              />
              <span className="mt-1 block text-[11px] text-muted">
                {lang === "ru"
                  ? "Сюда идёт кнопка «Перейти на сайт». Клик логируется в /visit/<slug>."
                  : "The “Visit site” button points here. Clicks are logged at /visit/<slug>."}
              </span>
            </label>
            <label className="block">
              <span className="text-[11.5px] text-muted">{dict.admin.referralParam}</span>
              <input
                name="referralParam"
                defaultValue={provider?.referralParam ?? ""}
                placeholder="sub_id"
                className="input mt-1 font-mono !text-[13px]"
              />
              <span className="mt-1 block text-[11px] text-muted">{dict.admin.referralParamHint}</span>
            </label>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <label className="block">
            <span className="text-[12.5px] font-medium">{dict.admin.minTopUpAmount}</span>
            <input
              name="minTopUpAmount"
              defaultValue={provider?.minTopUp?.amount ?? ""}
              inputMode="decimal"
              className="input mt-1.5 tick"
            />
          </label>
          <label className="block">
            <span className="text-[12.5px] font-medium">{dict.admin.minTopUpCurrency}</span>
            <input
              name="minTopUpCurrency"
              defaultValue={provider?.minTopUp?.currency ?? "USD"}
              className="input mt-1.5"
            />
          </label>
          <label className="block">
            <span className="text-[12.5px] font-medium">{dict.admin.status}</span>
            <select name="status" defaultValue={provider?.status ?? "active"} className="input mt-1.5">
              <option value="active">{dict.provider.status.active}</option>
              <option value="hidden">{dict.provider.status.hidden}</option>
              <option value="pending">{dict.provider.status.pending}</option>
            </select>
          </label>
          <label className="block">
            <span className="text-[12.5px] font-medium">{dict.admin.tags}</span>
            <input
              name="tags"
              defaultValue={provider?.tags.join(", ") ?? ""}
              placeholder="anthropic, openai"
              className="input mt-1.5"
            />
            <span className="mt-1 block text-[11px] text-muted">{dict.admin.tagsHint}</span>
          </label>
        </div>

        <fieldset className="mt-5">
          <legend className="text-[12.5px] font-medium">{dict.admin.features}</legend>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            {FEATURES.map((feature) => (
              <label key={feature} className="flex items-center gap-1.5 text-[12.5px]">
                <input
                  type="checkbox"
                  name={`feature_${feature}`}
                  defaultChecked={Boolean(provider?.features?.[feature])}
                />
                {dict.provider.feature[feature]}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-5 flex items-center gap-3">
          <button type="submit" className="btn btn-primary">
            {dict.common.save}
          </button>
          {provider ? (
            <Link
              href={`/${lang}/providers/${provider.slug}`}
              target="_blank"
              className="text-[12.5px] text-brand underline underline-offset-2"
            >
              {dict.common.visit} ↗
            </Link>
          ) : null}
        </div>
      </form>

      {provider ? (
        <>
          <section className="card mt-5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[14px] font-medium">{dict.admin.prices}</h2>
              <span className="text-[11.5px] text-muted">
                {quotes.length} · {lang === "ru" ? "цена за 1M токенов, USD" : "prices per 1M tokens, USD"}
              </span>
            </div>

            <datalist id="model-list">
              {db.models.map((model) => (
                <option key={model.slug} value={model.slug}>
                  {vendorBySlug.get(model.vendor)?.name} {model.name}
                </option>
              ))}
            </datalist>

            <div className="mt-3 space-y-1">
              {quotes.map((quote) => {
                const model = modelBySlug.get(quote.modelSlug);
                const official = model
                  ? `${(model.official.input + model.official.output) / 2}`
                  : "—";
                return (
                  <form
                    key={quote.modelSlug}
                    action={saveQuoteAction}
                    className="grid grid-cols-2 items-center gap-2 rounded-lg px-1 py-1.5 text-[12.5px] hover:bg-canvas md:grid-cols-[1.5fr_repeat(4,80px)_1fr_auto_auto]"
                  >
                    <input type="hidden" name="lang" value={lang} />
                    <input type="hidden" name="providerSlug" value={provider.slug} />
                    <input type="hidden" name="modelSlug" value={quote.modelSlug} />

                    <div className="md:col-span-1">
                      <Link
                        href={`/${lang}/models/${quote.modelSlug}`}
                        className="link-underline font-medium"
                        target="_blank"
                      >
                        {model?.name ?? quote.modelSlug}
                      </Link>
                      <p className="text-[10.5px] text-muted">
                        {lang === "ru" ? "офиц." : "official"} {official}
                      </p>
                    </div>

                    {(["input", "output", "cacheRead", "cacheWrite"] as const).map((field) => (
                      <input
                        key={field}
                        name={field}
                        defaultValue={quote[field] ?? ""}
                        placeholder={field}
                        inputMode="decimal"
                        className="input !py-1 !px-2 tick !text-[12px]"
                        aria-label={field}
                      />
                    ))}

                    <input
                      name="sourceUrl"
                      defaultValue={quote.sourceUrl ?? ""}
                      placeholder="source url"
                      className="input !py-1 !px-2 !text-[11.5px]"
                    />
                    <input
                      name="observedAt"
                      defaultValue={quote.observedAt ?? ""}
                      placeholder="2026-01-01"
                      className="input !py-1 !px-2 !text-[11.5px]"
                    />

                    <div className="flex items-center gap-2">
                      <button type="submit" className="text-[11.5px] text-brand underline underline-offset-2">
                        {dict.common.save}
                      </button>
                    </div>
                  </form>
                );
              })}
            </div>

            <form
              action={saveQuoteAction}
              className="mt-4 grid gap-2 border-t border-line pt-4 md:grid-cols-[1.5fr_repeat(4,80px)_1fr_auto]"
            >
              <input type="hidden" name="lang" value={lang} />
              <input type="hidden" name="providerSlug" value={provider.slug} />
              <input
                name="modelSlug"
                list="model-list"
                placeholder={dict.admin.model}
                required
                className="input !py-1.5 !text-[12.5px]"
              />
              {(["input", "output", "cacheRead", "cacheWrite"] as const).map((field) => (
                <input
                  key={field}
                  name={field}
                  placeholder={field}
                  inputMode="decimal"
                  className="input !py-1.5 !text-[12px] tick"
                  aria-label={field}
                />
              ))}
              <input
                name="sourceUrl"
                placeholder="source url"
                className="input !py-1.5 !text-[12px]"
              />
              <button type="submit" className="btn btn-primary !py-1.5 !text-[12px]">
                + {dict.admin.addPrice}
              </button>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              {quotes.map((quote) => (
                <form key={`del-${quote.modelSlug}`} action={deleteQuoteAction}>
                  <input type="hidden" name="lang" value={lang} />
                  <input type="hidden" name="providerSlug" value={provider.slug} />
                  <input type="hidden" name="modelSlug" value={quote.modelSlug} />
                  <button
                    type="submit"
                    className="text-[11px] text-muted underline underline-offset-2 hover:text-danger"
                  >
                    × {quote.modelSlug}
                  </button>
                </form>
              ))}
            </div>
          </section>

          <section className="card mt-5 p-5">
            <h2 className="text-[14px] font-medium" style={{ color: "var(--color-danger)" }}>
              {dict.admin.dangerZone}
            </h2>
            {confirmDelete ? (
              <form action={deleteProviderAction} className="mt-3 flex items-center gap-3">
                <input type="hidden" name="lang" value={lang} />
                <input type="hidden" name="slug" value={provider.slug} />
                <span className="text-[12.5px]">{dict.admin.confirmDelete}</span>
                <button
                  type="submit"
                  className="btn !py-1.5 !text-[12px]"
                  style={{ background: "var(--color-danger)", color: "#fff" }}
                >
                  {dict.common.delete}
                </button>
                <Link
                  href={`/${lang}/admin/providers/${provider.slug}`}
                  className="text-[12px] text-muted underline underline-offset-2"
                >
                  {dict.common.cancel}
                </Link>
              </form>
            ) : (
              <Link
                href={`/${lang}/admin/providers/${provider.slug}?confirm=1`}
                className="mt-2 inline-block text-[12.5px] underline underline-offset-2"
                style={{ color: "var(--color-danger)" }}
              >
                {dict.common.delete}
              </Link>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
