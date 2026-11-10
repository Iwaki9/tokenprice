import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 20;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > LIMIT;
}

function isPrivateIp(ip: string) {
  if (ip.includes(":")) {
    const lower = ip.toLowerCase();
    return (
      lower === "::1" ||
      lower.startsWith("fc") ||
      lower.startsWith("fd") ||
      lower.startsWith("fe80")
    );
  }
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

/**
 * Workers has no DNS lookup, so only literal hosts are checked here: localhost,
 * private IP literals and internal names. Hostnames that resolve to private
 * addresses are still possible and are accepted as a known limit.
 */
function assertPublicHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    throw new Error("private");
  }
  if (/^[\d.]+$/.test(host) || host.includes(":")) {
    if (isPrivateIp(host)) throw new Error("private");
  }
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local";

  if (rateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: "rate", message: "Too many checks, try again later." },
      { status: 429 },
    );
  }

  let body: { baseUrl?: string; apiKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const baseUrl = (body.baseUrl ?? "").trim();
  const apiKey = (body.apiKey ?? "").trim();

  if (!baseUrl || !apiKey) {
    return NextResponse.json({ ok: false, error: "missing" }, { status: 400 });
  }

  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return NextResponse.json({ ok: false, error: "url" }, { status: 400 });
  }
  if (!/^https?:$/.test(url.protocol)) {
    return NextResponse.json({ ok: false, error: "url" }, { status: 400 });
  }

  try {
    assertPublicHost(url.hostname);
  } catch (error) {
    const reason = (error as Error).message === "private" ? "private" : "dns";
    return NextResponse.json({ ok: false, error: reason }, { status: 400 });
  }

  let endpoint = url;
  const path = url.pathname.replace(/\/+$/, "");
  if (!path.endsWith("/models")) {
    endpoint = new URL(url.toString());
    endpoint.pathname = `${path}${path.endsWith("/v1") ? "" : "/v1"}/models`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  const started = Date.now();

  try {
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      signal: controller.signal,
      redirect: "manual",
      cache: "no-store",
    });

    const latencyMs = Date.now() - started;
    let models: string[] = [];
    let text = "";
    try {
      text = await response.text();
    } catch {
      text = "";
    }

    if (response.ok) {
      try {
        const parsed = JSON.parse(text) as {
          data?: { id?: string; name?: string }[];
          models?: { id?: string; name?: string }[];
        };
        const list: { id?: string; name?: string }[] = parsed?.data ?? parsed?.models ?? [];
        models = list
          .map((item) => item.id ?? item.name ?? "")
          .filter(Boolean)
          .slice(0, 60);
      } catch {
        models = [];
      }
    }

    return NextResponse.json({
      ok: response.ok,
      status: response.status,
      latencyMs,
      endpoint: endpoint.toString(),
      models,
      hint:
        response.ok
          ? null
          : response.status === 401 || response.status === 403
            ? "auth"
            : response.status === 404
              ? "not_found"
              : "http",
    });
  } catch (error) {
    const aborted = (error as Error).name === "AbortError";
    return NextResponse.json({
      ok: false,
      status: null,
      latencyMs: Date.now() - started,
      endpoint: endpoint.toString(),
      models: [],
      error: aborted ? "timeout" : "network",
    });
  } finally {
    clearTimeout(timeout);
  }
}
