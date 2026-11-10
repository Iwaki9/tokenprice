import { NextResponse, type NextRequest } from "next/server";
import { getProvider, logClick } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Outbound referral redirect. Every "Visit site" button points here so the
 * click is logged and the partner parameter is attached server-side.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const provider = await getProvider(slug);

  if (!provider || provider.status === "pending") {
    return NextResponse.redirect(new URL("/ru/providers", request.url), 302);
  }

  const target = provider.referralUrl || provider.homepage;
  if (!target) {
    return NextResponse.redirect(new URL("/ru/providers", request.url), 302);
  }

  let destination: URL;
  try {
    destination = new URL(target);
  } catch {
    return NextResponse.redirect(new URL("/ru/providers", request.url), 302);
  }

  const from = request.nextUrl.searchParams.get("from") ?? "site";
  if (provider.referralParam) {
    destination.searchParams.set(provider.referralParam, `tr-${from}`);
  }
  destination.searchParams.set("utm_source", "tokenrate");
  destination.searchParams.set("utm_medium", "referral");
  destination.searchParams.set("utm_campaign", from);

  try {
    await logClick({
      slug: provider.slug,
      ref: from,
      country: request.headers.get("x-vercel-ip-country") ?? undefined,
      ua: request.headers.get("user-agent")?.slice(0, 180) ?? undefined,
    });
  } catch {
    // A logging failure must never block the redirect.
  }

  return NextResponse.redirect(destination.toString(), 302);
}
