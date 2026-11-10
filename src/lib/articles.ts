import type { Lang } from "./site";

export type ArticleSection = { h: string; p: string };
export type ArticleCopy = {
  title: string;
  description: string;
  intro: string;
  sections: ArticleSection[];
};
export type Article = { slug: string; publishedAt: string; ru: ArticleCopy; en: ArticleCopy };

/**
 * Long-form guides for long-tail search queries.
 * All numbers are list prices published by vendors, checked 2026-11-11.
 */
export const articles: Article[] = [
  {
    slug: "token-cost-guide",
    publishedAt: "2026-11-11",
    ru: {
      title: "Как считается цена токенов в API LLM: вход, выход, кэш и пороги контекста",
      description:
        "Почему выходные токены в 3–6 раз дороже входных, как вывести свою blended-цену за 1M токенов и когда кэш промпта экономит больше, чем скидка провайдера.",
      intro:
        "«Цена за миллион токенов» — это не одно число: у одной и той же модели цена зависит от того, сколько токенов вы отправляете и сколько получаете, кэшируются ли промпты и какой длины контекст. Разбираем по формулам на актуальных прайсах ноября 2026.",
      sections: [
        {
          h: "Вход и выход — разные деньги",
          p: "Обработка входных токенов (prefill) параллелится, а генерация выходных идёт последовательно — поэтому выход почти всегда дороже входа в разы. У GPT-5.5 Official — $5/$30 за 1M (в 6 раз), у Claude Opus 5.5 — $4/$20 (в 5 раз), у дешёвого GPT-5.6 Luna — $0.2/$1.2 (в 6 раз). Сравнение моделей по входным токенам без выходных вводит в заблуждение: у чата вход dominant, у кодогенерации — выход.",
        },
        {
          h: "Blended-цена: считаем под свою нагрузку",
          p: "Если на каждый выходной токен приходится R входных, смешанная цена = (R×вход + выход)/(R+1). Пример: GPT-5.5, агентный сценарий 10:1 → (10×5+30)/11 ≈ $7.27 за 1M. Вопрос-ответ 2:1 → (2×5+30)/3 ≈ $13.33. Один и тот же прайс даёт двукратную разницу на разных задачах — поэтому в наших рейтингах цена пересчитывается под пропорцию токенов, а не берётся «в вакууме».",
        },
        {
          h: "Реальный запрос: 2 000 токенов входа, 500 выхода",
          p: "Такой запрос стоит $0.025 у GPT-5.5, $0.018 у Claude Opus 5.5, $0.009 у Claude Sonnet 5.5 и $0.00065 у Claude Haiku 5.5. При 1 000 запросах в день это $761, $548, $274 и $20 в месяц соответственно. Разница между флагманом и эконом-классом — почти 40 раз, и скидками посредников её не закрыть: экономнее выбирать модель, а не переплачивать за ту же.",
        },
        {
          h: "Кэш промптов: до 90% экономии на входе",
          p: "Anthropic берёт за чтение кэшированного входа $0.20 за 1M у Opus 5.5 против $4 обычного — в 20 раз дешевле, но запись кэша дороже обычного входа ($5). Кэш окупается, когда один системный промпт переиспользуется много раз: при 70% попаданий blended-цена GPT-5.5 на задаче 10:1 падает с $7.27 до примерно $4.41. Провайдеры с дешёвым входом, но без кэша, на длинных промптах проигрывают.",
        },
        {
          h: "Пороги контекста и сроки акций",
          p: "У OpenAI цены на контекст выше 272K токенов удваиваются (GPT-5.5: $10/$45 вместо $5/$30). У Claude Haiku 5.5 два тарифа: до и после 100K токенов в промпте. У Google действует акционная цена Gemini 3.8 Flash ($0.75/$3.75) до 31 декабря 2026 — с января станет $1.50/$7.50. Сравнение, не учитывающее пороги и даты, врёт: в карточках моделей мы помечаем такие условия отдельной строкой.",
        },
        {
          h: "Batch и оптовые схемы",
          p: "Официальный batch-режим у вендоров — обычно −50% к обеим сторонам, но ответ приходит часами. Агрегаторы дают 10–30% к обычной синхронной цене за счёт объёмных контрактов и кэш-попаданий. Считайте итог по blended-цене под свою задачу: если нагрузка офлайн-аналитика, batch победит любого посредника.",
        },
      ],
    },
    en: {
      title: "How LLM API token pricing works: input, output, cache and context tiers",
      description:
        "Why output tokens cost 3–6× more than input, how to compute your own blended price per 1M tokens, and when prompt caching saves more than any reseller discount.",
      intro:
        "“Price per million tokens” is not a single number: the real cost depends on how many tokens you send versus receive, whether prompts are cached, and how long the context is. Here is the math on November 2026 list prices.",
      sections: [
        {
          h: "Input and output are priced differently",
          p: "Prefill parallelises, decoding does not — so output costs several times input. GPT-5.5 is $5/$30 per 1M (6×), Claude Opus 5.5 is $4/$20 (5×), budget GPT-5.6 Luna is $0.2/$1.2 (6×). Comparing models on input price alone misleads: chat is input-heavy, code generation is output-heavy.",
        },
        {
          h: "Blended cost for your workload",
          p: "With R input tokens per output token, blended = (R×input + output)/(R+1). GPT-5.5 at an agentic 10:1 → (10×5+30)/11 ≈ $7.27 per 1M. At a Q&A 2:1 → (2×5+30)/3 ≈ $13.33. The same list price differs 2× across workloads — that is why our rankings normalise by token mix instead of quoting “in a vacuum” numbers.",
        },
        {
          h: "A real request: 2,000 input, 500 output",
          p: "That request costs $0.025 on GPT-5.5, $0.018 on Claude Opus 5.5, $0.009 on Claude Sonnet 5.5 and $0.00065 on Claude Haiku 5.5. At 1,000 requests a day it is $761, $548, $274 and $20 a month. Flagship-to-budget spread is nearly 40×, and no reseller discount closes it: pick a cheaper model before hunting a cheaper vendor.",
        },
        {
          h: "Prompt caching: up to 90% off the input",
          p: "Anthropic charges $0.20 per 1M for cached reads on Opus 5.5 versus $4 regular — 20× cheaper — while cache writes cost more than plain input ($5). With 70% cache hits the blended GPT-5.5 price on a 10:1 task falls from $7.27 to roughly $4.41. Cheap-input providers without caching lose on long prompts.",
        },
        {
          h: "Context tiers and promo deadlines",
          p: "OpenAI doubles prices above 272K context (GPT-5.5: $10/$45). Claude Haiku 5.5 has two tiers around a 100K prompt threshold. Google's promotional Gemini 3.8 Flash price ($0.75/$3.75) holds until December 31, 2026 — then $1.50/$7.50. A comparison that ignores tiers and dates is wrong; our model cards flag both.",
        },
        {
          h: "Batch and wholesale schemes",
          p: "Official batch modes are typically −50% on both sides but answer in hours. Aggregators shave 10–30% off synchronous prices via volume contracts and cache hits. Run the numbers at your blended cost: for offline analytics, batch beats any reseller.",
        },
      ],
    },
  },
  {
    slug: "cheaper-claude-gpt-api",
    publishedAt: "2026-11-11",
    ru: {
      title: "Где взять Claude и GPT дешевле: официальный прайс, кэш, batch и посредники",
      description:
        "Три законных способа платить меньше официального прайса за Claude и GPT и один спорный — с рисками и чек-листом проверки перед покупкой.",
      intro:
        "Один и тот же Claude Opus 5.5 стоит по-разному: официальная цена — только базовая точка. Ниже — что даёт скидку честно (кэш, batch, акции вендора) и как отличить выгодного посредника от схемы «постоянно и без гарантий».",
      sections: [
        {
          h: "Официальные инструменты экономии",
          p: "Скидка за кэш промпта у Anthropic: чтение — $0.20 против $4 за 1M на Opus 5.5. Batch у OpenAI и Anthropic — около −50% к прайсу при отсрочке ответа до часов. Акционные тарифы Google (Gemini 3.8 Flash до конца 2026) и OpenAI (GPT-5.6 Sol на промо до конца ноября) — временные, но реальные −50%. Итог: при грамотной архитектуре экономия до 4× без всяких посредников.",
        },
        {
          h: "Агрегаторы и ретрансляторы: почему дешевле",
          p: "Перекупатели токенов живут за счёт трёх вещей: корпоративные объёмные контракты вендора, кэш-попадания на общей инфраструктуре и гео-арбитраж тарифов. Легальные мульти-аккаунтные агрегаторы (DeepInfra, Novita, Polza) продают тот же Claude Opus 5.5 с наценкой к прайсу или скидкой 10–30%.",
        },
        {
          h: "Где начинается риск",
          p: "Схема «$1000 Claude за 300 рублей» почти всегда означает один из вариантов: ключи из украденных аккаунтов, региональные промо-тарифы, нарушение ToS вендора, или схему «погаснет через месяц». Признаки: нет публичного прайса, нет юрисдикции, оплата только картой/криптой без НДС, поддержка-телеграм. Для бизнес-нагрузки цена ошибки — не скидка, а потеря данных и простой.",
        },
        {
          h: "Чек-лист проверки посредника",
          p: "1) Публичный прайс-лист или API с ценами — мы такие парсим ежедневно. 2) GET /models отвечает без ключа — бесплатный чекер на сайте проверяет это за вас. 3) Минимальное пополнение и способы оплаты. 4) Стабильность: наш мониторинг опрашивает эндпоинты каждые 30 минут. 5) Прозрачность: пометки «демо» на listings без подтверждённых цен. Ни один пункт не гарантирует безопасность, но их отсутствие — гарантирует проблемы.",
        },
        {
          h: "Как мы считаем рейтинг",
          p: "TokenRate — независимый агрегатор цен. Мы не продаём доступ к моделям; ссылки на провайдеров спонсорские (метка rel=\"sponsored\"), но на порядок сортировки они не влияют: рейтинг строится на смешанной цене под вашу задачу и данных мониторинга. Котировки без подтверждённого источника помечаются как демо.",
        },
      ],
    },
    en: {
      title: "Where to get Claude and GPT cheaper: official list, caching, batch and resellers",
      description:
        "Three legitimate ways to pay less than list price for Claude and GPT, plus one grey one — with risks and a verification checklist before you buy.",
      intro:
        "The same Claude Opus 5.5 costs different amounts depending on where you buy it. Official pricing is only the baseline. Below: what discounts are fair (caching, batch, vendor promos) and how to tell a good reseller from a scheme.",
      sections: [
        {
          h: "Official savings",
          p: "Anthropic prompt-caching reads cost $0.20 vs $4 per 1M on Opus 5.5. Batch at OpenAI and Anthropic is about −50% with hourly latency. Promo tiers — Google's Gemini 3.8 Flash until end of 2026, OpenAI's Sol until end of November — are temporary but real −50%. Well-architected apps save up to 4× with no reseller at all.",
        },
        {
          h: "Why aggregators are cheaper",
          p: "Token resellers earn on three things: volume contracts with vendors, cache hits on shared infrastructure, and geo-arbitrage of list prices. Legal multi-account aggregators (DeepInfra, Novita, Polza) sell the same Claude Opus 5.5 at a 10–30% discount or a small markup.",
        },
        {
          h: "Where risk starts",
          p: "“Claude worth $1000 for $30” usually means stolen keys, abused regional promos, vendor ToS violations, or a service that dies in a month. Red flags: no public price list, no jurisdiction, crypto-only top-ups, Telegram-only support. For production the failure cost is data and downtime, not the discount.",
        },
        {
          h: "Reseller checklist",
          p: "1) Public pricing page or API — we crawl them daily. 2) GET /models answers without a key — our free checker verifies this. 3) Minimum top-up and payment methods. 4) Stability: our monitor probes endpoints every 30 minutes. 5) Transparency: demo listings should be labelled. None of these guarantee safety; their absence guarantees trouble.",
        },
        {
          h: "How we rank",
          p: "TokenRate is an independent price aggregator. We do not sell model access; provider links are sponsored (rel=\"sponsored\"), but sponsorship never changes sort order — ranking is built on blended cost for your workload and monitoring data. Quotes without a confirmed source are marked demo.",
        },
      ],
    },
  },
  {
    slug: "openai-vs-anthropic-vs-google-100k-requests",
    publishedAt: "2026-11-11",
    ru: {
      title: "OpenAI vs Anthropic vs Google: стоимость 100 000 одинаковых запросов",
      description:
        "Считаем, во сколько обойдётся пакет из 100 000 запросов (2 000 токенов входа, 500 выхода) на флагманах и эконом-классах трёх вендоров по прайсам ноября 2026.",
      intro:
        "Абстрактные «цены за 1M токенов» сложно сравнить с бюджетом. Возьмём типовую задачу — 100 000 запросов по 2 000 входных и 500 выходных токенов — и посчитаем прямые деньги.",
      sections: [
        {
          h: "Флагманы",
          p: "GPT-5.5 ($5/$30): 100 000 запросов = $2 500. Claude Opus 5.5 ($4/$20): $1 800. Claude Sonnet 5.5 ($2/$10): $900. Gemini 4 Argon по акции ($2/$10): $900, после 1 декабря — $1 800 ($4/$20). На равных задачах Opus 5.5 дороже Sonnet ровно вдвое — разница между «максимальное качество» и «хорошо» в деньгах.",
        },
        {
          h: "Средний класс",
          p: "Gemini 3.8 Flash ($0.75/$3.75 до конца 2026): $338 — самый дешёвый флагман по качеству «почти как Sonnet». GPT-5.6 Terra ($2/$12): $1 000. DeepSeek V3.1 ($0.27/$1.10): $109 — на порядок дешевле всех при качестве, достаточном для RAG и суммаризации.",
        },
        {
          h: "Эконом-класс",
          p: "Claude Haiku 5.5 ($0.10/$0.50): $45. GPT-5.6 Luna ($0.20/$1.20): $100. На этих моделях весь пакет стоит как один день работы GPT-5.5. Если задача классифицируется простым промптом, разница в 20–50 раз — это и есть главный аргумент за каскад «эконом → флагман по необходимости».",
        },
        {
          h: "Кэш меняет расклад",
          p: "При одинаковом системном промпте и 70% попаданий в кэш GPT-5.5 дешевеет с $2 500 примерно до $1 870, Claude Opus 5.5 — с $1 800 до $1 270. На агентах с огромным контекстом кэш даёт большую скидку, чем выбор более дешёвого вендора: сначала включайте кэш, потом сравнивайте прайсы.",
        },
        {
          h: "Итог",
          p: "Разброс для одной и той же нагрузки — от $45 (Haiku) до $2 500 (GPT-5.5) — 55 раз. Прайсы меняются: Gemini 3.8 Flash подорожает с января 2027, GPT-5.6 Sol живёт на промо до 30 ноября. Актуальные котировки посредников и мониторинг доступности — в каталоге моделей, пересчитать под свою пропорцию токенов можно в калькуляторе на любой странице модели.",
        },
      ],
    },
    en: {
      title: "OpenAI vs Anthropic vs Google: the cost of 100,000 identical requests",
      description:
        "We price a 100,000-request batch (2,000 input, 500 output tokens) on flagships and budget tiers of all three vendors, using November 2026 list prices.",
      intro:
        "Abstract “per million tokens” numbers are hard to compare with a real budget. Take a concrete job — 100,000 requests, 2,000 input and 500 output tokens each — and compute straight money.",
      sections: [
        {
          h: "Flagships",
          p: "GPT-5.5 ($5/$30): 100,000 requests = $2,500. Claude Opus 5.5 ($4/$20): $1,800. Claude Sonnet 5.5 ($2/$10): $900. Gemini 4 Argon on promo ($2/$10): $900, $1,800 after December 1 ($4/$20). Opus is exactly 2× Sonnet — that is the price of “maximum quality” over “very good”.",
        },
        {
          h: "Middle class",
          p: "Gemini 3.8 Flash ($0.75/$3.75 until end of 2026): $338 — the cheapest near-Sonnet option. GPT-5.6 Terra ($2/$12): $1,000. DeepSeek V3.1 ($0.27/$1.10): $109 — an order of magnitude cheaper with quality enough for RAG and summarisation.",
        },
        {
          h: "Budget tier",
          p: "Claude Haiku 5.5 ($0.10/$0.50): $45. GPT-5.6 Luna ($0.20/$1.20): $100. On these models the whole batch costs one day of GPT-5.5. If your task fits a simple prompt, the 20–50× gap is the argument for a “budget first, flagship if needed” cascade.",
        },
        {
          h: "Caching reshuffles the table",
          p: "With a shared system prompt and 70% cache hits, GPT-5.5 drops from $2,500 to about $1,870 and Claude Opus 5.5 from $1,800 to $1,270. On long-context agents caching saves more than switching vendors: turn caching on before comparing lists.",
        },
        {
          h: "Bottom line",
          p: "The spread for one workload is $45 to $2,500 — 55×. Prices move: Gemini 3.8 Flash rises in January 2027, GPT-5.6 Sol runs on promo only until November 30. Live third-party quotes and uptime monitoring are in the model catalogue; the per-model calculator re-prices any token mix.",
        },
      ],
    },
  },
];

export function getArticle(slug: string, lang: Lang): Article["ru"] | null {
  const a = articles.find((x) => x.slug === slug);
  return a ? a[lang] : null;
}
