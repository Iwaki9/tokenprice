import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "tr_admin";
const MAX_AGE = 60 * 60 * 24 * 7;

export function adminPassword() {
  return process.env.ADMIN_PASSWORD ?? "admin";
}

export function usingDefaultPassword() {
  return !process.env.ADMIN_PASSWORD;
}

function secret() {
  return process.env.ADMIN_SECRET ?? `tokenrate:${adminPassword()}`;
}

function sign(expires: number) {
  return createHmac("sha256", secret()).update(String(expires)).digest("hex");
}

function safeEqual(a: string, b: string) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export function checkPassword(value: string) {
  return safeEqual(value, adminPassword());
}

export async function isAdmin() {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return false;
  const [expires, signature] = raw.split(".");
  if (!expires || !signature) return false;
  if (Number(expires) < Date.now()) return false;
  return safeEqual(signature, sign(Number(expires)));
}

export async function setAdminCookie() {
  const expires = Date.now() + MAX_AGE * 1000;
  const store = await cookies();
  store.set(COOKIE, `${expires}.${sign(expires)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearAdminCookie() {
  const store = await cookies();
  store.delete(COOKIE);
}
