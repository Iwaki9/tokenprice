"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addSubmission } from "@/lib/store";

export type SubmitState = {
  status: "idle" | "ok" | "error";
  message?: string;
};

function isUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function submitProviderAction(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const name = String(formData.get("name") ?? "").trim();
  const homepage = String(formData.get("homepage") ?? "").trim();
  const referralUrl = String(formData.get("referralUrl") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const agree = formData.get("agree");

  if (!name || !homepage || !email || !agree) {
    return { status: "error", message: "required" };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { status: "error", message: "email" };
  }
  if (!isUrl(homepage) || (referralUrl && !isUrl(referralUrl))) {
    return { status: "error", message: "url" };
  }
  if (name.length > 80 || message.length > 2000) {
    return { status: "error", message: "length" };
  }

  await addSubmission({
    name,
    homepage,
    referralUrl: referralUrl || undefined,
    contactEmail: email,
    message: message || undefined,
  });

  revalidatePath("/", "layout");
  return { status: "ok" };
}

export async function goToAdmin(lang: string) {
  redirect(`/${lang}/admin`);
}
