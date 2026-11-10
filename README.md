# LLM API price comparison (open data)

Curated, machine-readable comparison of LLM API list prices from official vendor
pages plus third-party provider quotes from our crawler. **40 models**,
updated automatically.

👉 Interactive version with hourly price checks, uptime monitoring and a cost
calculator: **[tokenprice.rest](https://tokenprice.rest)**
_(this site uses sponsored referral links; ranking is independent of them — see
[methodology](https://tokenprice.rest/en/methodology))._

## Official list prices (USD per 1M tokens)

Prices are the vendors' standard API tiers (not batch/flex), checked on
2026-11-10. Sources are linked per model in
[`data/official-prices.json`](data/official-prices.json).

| Model | Vendor | Input | Output | Cached input | Context | Cheapest crawler-verified quote |
|---|---|---:|---:|---:|---:|---|
| **Claude Opus 4.1** | anthropic | $15 | $75 | $1.50 | 200K | [Polza.ai](https://polza.ai) $22 / $110 |
| **Claude Opus 4** | anthropic | $15 | $75 | $1.50 | 200K | — |
| **Claude Sonnet 4.5** | anthropic | $3.00 | $15 | $0.300 | 200K | [Polza.ai](https://polza.ai) $4.38 / $22 |
| **Claude Sonnet 4** | anthropic | $3.00 | $15 | $0.300 | 200K | — |
| **Claude Haiku 3.5** | anthropic | $0.800 | $4.00 | $0.080 | 200K | — |
| **GPT-5** | openai | $1.25 | $10 | $0.125 | 200K | [Polza.ai](https://polza.ai) $1.83 / $15 |
| **GPT-5 mini** | openai | $0.250 | $2.00 | $0.025 | 200K | [Polza.ai](https://polza.ai) $0.183 / $1.46 (**−27%**) |
| **GPT-4o** | openai | $2.50 | $10 | $1.25 | 200K | [Polza.ai](https://polza.ai) $3.65 / $15 |
| **GPT-4o mini** | openai | $0.150 | $0.600 | $0.075 | 200K | [Polza.ai](https://polza.ai) $0.219 / $0.876 |
| **o3** | openai | $2.00 | $8.00 | $0.500 | 200K | [Polza.ai](https://polza.ai) $2.92 / $12 |
| **o4-mini** | openai | $1.10 | $4.40 | $0.275 | 200K | — |
| **Gemini 2.5 Pro** | google | $1.25 | $10 | $0.310 | 1049K | [Polza.ai](https://polza.ai) $0.913 / $7.30 (**−27%**) |
| **Gemini 2.5 Flash** | google | $0.300 | $2.50 | $0.075 | 1049K | [Polza.ai](https://polza.ai) $0.219 / $1.83 (**−27%**) |
| **Gemini 2.5 Flash Lite** | google | $0.100 | $0.400 | $0.025 | 1049K | [Polza.ai](https://polza.ai) $0.073 / $0.292 (**−27%**) |
| **Grok 4** | xai | $3.00 | $15 | $0.750 | 200K | — |
| **Grok 3** | xai | $3.00 | $15 | $0.750 | 200K | — |
| **Grok 3 mini** | xai | $0.300 | $0.500 | — | 200K | — |
| **DeepSeek V3.1** | deepseek | $0.270 | $1.10 | $0.070 | 200K | [DeepInfra](https://deepinfra.com) $0.250 / $0.950 (**−10%**) |
| **DeepSeek R1** | deepseek | $0.550 | $2.19 | $0.140 | 200K | [DeepInfra](https://deepinfra.com) $0.500 / $2.15 (**−6%**) |
| **Kimi K2** | moonshot | $0.600 | $2.50 | — | 200K | [Novita AI](https://novita.ai) $0.570 / $2.30 (**−6%**) |
| **Kimi K2 Thinking** | moonshot | $0.600 | $2.50 | — | 200K | [Novita AI](https://novita.ai) $0.600 / $2.50 |
| **GLM-4.6** | zhipu | $0.600 | $2.20 | — | 200K | [DeepInfra](https://deepinfra.com) $0.500 / $2.00 (**−13%**) |
| **GLM-4.5 Air** | zhipu | $0.200 | $1.10 | — | 200K | [Novita AI](https://novita.ai) $0.130 / $0.850 (**−29%**) |
| **Qwen3 Max** | qwen | $1.20 | $6.00 | — | 200K | — |
| **Qwen Plus** | qwen | $0.400 | $1.20 | — | 200K | [Polza.ai](https://polza.ai) $0.372 / $1.12 (**−7%**) |
| **Claude Fable 5.2** | anthropic | $8.00 | $40 | $0.200 | 400K | [Polza.ai](https://polza.ai) $11 / $57 |
| **Claude Opus 5.5** | anthropic | $4.00 | $20 | $0.200 | 400K | [DeepInfra](https://deepinfra.com) $4.00 / $20 |
| **Claude Sonnet 5.5** | anthropic | $2.00 | $10 | $0.100 | 400K | [DeepInfra](https://deepinfra.com) $2.00 / $10 |
| **Claude Haiku 5.5**<br>_⚠ Цена для промптов до 100K токенов; свыше 100K — $0.50 / $2.50._ | anthropic | $0.100 | $0.500 | $0.010 | 400K | [Polza.ai](https://polza.ai) $0.146 / $0.730 |
| **GPT-5.5**<br>_⚠ Контекст до 272K; свыше — $10 / $45._ | openai | $5.00 | $30 | $0.500 | 400K | [Polza.ai](https://polza.ai) $3.65 / $22 (**−27%**) |
| **GPT-5.6 Terra**<br>_⚠ Контекст до 272K; свыше — $4 / $18._ | openai | $2.00 | $12 | $0.200 | 400K | [Polza.ai](https://polza.ai) $1.46 / $8.76 (**−27%**) |
| **GPT-5.6 Luna**<br>_⚠ Контекст до 272K; свыше — $0.40 / $1.80._ | openai | $0.200 | $1.20 | $0.020 | 400K | [Polza.ai](https://polza.ai) $0.146 / $0.876 (**−27%**) |
| **GPT-4.1** | openai | $2.00 | $8.00 | $0.500 | 400K | [Polza.ai](https://polza.ai) $2.92 / $12 |
| **GPT-4.1 mini** | openai | $0.400 | $1.60 | $0.100 | 400K | [Polza.ai](https://polza.ai) $0.584 / $2.34 |
| **Gemini 3.8 Flash**<br>_⚠ Цена до 31.12.2026; с 01.01.2027 — $1.50 / $7.50._ | google | $0.750 | $3.75 | $0.075 | 1049K | [Polza.ai](https://polza.ai) $0.540 / $2.70 (**−28%**) |
| **Gemini 4 Argon**<br>_⚠ Цена до 30.11.2026; с 01.12.2026 — $4 / $20._ | google | $2.00 | $10 | $0.100 | 1049K | [Polza.ai](https://polza.ai) $1.44 / $7.20 (**−28%**) |
| **GPT-6 Astra**<br>_⚠ Контекст до 272K; свыше — $20 / $75._ | openai | $10 | $50 | $1.00 | 400K | [Polza.ai](https://polza.ai) $7.30 / $37 (**−27%**) |
| **GPT-6.1 Sol**<br>_⚠ Контекст до 272K; свыше — $4 / $15._ | openai | $2.00 | $10 | $0.100 | 400K | [Polza.ai](https://polza.ai) $1.46 / $7.30 (**−27%**) |
| **GPT-6.1 Terra**<br>_⚠ Контекст до 272K; свыше — $2 / $7.50._ | openai | $1.00 | $5.00 | $0.050 | 400K | [Polza.ai](https://polza.ai) $0.715 / $3.58 (**−28%**) |
| **GPT-6 Luna**<br>_⚠ Контекст до 272K; свыше — $0.20 / $0.75._ | openai | $0.100 | $0.500 | $0.010 | 400K | [Polza.ai](https://polza.ai) $0.073 / $0.365 (**−27%**) |

Provider quotes above are fetched by the crawler in this repo
([`crawler/index.ts`](crawler/index.ts)) from the providers' public pricing
APIs on 2026-11-10. **They change often — treat the table as a snapshot and
check [the live feed](https://tokenprice.rest/api/prices.json).**

## Machine-readable data

All data files are in [`data/`](data/) and regenerate daily via CI:

| File | What it contains |
|---|---|
| [`data/models.json`](data/models.json) | Model catalogue + official prices + source URLs |
| [`data/official-prices.json`](data/official-prices.json) | Official vendor prices with per-entry source and date |
| [`data/providers.json`](data/providers.json) | Provider directory + crawl configs |
| [`data/prices.json`](data/prices.json) | Latest provider quotes (USD per 1M tokens) |
| Live feed | `GET https://tokenprice.rest/api/prices.json` |

## CLI

A tiny dependency-free CLI that uses the same feed:

```bash
npx tokenrate-cli price gpt-5-6-luna --in 2000 --out 500
npx tokenrate-cli cheapest --mix dev
```

Source: [`cli/`](cli/).

## Methodology

- **Blended cost** normalises "price per 1M tokens" to a chosen input:output
  ratio (chat, code, agents), because output tokens cost 3–6× input everywhere.
- **Quality index** = 40% uptime + 30% stability (30d) + 30% p95 latency, from
  probes every 30 minutes against public endpoints.
- Referral/sponsored links never affect ranking. Listings without a verified
  price source are labelled as demo.

## This repository

The website, admin panel and crawler are the same codebase — see
[docs/PROJECT.md](docs/PROJECT.md) (Next.js 16 + Cloudflare Workers + D1).

## Disclaimer

Prices are collected in good faith and are provided **without warranty of any
kind**. Always verify prices on the vendor's own page before purchasing.
Vendors change pricing, run promos with deadlines and add new models faster
than any static table can follow.

## License

Data and code in this repository are licensed under [MIT](LICENSE).
