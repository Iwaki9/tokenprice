const fs = require("fs");
const f = "data/providers.json";
const l = JSON.parse(fs.readFileSync(f, "utf8"));
for (const p of l) {
  if (p.slug === "88api") {
    p.status = "hidden";
    p.note = "New-API /api/pricing feed is pinned at ratio 37.5 (admin default) on 2026-11-11 — uncalibrated, hidden until recalibrated.";
    p.updatedAt = new Date().toISOString();
  }
}
fs.writeFileSync(f, JSON.stringify(l, null, 2) + "\n");
console.log("88api set hidden, total", l.length);
