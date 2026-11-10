"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  deleteProvider,
  deleteQuote,
  slugify,
  upsertProvider,
  upsertQuote,
  setSubmissionStatus,
  getProvider,
} from "@/lib/store";
import { checkPassword, clearAdminCookie, setAdminCookie } from "@/lib/auth";
import type { Provider, ProviderFeatures, ProviderStatus } from "@/lib/types";

const FEATURE_KEYS: (keyof ProviderFeatures)[] = [
  "card",
  "alipay",
  "wechat",
  "crypto",
  "invoice",
  "refunds",
  "trialCredit",
  "usageBased",
];

function num(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value: FormDataEntryValue | null, max = 300) {
  return String(value ?? "").trim().slice(0, max);
}

export async function loginAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const lang = text(formData.get("lang"), 2) || "ru";
  const password = String(formData.get("password") ?? "");
  if (!checkPassword(password)) {
    return { error: "wrong" };
  }
  await setAdminCookie();
  redirect(`/${lang}/admin`);
}

export async function logoutAction(formData: FormData) {
  const lang = text(formData.get("lang"), 2) || "ru";
  await clearAdminCookie();
  redirect(`/${lang}`);
}

export async function saveProviderAction(formData: FormData) {
  const lang = text(formData.get("lang"), 2) || "ru";
  const name = text(formData.get("name"), 80);
  if (!name) redirect(`/${lang}/admin/providers?error=name`);

  const slug = slugify(text(formData.get("slug"), 80) || name);
  const existing = await getProvider(slug);

  const features: ProviderFeatures = {};
  for (const key of FEATURE_KEYS) {
    if (formData.get(`feature_${key}`) === "on") features[key] = true;
  }

  const minTopUpAmount = num(formData.get("minTopUpAmount"));
  const minTopUpCurrency = text(formData.get("minTopUpCurrency"), 4) || "USD";

  const status = text(formData.get("status"), 10) as ProviderStatus;
  const tags = text(formData.get("tags"), 400)
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);

  await upsertProvider({
    slug,
    name,
    taglineRu: text(formData.get("taglineRu"), 300) || undefined,
    taglineEn: text(formData.get("taglineEn"), 300) || undefined,
    homepage: text(formData.get("homepage"), 300) || undefined,
    referralUrl: text(formData.get("referralUrl"), 500) || undefined,
    referralParam: text(formData.get("referralParam"), 40) || undefined,
    contactEmail: text(formData.get("contactEmail"), 200) || undefined,
    features,
    tags,
    minTopUp: minTopUpAmount ? { amount: minTopUpAmount, currency: minTopUpCurrency } : null,
    status: ["active", "hidden", "pending"].includes(status) ? status : "active",
    isDemo: existing?.isDemo ?? false,
  });

  revalidatePath("/", "layout");
  redirect(`/${lang}/admin/providers/${slug}?saved=1`);
}

export async function deleteProviderAction(formData: FormData) {
  const lang = text(formData.get("lang"), 2) || "ru";
  const slug = text(formData.get("slug"), 80);
  if (slug) await deleteProvider(slug);
  revalidatePath("/", "layout");
  redirect(`/${lang}/admin/providers?deleted=${slug}`);
}

export async function saveQuoteAction(formData: FormData) {
  const lang = text(formData.get("lang"), 2) || "ru";
  const providerSlug = text(formData.get("providerSlug"), 80);
  const modelSlug = text(formData.get("modelSlug"), 80);
  const input = num(formData.get("input"));
  const output = num(formData.get("output"));

  if (!providerSlug || !modelSlug || input === null || output === null) {
    redirect(`/${lang}/admin/providers/${providerSlug}?error=price`);
  }

  await upsertQuote({
    providerSlug,
    modelSlug,
    input,
    output,
    cacheRead: num(formData.get("cacheRead")),
    cacheWrite: num(formData.get("cacheWrite")),
    sourceUrl: text(formData.get("sourceUrl"), 500) || undefined,
    observedAt: text(formData.get("observedAt"), 20) || new Date().toISOString().slice(0, 10),
    note: text(formData.get("note"), 200) || undefined,
  });

  revalidatePath("/", "layout");
  redirect(`/${lang}/admin/providers/${providerSlug}?price=1`);
}

export async function deleteQuoteAction(formData: FormData) {
  const lang = text(formData.get("lang"), 2) || "ru";
  const providerSlug = text(formData.get("providerSlug"), 80);
  const modelSlug = text(formData.get("modelSlug"), 80);
  await deleteQuote(providerSlug, modelSlug);
  revalidatePath("/", "layout");
  redirect(`/${lang}/admin/providers/${providerSlug}?price=deleted`);
}

export async function updateSubmissionAction(formData: FormData) {
  const lang = text(formData.get("lang"), 2) || "ru";
  const id = text(formData.get("id"), 40);
  const decision = text(formData.get("decision"), 10);
  if (id) await setSubmissionStatus(id, decision === "approve" ? "approved" : "rejected");
  revalidatePath("/", "layout");
  redirect(`/${lang}/admin/submissions`);
}

/** Turns an approved request into a hidden provider draft with the referral link pre-filled. */
export async function convertSubmissionAction(formData: FormData) {
  const lang = text(formData.get("lang"), 2) || "ru";
  const id = text(formData.get("id"), 40);
  const name = text(formData.get("name"), 80);
  const homepage = text(formData.get("homepage"), 300);
  const referralUrl = text(formData.get("referralUrl"), 500);
  if (!name) redirect(`/${lang}/admin/submissions`);

  const slug = slugify(name);
  await upsertProvider({
    slug,
    name,
    homepage: homepage || undefined,
    referralUrl: referralUrl || undefined,
    referralParam: "sub_id",
    features: {},
    tags: [],
    minTopUp: null,
    status: "pending",
    isDemo: false,
    contactEmail: text(formData.get("email"), 200) || undefined,
  });
  if (id) await setSubmissionStatus(id, "approved");

  revalidatePath("/", "layout");
  redirect(`/${lang}/admin/providers/${slug}`);
}

