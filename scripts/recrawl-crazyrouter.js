// crazyrouter was crawled before the pinned-ratio filter landed. Re-crawl it so
// the bad 37.5-pinned quotes (11.25/22.5) are dropped, keep the rest.
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const pricesFile = path.join(ROOT, "data", "prices.json");
const prices = JSON.parse(fs.readFileSync(pricesFile, "utf8"));

// Remove ALL crazyrouter quotes; they get re-crawled fresh from the endpoint.
const cleaned = prices.filter((q) => q.providerSlug !== "crazyrouter");
fs.writeFileSync(pricesFile, JSON.stringify(cleaned, null, 2) + "\n");
console.log("removed", prices.length - cleaned.length, "stale crazyrouter quotes, kept", cleaned.length);

execFileSync(
  process.execPath,
  ["node_modules/.bin/tsx", "crawler/index.ts", "prices", "--only", "crazyrouter"],
  { cwd: ROOT, stdio: "inherit", env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID ?? "" } },
);
