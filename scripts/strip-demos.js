// One-shot: strip demo data from local files (providers, prices, probes, submissions).
const fs = require("fs");
const path = require("path");
const D = path.join(__dirname, "..", "data");

const providers = JSON.parse(fs.readFileSync(path.join(D, "providers.json"), "utf8"));
const real = providers.filter((p) => !p.isDemo);
const slugs = new Set(real.map((p) => p.slug));
console.log(`providers: ${providers.length} -> ${real.length}`);
fs.writeFileSync(path.join(D, "providers.json"), JSON.stringify(real, null, 2) + "\n");

const prices = JSON.parse(fs.readFileSync(path.join(D, "prices.json"), "utf8"));
const keptPrices = prices.filter((q) => slugs.has(q.providerSlug));
console.log(`prices: ${prices.length} -> ${keptPrices.length}`);
fs.writeFileSync(path.join(D, "prices.json"), JSON.stringify(keptPrices, null, 2) + "\n");

const pf = path.join(D, "probes.jsonl");
const lines = fs.readFileSync(pf, "utf8").split("\n").filter(Boolean);
const kept = lines.filter((l) => {
  try {
    return slugs.has(JSON.parse(l).providerSlug);
  } catch {
    return false;
  }
});
console.log(`probes: ${lines.length} -> ${kept.length}`);
fs.writeFileSync(pf, kept.join("\n") + "\n");

const sf = path.join(D, "submissions.json");
if (fs.existsSync(sf)) {
  const subs = JSON.parse(fs.readFileSync(sf, "utf8"));
  const realSubs = subs.filter((s) => !/^s\d+demo$/i.test(s.id));
  console.log(`submissions: ${subs.length} -> ${realSubs.length}`);
  fs.writeFileSync(sf, JSON.stringify(realSubs, null, 2) + "\n");
}
