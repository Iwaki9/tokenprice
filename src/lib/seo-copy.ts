import type { Lang } from "./site";
import type { FaqItem } from "@/components/json-ld";

/**
 * Long-tail copy helpers for model and "cheapest" pages.
 * Everything is data-driven: when prices update, the text updates too.
 */

export type ModelPriceFacts = {
  name: string;
  vendor: string;
  input: number;
  output: number;
  cacheRead: number | null;
  contextWindow: number | null;
  /** cheapest independent quote, if any */
  cheapest: { name: string; input: number; output: number; savings: number; isDemo: boolean } | null;
  providerCount: number;
};

function blend(f: ModelPriceFacts) {
  return (f.input + f.output) / 2;
}

const money = (v: number) => `$${v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(2) : v.toFixed(3)}`;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const ctx = (tokens: number | null) =>
  tokens ? `${(tokens / 1000).toFixed(0).replace(/\.0$/, "")}K` : null;

export function modelFaq(lang: Lang, f: ModelPriceFacts): FaqItem[] {
  const cache = f.cacheRead
    ? lang === "ru"
      ? ` Кэшированный ввод — ${money(f.cacheRead)} за 1M токенов, то есть в ${Math.round(f.input / f.cacheRead)} раз дешевле обычного.`
      : ` Cached input is ${money(f.cacheRead)} per 1M tokens, ${Math.round(f.input / f.cacheRead)}× cheaper than the regular input.`
    : "";
  const cheapestRu = f.cheapest
    ? `По нашим замерам дешевле всего ${f.cheapest.name}: минус ${pct(f.cheapest.savings)} к официальному прайсу${f.cheapest.isDemo ? " (страница-пример)" : ""}. Котировки ${f.providerCount} провайдеров обновляются ежедневно — смотрите таблицу выше.`
    : `Котировок независимых провайдеров по этой модели пока нет. Мы парсим прайсы ежедневно, и сравнение появится здесь автоматически.`;
  const cheapestEn = f.cheapest
    ? `Our measurements show ${f.cheapest.name} as the cheapest: ${pct(f.cheapest.savings)} below the official price${f.cheapest.isDemo ? " (sample listing)" : ""}. Quotes from ${f.providerCount} providers refresh daily — see the table above.`
    : `There are no third-party quotes for this model yet. We parse price lists daily and the comparison appears here automatically.`;

  const contextQ = ctx(f.contextWindow);
  return [
    {
      q: lang === "ru" ? `Сколько стоит API ${f.name}?` : `What does the ${f.name} API cost?`,
      a:
        lang === "ru"
          ? `Официальный прайс ${f.vendor}: ${money(f.input)} за 1M входных токенов и ${money(f.output)} за 1M выходных.${cache}`
          : `The official ${f.vendor} list price is ${money(f.input)} per 1M input tokens and ${money(f.output)} per 1M output tokens.${cache}`,
    },
    {
      q: lang === "ru"
        ? `Сколько стоит миллион токенов ${f.name}?`
        : `How much does 1 million tokens of ${f.name} cost?`,
      a:
        lang === "ru"
          ? `1M входных токенов — ${money(f.input)}, 1M выходных — ${money(f.output)}. При нагрузке «вход:выход = 1:1» миллион токенов обходится примерно в ${money(blend(f))}. У чат-ботов с длинным контекстом доля входа выше, и цена за миллион ниже; у кодогенерации наоборот — выше.`
          : `1M input tokens cost ${money(f.input)}, 1M output tokens — ${money(f.output)}. With a 1:1 input/output load a million tokens works out to about ${money(blend(f))}. Chatbots with long context push the blended price down; code generation pushes it up.`,
    },
    {
      q: lang === "ru" ? `Где дешевле купить ${f.name}?` : `Where is the ${f.name} API cheapest?`,
      a: lang === "ru" ? cheapestRu : cheapestEn,
    },
    ...(contextQ
      ? [{
          q: lang === "ru" ? `Какой контекст у ${f.name}?` : `What is the ${f.name} context window?`,
          a:
            lang === "ru"
              ? `Окно контекста — ${contextQ} токенов. У некоторых вендоров цена на длинном контексте вырастает: следите за порогом в описании тарифа.`
              : `The context window is ${contextQ} tokens. Some vendors raise the price above a context threshold — check the plan notes.`,
        }]
      : []),
    {
      q: lang === "ru" ? "Как проверить, что ключ провайдера работает?" : "How do I check that a provider key works?",
      a:
        lang === "ru"
          ? "Бесплатный чекер отправит GET-запрос к списку моделей вашего эндпоинта и покажет статус и латентность. Ключ не сохраняется на сервере."
          : "The free checker sends a GET request to your endpoint's model list and reports status and latency. The key is not stored server-side.",
    },
  ];
}

export function modelSeoParagraph(lang: Lang, f: ModelPriceFacts): string {
  if (lang === "ru") {
    const range = f.cheapest
      ? `Независимые провайдеры в нашем каталоге продают ${f.name} по ${money(f.cheapest.input)} вход / ${money(f.cheapest.output)} выход (${pct(f.cheapest.savings)} ниже официального прайса). `
      : "";
    return `Цены на ${f.name} мы собираем двумя способами: официаль прайс ${f.vendor} и котировки провайдеров, которых краулер опрашивает ежедневно. ${range}Сравнение приведено к смешанной цене при пропорции вход:выход, чтобы «цена за 1M токенов ${f.name}» означала одно и то же на всех страницах.`;
  }
  const range = f.cheapest
    ? `Providers in our catalogue sell ${f.name} at ${money(f.cheapest.input)} in / ${money(f.cheapest.output)} out (${pct(f.cheapest.savings)} below the official list). `
    : "";
  return `We collect ${f.name} prices two ways: the official ${f.vendor} list and quotes from providers our crawler checks daily. ${range}Everything is normalised to a blended cost at a chosen input:output ratio, so “${f.name} price per 1M tokens” means the same thing on every page.`;
}

export function cheapestCopy(lang: Lang, f: ModelPriceFacts): { title: string; intro: string } {
  if (lang === "ru") {
    return {
      title: f.cheapest
        ? `Где дешевле купить API ${f.name}: ${f.cheapest.name} на ${pct(f.cheapest.savings)} ниже официального прайса`
        : `API ${f.name}: официальные цены и где искать дешевле`,
      intro:
        f.cheapest
          ? `${f.name} стоит ${money(f.input)}/${money(f.output)} за 1M токенов у ${f.vendor}. Дешевле всего — ${f.cheapest.name}: ${money(f.cheapest.input)} вход и ${money(f.cheapest.output)} выход. Ниже — вся таблица котировок и что важно проверить перед покупкой.`
          : `${f.name} по официальному прайсу: ${money(f.input)} вход и ${money(f.output)} выход за 1M токенов. Котировок посредников пока нет — следим за прайсами ежедневно.`,
    };
  }
  return {
    title: f.cheapest
      ? `Cheapest ${f.name} API: ${f.cheapest.name} is ${pct(f.cheapest.savings)} below the official price`
      : `${f.name} API pricing: the official list and where to look next`,
    intro:
      f.cheapest
        ? `${f.name} costs ${money(f.input)}/${money(f.output)} per 1M tokens from ${f.vendor}. The cheapest quote is ${f.cheapest.name}: ${money(f.cheapest.input)} in, ${money(f.cheapest.output)} out. Full table and buying checklist below.`
        : `${f.name} at list price: ${money(f.input)} input and ${money(f.output)} output per 1M tokens. No third-party quotes yet — we re-parse price lists daily.`,
  };
}
