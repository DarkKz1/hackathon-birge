# Разведка источников данных — что реально можно собрать (11 июня 2026)

> Результат боевой проверки (4 агента, curl/Playwright с нашего egress). Ветка `feat/real-data`.
> ТЗ парсинг НЕ требует (mock разрешён) — это наш ход на дифференциацию.
> Цель не «собрать всё», а 2–3 источника, которые честно отдают данные с timestamp.

## Главный вывод

**Наш egress = европейский edge (Cloudflare Варшава), для KZ-сайтов = «иностранный IP».**
Это меняет картину: Kaspi отдаёт decoy, часть KZ-доменов не резолвится. Зато есть
**технодом и flip.kz**, которые отдают всё с сервера, и **живой курс Нацбанка**.

---

## KZ-маркетплейсы

| Источник | Парсится? | Метод | Поля | Скорость | Вердикт |
|---|---|---|---|---|---|
| **technodom.kz** | ✅ server-HTML | GET категории → `__NEXT_DATA__` JSON | title, price, oldPrice, brand, images, sku, ссылка, наличие, скидка, рейтинг | 1.4–2.2с, **24 товара/запрос** | **БРАТЬ (основной)** |
| **flip.kz** | ✅ server-HTML | GET → JSON-LD + `.price` | name, price ₸, sku, description, image, ссылка, наличие | 0.7–1.0с | **БРАТЬ** |
| kaspi.kz | ⚠️ только-браузер | decoy на иностр. IP: цена `undefined`, отдаёт чужой товар | — | — | НЕ брать live (нужен KZ-IP+куки+headless) |
| mechta.kz | ❌ Cloudflare challenge 403 | — | — | — | Не брать |
| market.halykbank.kz | ❌ DNS не резолвится | — | — | — | Недостижим |
| kz.satu.kz | ❌ DNS не резолвится | — | — | — | Недостижим |

**Рабочие команды:**
```bash
# Технодом — 24 товара одним запросом, всё в __NEXT_DATA__
curl -sL --max-time 15 -H "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15" \
  "https://www.technodom.kz/catalog/smartfony" | grep -oE '<script id="__NEXT_DATA__"[^>]*>.*</script>'

# Flip — JSON-LD Product на карточке
curl -sL --max-time 15 -H "User-Agent: ..." "https://flip.kz/catalog?prod=6145052"
```

## Глобальные маркетплейсы

| Источник | Доступно с нашего IP? | Метод | Вердикт |
|---|---|---|---|
| **fakestoreapi.com** | ✅ 0.4с | JSON `/products` (title/price/image/rating) | Fake, но стабильный фид |
| **api.escuelajs.co** (Platzi) | ✅ 0.9с | JSON, images[] + категории | Fake, контент нестабилен |
| **Open Food Facts** | ✅ 0.56с | JSON по штрихкоду, РЕАЛЬНЫЕ товары | Без цен — но «реальный источник» для нарратива |
| Amazon.com | ⚠️ HTML без капчи, цена на ~50% ASIN | server-HTML, `a-price-whole` | Хрупко, нужен headless для надёжности |
| AliExpress / Temu / eBay | ❌ блок (captcha/challenge/403) | — | Live с нашего IP нельзя |
| eBay Browse API | ❌ 403 без OAuth | REST | Бесплатный ключ за регистрацию — апсайд |

**Вывод по глобальным:** бесплатного no-key источника РЕАЛЬНЫХ цен глобальных маркетплейсов
с нашего IP сейчас нет. AliExpress/Temu/eBay блокируют сразу. Для «живого источника» в демо —
Open Food Facts (реальные товары по штрихкоду) как доказательство пайплайна.

## Курс валют KZT — ✅ живой, без ключа

```bash
# Нацбанк РК (официальный, 0.25с, есть USD/EUR/CNY/RUB)
curl -s "https://nationalbank.kz/rss/rates_all.xml"
# структура: <item><title>USD</title><description>488.59</description>...</item>
# fallback (чистый JSON): open.er-api.com/v6/latest/USD → .rates.KZT
```
USD=488.59, EUR=564.37, CNY=72.08, RUB=6.79 ₸ (проверено сегодня).

## Open-source куски, которые можно переиспользовать

- **AliExpress** [sudheer-ranga/aliexpress-product-scraper](https://github.com/sudheer-ranga/aliexpress-product-scraper) (298★, март 2026, Puppeteer):
  - reviews-эндпоинт БЕЗ браузера: `https://feedback.aliexpress.com/pc/searchEvaluation.do?productId={id}&page={n}&pageSize=20&filter=all` → JSON, copy-paste
  - product через mtop `mtop.aliexpress.pdp.pc.query` (JSONP) — нужен Puppeteer; нормализация в `src/transform.js`
- **Kaspi** [an-bo-23/kaspi-parser-api](https://github.com/an-bo-23/kaspi-parser-api) (мёртвый, но): URL `kaspi.kz/shop/p/c-{id}`, селекторы `.item__heading` / `.item__price-once`
- **Amazon** [ian-kerins/amazon-python-scrapy-scraper](https://github.com/ian-kerins/amazon-python-scrapy-scraper) — XPath-селекторы; production-надёжность только через платный провайдер (omkarcloud free-tier 5k/мес)

---

## Рекомендация: что внедряем (в этой ветке, после сбора)

**Скорость обновления / «не мёртвые данные»:**
- Технодом+Flip отдают мгновенно → **снапшот раз в N часов через Vercel Cron** (или вручную скриптом перед демо) в `public/prices.json` с `fetchedAt` timestamp.
- Курс Нацбанка → `/api/rate` с кэшем 1ч (обновляется раз в день у источника).
- **Снапшот честнее live-запроса на сцене:** timestamp «проверено сегодня 19:40» = доверие + не падает от Wi-Fi.

**План внедрения (НЕ в master, только feat/real-data):**
1. `/api/rate` — курс Нацбанка, кэш. (~30 мин, низкий риск)
2. `scripts/fetch-prices.mjs` — технодом+flip по нашим демо-категориям → `public/prices.json` + `fetchedAt`. (~1.5ч)
3. Блок в карточке: «Сейчас в рознице (Технодом/Flip): X ₸ · проверено {дата} · ссылка» vs наша групповая цена. (~40 мин)
4. Реальный счётчик активных групп на welcome вместо «286». (~20 мин)
5. WhatsApp-инвайт (wa.me) для виральной петли. (~15 мин)

**Не делаем:** live-парсинг маркетплейсов в рантайме на сцене (anti-bot, латентность, риск падения).
