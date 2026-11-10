import type { MetadataRoute } from "next";
import { getDb } from "@/lib/store";
import { site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = await getDb();
  const base = `https://${site.domain}`;
  const languages = ["ru", "en"] as const;
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [];

  const staticPaths = [
    "",
    "/models",
    "/providers",
    "/compare",
    "/check",
    "/submit",
    "/blog",
    "/methodology",
    "/privacy-policy",
    "/terms-of-use",
    "/disclaimer",
    "/contact",
  ];

  for (const lang of languages) {
    for (const path of staticPaths) {
      entries.push({
        url: `${base}/${lang}${path}`,
        lastModified: now,
        changeFrequency: path === "" ? "daily" : "weekly",
        priority: path === "" ? 1 : 0.7,
      });
    }
    for (const model of db.models) {
      entries.push({
        url: `${base}/${lang}/models/${model.slug}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.9,
      });
    }
    for (const provider of db.providers.filter((p) => p.status === "active")) {
      entries.push({
        url: `${base}/${lang}/providers/${provider.slug}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.8,
      });
    }
  }

  return entries;
}
