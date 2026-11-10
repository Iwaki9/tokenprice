#!/usr/bin/env node
// tokenrate — compare LLM API prices from the TokenRate feed.
// Zero dependencies. Feed: https://tokenprice.rest/api/prices.json (override: TOKENRATE_FEED or --feed)

const FEED = process.env.TOKENRATE_FEED ?? "https://tokenprice.rest/api/prices.json";

const MIXES = { balanced: 1, chat: 2, rag: 3, dev: 5, agent: 10 };

function parseArgs(argv) {
  const [command = "help", ...rest] = argv;
  const positional = [];
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    const token = rest[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = rest[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(token);
    }
  }
  return { command, positional, flags };
}

async function loadFeed(flags) {
  const url = flags.feed ?? FEED;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`feed HTTP ${res.status} from ${url}`);
  return res.json();
}

const money = (v) => (v === null || v === undefined ? "—" : `$${v >= 10 ? v.toFixed(1) : v.toFixed(v >= 1 ? 2 : 3)}`);
const blend = (input, output, ratio) => (ratio * input + output) / (ratio + 1);
const fmtNum = (n) => n.toLocaleString("en-US", { maximumFractionDigits: 4 });

function findModel(feed, query) {
  const q = query.toLowerCase();
  const bySlug = feed.models.find((m) => m.slug === q);
  if (bySlug) return bySlug;
  const toks = q.split(/[^a-z0-9]+/).filter(Boolean);
  const scored = feed.models
    .map((m) => {
      const hay = `${m.slug} ${m.name}`.toLowerCase();
      return { m, score: toks.filter((t) => hay.includes(t)).length };
    })
    .filter((x) => x.score === toks.length)
    .sort((a, b) => a.score - b.score);
  return scored[0]?.m ?? null;
}

function quotesFor(feed, modelSlug) {
  const active = new Set(feed.providers.map((p) => p.slug));
  return feed.quotes
    .filter((q) => q.model === modelSlug && active.has(q.provider))
    .map((q) => ({ ...q, providerName: feed.providers.find((p) => p.slug === q.provider)?.name ?? q.provider }));
}

function cmdPrice(feed, args) {
  const [model] = args.positional;
  if (!model) throw new Error("usage: tokenrate price <model> [--in N --out N] [--mix dev]");
  const m = findModel(feed, model);
  if (!m) throw new Error(`model "${model}" not in the catalogue (${feed.models.length} models). See: tokenrate models`);
  const ratio = MIXES[args.flags.mix ?? "dev"] ?? Number(args.flags.mix) ?? 5;
  const inTok = Number(args.flags.in ?? 2000);
  const outTok = Number(args.flags.out ?? 500);
  const reqs = Number(args.flags.requests ?? 1000);

  const rows = [
    {
      name: `official (${m.vendor})`,
      input: m.official.input,
      output: m.official.output,
      cache: m.official.cacheRead,
    },
    ...quotesFor(feed, m.slug).map((q) => ({ name: q.providerName, input: q.input, output: q.output, cache: q.cacheRead })),
  ];
  const perReq = rows.map((r) => ({ ...r, cost: (inTok / 1e6) * r.input + (outTok / 1e6) * r.output, blended: blend(r.input, r.output, ratio) }));
  perReq.sort((a, b) => a.cost - b.cost);

  const width = Math.max(20, ...perReq.map((r) => r.name.length));
  console.log(`\n${m.name} — ${fmtNum(inTok)} in + ${fmtNum(outTok)} out per request\n`);
  console.log(`${"provider".padEnd(width)}  ${"per req".padStart(10)}  ${`blended/1M @${ratio}:1`.padStart(20)}  ${"cached in".padStart(10)}`);
  for (const r of perReq) {
    console.log(`${r.name.padEnd(width)}  ${money(r.cost).padStart(10)}  ${money(r.blended).padStart(20)}  ${money(r.cache).padStart(10)}`);
  }
  const best = perReq[0];
  console.log(`\n  ${fmtNum(reqs)} requests ≈ ${money(best.cost * reqs)}   30 days @ ${fmtNum(reqs)}/day ≈ ${money(best.cost * reqs * 30)}`);
  if (!args.flags.json) console.log(`  feed snapshot: ${feed.generatedAt} — verify prices before buying.\n`);
  if (args.flags.json) console.log(JSON.stringify(perReq, null, 2));
}

function cmdCheapest(feed, args) {
  const ratio = MIXES[args.flags.mix ?? "dev"] ?? Number(args.flags.mix) ?? 5;
  const top = Number(args.flags.top ?? 15);
  const nameBySlug = new Map(feed.providers.map((p) => [p.slug, p.name]));
  const rows = feed.quotes
    .filter((q) => nameBySlug.has(q.provider) && (!args.flags.model || q.model === args.flags.model))
    .map((q) => ({ model: q.model, provider: nameBySlug.get(q.provider), blended: blend(q.input, q.output, ratio) }));
  const perModel = new Map();
  for (const m of feed.models) perModel.set(m.slug, { name: m.name, official: blend(m.official.input, m.official.output, ratio) });
  for (const r of rows) {
    const cur = perModel.get(r.model);
    if (!cur) continue;
    if (!cur.best || r.blended < cur.best.blended) cur.best = { provider: r.provider, blended: r.blended };
  }
  const list = [...perModel.values()]
    .filter((x) => x.best)
    .map((x) => ({ ...x, discount: x.official > 0 ? 1 - x.best.blended / x.official : 0 }))
    .sort((a, b) => a.best.blended - b.best.blended)
    .slice(0, top);
  console.log(`\nCheapest per 1M blended tokens @ ${ratio}:1 mix (feed ${feed.generatedAt}):\n`);
  for (const x of list) {
    const disc = x.discount > 0 ? `  (−${Math.round(x.discount * 100)}% vs official)` : "  (premium vs official)";
    console.log(`  ${x.best.blended.toFixed(2).padStart(8)} $/1M  ${x.name.padEnd(26)} ${x.best.provider}${disc}`);
  }
  console.log("");
}

function cmdModels(feed, args) {
  const q = (args.positional[0] ?? "").toLowerCase();
  for (const m of feed.models) {
    if (q && !`${m.slug} ${m.name} ${m.vendor}`.toLowerCase().includes(q)) continue;
    console.log(`  ${m.slug.padEnd(26)} ${m.vendor.padEnd(10)} ${money(m.official.input).padStart(8)} / ${money(m.official.output).padStart(8)}  ${m.status}`);
  }
}

function cmdHelp() {
  console.log(`tokenrate — LLM API price comparison (data: tokenprice.rest)

  tokenrate models [query]                 list catalogue (official prices)
  tokenrate price <model> [opts]           cost per request across providers
      --in N        input tokens per request   (default 2000)
      --out N       output tokens per request  (default 500)
      --mix NAME    balanced|chat|rag|dev|agent (default dev = 5:1)
      --requests N  how many requests to project (default 1000)
      --json        machine-readable output
  tokenrate cheapest [--mix dev] [--top 15]   cheapest providers per model
  tokenrate feed-url                       show the feed URL in use

Env: TOKENRATE_FEED to point at another instance.
Feed data is crawled daily and labelled with a snapshot time;
verify vendor prices before purchasing. Sponsored links policy: see repo README.
`);
}

const { command, positional, flags } = parseArgs(process.argv.slice(2));
try {
  if (command === "help" || command === "--help") {
    cmdHelp();
  } else if (command === "feed-url") {
    console.log(FEED);
  } else {
    const feed = await loadFeed(flags);
    const args = { positional, flags };
    if (command === "models") cmdModels(feed, args);
    else if (command === "price") cmdPrice(feed, args);
    else if (command === "cheapest") cmdCheapest(feed, args);
    else {
      console.error(`unknown command "${command}"\n`);
      cmdHelp();
      process.exitCode = 1;
    }
  }
} catch (error) {
  console.error(String(error.message ?? error));
  process.exitCode = 1;
}
