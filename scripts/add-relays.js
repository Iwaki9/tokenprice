/**
 * Upsert relay providers from a hand-verified endpoint map of which New-API
 * panels expose a reachable /api/pricing with sane flagship ratios.
 *
 *   node scripts/add-relays.js          dry run, print table
 *   node scripts/add-relays.js --commit write data/providers.json
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PROVIDERS_FILE = path.join(ROOT, "data", "providers.json");
const REPORT_FILE = path.join(ROOT, "data", "relay-report.json");

// host: verified /api/pricing (New-API) shape, sane flagship ratios.
// ref: user's catalog ref_program link (passion8 only has a public one today).
// ratio: calibrated 0.3 for all; 88api flagged (flagship rows pinned at 37.5,
//        needs manual calibration before activation).
const RELAYS = [
  { slug: "passion8", host: "passion8.cc", name: "Passion8", ref: "https://passion8.cc/sign-up?aff=CEjf", activate: true },
  { slug: "topapi", host: "topapi.io", name: "TopAPI", note: "partner-plan invite program, no public link yet" },
  { slug: "88api", host: "88api.ai", name: "88API", note: "flagship ratios pinned at 37.5 — calibrate before activation" },
  { slug: "zzshu", host: "zzshu.cc", name: "ZZShu", note: "some flagship rows pinned 37.5 — spot-check" },
  { slug: "shushutoken", host: "shushutoken.com", name: "Shushutoken", note: "flagship rows pinned 37.5 — spot-check" },
  { slug: "ergouapi", host: "ergouapi.com", name: "ErgouAPI" },
  { slug: "linoroute", host: "linoroute.com", name: "Linoroute" },
  { slug: "dragtokens", host: "dragtokens.com", name: "DragTokens" },
  { slug: "jiapi", host: "jiapi.top", name: "JiAPI", note: "intermittent TLS from this machine" },
  { slug: "layso", host: "api.layso.ai", name: "Layso", note: "veridrop promo -10% first deposit" },
  { slug: "zerocat", host: "zero.cat", name: "ZeroCat", note: "some rows pinned 37.5 — spot-check" },
];

const existing = JSON.parse(fs.readFileSync(PROVIDERS_FILE, "utf8"));
const existingHosts = new Set(
  existing
    .map((p) => {
      try {
        return new URL(p.homepage || p.apiBase || p.pricingUrl || "https://x.local/").hostname.replace(/^www\./, "");
      } catch {
        return "";
      }
    })
    .filter(Boolean),
);
const now = new Date().toISOString();
const added = [];
const updated = [];

for (const r of RELAYS) {
  const host = r.host.replace(/^www\./, "");
  if (existingHosts.has(host)) {
    console.log(`skip ${r.slug}: host ${host} already known`);
    continue;
  }
  if (existing.some((p) => p.slug === r.slug)) {
    console.log(`skip ${r.slug}: slug taken`);
    continue;
  }
  const entry = {
    slug: r.slug,
    name: r.name,
    taglineRu: "Релей из пользовательского каталога; цены — из публичной New-API панели сайта.",
    taglineEn: "Relay from the user's catalog; prices come from the site's public New-API pricing panel.",
    homepage: "https://" + host,
    apiBase: "https://" + host + "/v1",
    pricingUrl: "https://" + host + "/api/pricing",
    crawlAdapter: "newapi",
    crawlConfig: { ratioFactor: 0.3 },
    referralUrl: r.ref || undefined,
    features: { usageBased: true, crypto: true },
    tags: ["openai", "anthropic", "google"],
    minTopUp: null,
    status: r.activate ? "active" : "pending",
    isDemo: false,
    createdAt: now,
    updatedAt: now,
  };
  if (r.note) entry.crawlConfig.note = r.note;
  existing.push(entry);
  added.push(r.slug);
}

fs.writeFileSync(REPORT_FILE, JSON.stringify({ generatedAt: now, added }, null, 2) + "\n");
if (process.argv.includes("--commit")) {
  fs.writeFileSync(PROVIDERS_FILE, JSON.stringify(existing, null, 2) + "\n");
}
console.log(added.length ? "added: " + added.join(", ") : "nothing to add");
if (!process.argv.includes("--commit")) console.log("dry run — pass --commit to write");
