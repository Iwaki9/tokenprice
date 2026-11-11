import { readFileSync } from "node:fs";
import { reasonNotListable } from "../src/lib/visibility";
import { computeStats } from "../src/lib/monitoring";
import type { Provider, PriceQuote } from "../src/lib/types";

const providers = JSON.parse(readFileSync("data/providers.json", "utf8")) as Provider[];
const prices = JSON.parse(readFileSync("data/prices.json", "utf8")) as PriceQuote[];
const probesRaw = readFileSync("data/probes.jsonl", "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));

const cases = ["polza", "tokemart", "openrouter"];
for (const slug of cases) {
  const p = providers.find((x) => x.slug === slug)!;
  const list = probesRaw.filter((x: any) => x.providerSlug === slug);
  const stats = list.length ? computeStats(list) : null;
  const reason = reasonNotListable(p, {
    stats: stats as any,
    quotes: prices.filter((q) => q.providerSlug === slug),
  });
  console.log(`${slug}: referral=${p.referralUrl ? "y" : "n"} demo=${p.isDemo ? 1 : 0} probes=${list.length} reason="${reason}"`);
}
