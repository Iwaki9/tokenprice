# tokenrate-cli

Compare LLM API prices from the [TokenRate feed](https://tokenprice.rest/api/prices.json)
without opening a browser. No dependencies, Node 18+.

```bash
# cost of a real request shape, across all catalogued providers
npx tokenrate-cli price gpt-5-6-luna --in 2000 --out 500

# same, projected over 10k requests/day, agent token mix (10:1 in:out)
npx tokenrate-cli price claude-sonnet-5-5 --mix agent --requests 10000

# cheapest providers per model right now
npx tokenrate-cli cheapest --top 15

# search the catalogue
npx tokenrate-cli models gemini
```

## How it works

One HTTPS `GET` to the public feed. The feed contains only public data
(models, official list prices, crawler-verified provider quotes, snapshot time).
`--mix` reproduces the blended-cost formula `(R×input + output)/(R+1)` used on
the site, so comparisons match what you see there.

Run `tokenrate feed-url` to see which endpoint is in use. Point it at your own
instance with `TOKENRATE_FEED=https://…/api/prices.json` or `--feed`.

## Honesty notes

- Prices come from crawlers and can lag; always verify on the vendor page before buying.
- Quotes labelled **premium** mean the reseller is *more expensive* than the official list — we show that too.
- The feed itself contains no affiliate/referral links.

MIT licensed, same repo as the website and crawler.
