# TokenRate — индекс цен на LLM API

Агрегатор опубликованных цен на API языковых моделей + мониторинг доступности
провайдеров-перекупщиков. RU/EN, реферальная монетизация, админка с CRUD,
бесплатный чекер API.

Собран на Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind 4.
Данные лежат в JSON-файлах в `data/` — без базы, чтобы проект можно было
поднять одной командой и версионировать цены в git.

## Быстрый старт

```bash
npm install
npm run seed          # демо-датасет (25 моделей, 10 провайдеров, 146 котировок)
npm run dev           # http://localhost:3000 → редирект на /ru
```

Админка: `/ru/admin`, пароль по умолчанию `admin`
(см. `ADMIN_PASSWORD` в `.env.example` — до деплоя обязательно задать свой).

```bash
npm run build         # прод-сборка
npm start             # прод-сервер
npm run typecheck     # tsc --noEmit
```

## Структура

```
data/                 данные (источник правды)
  vendors.json        вендоры: Anthropic, OpenAI, Google, xAI…
  models.json         модели + официальные цены (USD за 1M токенов) + ссылка на прайс
  providers.json      провайдеры: реферальная ссылка, теги, фичи, apiBase/pricingUrl
  prices.json         котировки провайдеров: input/output/cache + источник + дата
  submissions.json    заявки на добавление
  clicks.jsonl        лог переходов по реферальным ссылкам (не в git)
  probes.jsonl        история health-проверок (не в git)
src/lib/              типы, хранилище, расчёт рейтинга, мониторинг, i18n, auth
src/app/[lang]/       страницы RU/EN
  page.tsx            главная: доски моделей + фильтры
  models/             каталог и страница модели (сортировки, бюджет, калькулятор)
  providers/          каталог и страница провайдера (цены, мониторинг, альтернативы)
  compare/            сравнение моделей по токенам на бюджет
  check/              чекер API-ключа
  submit/             заявка провайдера
  admin/              админка (обзор, провайдеры, заявки, переходы)
src/app/visit/[slug]  редирект по реферальной ссылке + логирование клика
src/app/api/check     серверный чекер (SSRF-защита, rate-limit)
crawler/              краулер цен и health-проб
scripts/seed.ts       генератор демо-данных
```

## Как считается рейтинг

Каждая доска — одна модель. Смесь вход:выход задаётся пресетом (по умолчанию 1:1):

```
blended = (ratio * input + output) / (ratio + 1)      // $ за 1M смешанных токенов
tokens  = budget / blended * 1_000_000
saving  = 1 - blended_provider / blended_official
```

Сортировка по токенам на бюджет. Планы, бонусы, кэш и комиссии в расчёт не входят.
Формула полностью описана на странице `/[lang]/methodology`.

Индекс качества провайдера (`composite`, 0–100) = 40% аптайм + 30% стабильность 30д
+ 30% скорость (p95). Считается по `data/probes.jsonl`.

## Добавление провайдера

Два пути:

1. **Админка** — `/ru/admin/providers/new`. Заполните название, сайт,
   реферальную ссылку, параметр реферала (`sub_id`, `aff_id`, `ref`), теги и цены.
   Slug генерируется из названия.
2. **Заявка извне** — форма `/[lang]/submit` → очередь `/ru/admin/submissions`.
   Кнопка «Одобрить + Новый провайдер» создаёт черновик со статусом `pending`
   и уже подставленной реферальной ссылкой.

Статусы: `active` (в индексе и на сайте), `hidden`, `pending` (черновик).

## Реферальные ссылки и монетизация

- Кнопки «Перейти на сайт» ведут на `/visit/<slug>`, а не напрямую.
- Редирект подставляет `referralParam=tr-<from>` и `utm_*`, затем 302 на
  `referralUrl`. Если ссылки нет — на `homepage`.
- Каждый клик пишется в `data/clicks.jsonl` (slug, время, источник, страна, UA).
- Отчёт: `/ru/admin/clicks`, выгрузка CSV: `/api/admin/clicks`.
- Все исходящие кнопки помечены `rel="sponsored nofollow noopener"`;
  на страницах провайдера и в футере есть раскрытие партнёрских ссылок.
- Сортировка рейтинга **не зависит** от наличия реферальной ссылки.

## Краулер

```bash
npm run crawl -- prices                 # прочитать pricingUrl всех провайдеров
npm run crawl -- prices --dry           # показать, что изменится, без записи
npm run crawl -- health                 # проверить apiBase, записать пробы
npm run crawl -- both --include-demo    # включить демо-провайдеров
```

Провайдеру в `data/providers.json` нужно указать:

```json
{
  "pricingUrl": "https://provider.example/pricing",
  "crawlAdapter": "html-table",   // или "json" для структурированных прайсов
  "apiBase": "https://api.provider.example/v1"
}
```

- `html-table` — разбирает `<tr>/<td>`, ищет название модели, берёт первые два
  числа как input/output, конвертирует юани по `FX_CNY_USD`.
- `json` — понимает OpenRouter-подобный `{ data: [{ id, pricing: { prompt, completion } }] }`
  и плоский `{ "model-slug": { input, output } }`.

Health-проба делает `GET <apiBase>/models`; ключ берётся из
`TR_KEY_<SLUG>` (uppercase, дефисы → подчёркивания). Любой ответ < 500
считается доступностью эндпоинта — это проверка связи, не гарантия работы модели.

### Источники цен, которые читает краулер

Публичные JSON-прайсы читаются напрямую, HTML-страницы — только если в них есть таблица.

| Провайдер | Источник | Адаптер | Единица | Валюта |
|---|---|---|---|---|
| DeepInfra | `api.deepinfra.com/v1/openai/models` | `deepinfra` | за 1M | USD |
| Novita AI | `api.novita.ai/v3/openai/models` | `novita` | за 1M (decimal-поля) | USD |
| Polza.ai | `api.polza.ai/api/v1/models` | `polza` | за 1M | RUB (`FX_RUB_USD`) |
| Together AI | `together.ai/pricing` (HTML) | `together` | за 1M | USD, таблицы fine-tuning отбрасываются |

Adapter `auto` определяет формат сам: JSON → `json`, JSON-LD → `json-ld`, таблица → `html-table`.
Для нестандартных схем в `crawlConfig` можно задать `listPath`, `inputPath`, `outputPath`, `unit`, `currency`, `modelAliases`.

Проверить конкретный источник без записи:

```bash
npm run crawl -- inspect polza          # по slug провайдера
npm run crawl -- inspect https://...    # по URL
npm run crawl -- prices --dry --verbose
```

Про RSS: прайсы в RSS у провайдеров не нашлись. JSON-LD на страницах прайсов содержит только FAQ и организацию, цен моделей там нет. Поэтому источник цен — публичные `/models`-эндпоинты.

Рекомендуемое расписание: `health` каждые 30 минут, `prices` раз в сутки
(cron / GitHub Actions / планировщик хостинга).

## Переменные окружения

Скопируйте `.env.example` → `.env.local`:

| Переменная | Зачем |
|---|---|
| `ADMIN_PASSWORD` | пароль админки (без него — `admin`) |
| `ADMIN_SECRET` | секрет подписи cookie (по умолчанию выводится из пароля) |
| `DATA_DIR` | путь к каталогу данных, по умолчанию `./data` |
| `FX_CNY_USD` | курс юаня для краулера, по умолчанию `0.14` |
| `TR_KEY_<SLUG>` | API-ключ провайдера для health-проб |

## SEO и i18n

- `/{lang}/...`, `lang ∈ {ru, en}`, `/` → `/ru`, hreflang в метаданных.
- `sitemap.xml` генерируется из данных (модели + провайдеры), `robots.txt`
  закрывает `/api/`, `/visit/` и админку.
- Каждая страница модели/провайдера — свой canonical и description.

## Деплой

Нужен Node-хостинг с постоянным диском (VPS, Fly.io, Railway, Docker):
админка и краулер пишут в `data/`, serverless-ФС этого не позволяет.

Для serverless понадобится заменить `src/lib/store.ts` на БД (Postgres/SQLite
через Turso) — остальной код ходит только через функции этого модуля.

```bash
docker build -t tokenrate .   # Dockerfile не входит в поставку, см. ниже
```

## Статус и ограничения

- Демо-котировки провайдеров (`isDemo: true`) сгенерированы из официальных цен
  и помечены в интерфейсе. Замените их реальными через админку или краулер.
- Официальные цены моделей — реальные, со ссылками на прайсы вендоров
  (на момент наполнения датасета).
- Эвристика разбора HTML-таблиц краулера не проверена на реальных прайсах:
  перед первым запуском стоит прогнать `--dry`.
- Блог — заглушка без статей.
- Иконки провайдеров — буквенные марки; логотипы подключаются позже.
