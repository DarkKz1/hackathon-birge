# Birge — полная документация проекта

> Всё, что нужно знать о проекте: архитектура, инструменты, инфраструктура, демо-механики,
> операционка. Дополняет [`docs/ESIM.md`](ESIM.md) (телеком-слой) и [`pitch/`](../pitch/) (сцена).
> Состояние на вечер дня 1 хакатона (11 июня 2026).

---

## 1. Что это

**Birge** («бірге» — «вместе») — MVP платформы коллективных покупок с глобальных
маркетплейсов для Казахстана. Группа покупателей получает оптовую цену; деньги на холде
до сбора группы; eSIM-идентификация против ботов. Полное описание идеи — [README](../README.md).

| Ресурс | URL |
|---|---|
| Прод | https://hackathon-birge.vercel.app |
| Репозиторий | https://github.com/DarkKz1/hackathon-birge |
| Vercel-проект | `diyars-projects-74b7de60/hackathon-birge` |
| Supabase (sandbox) | проект `mztujmeykhlgwqpdoilf` («DarkKz1's Project», Mumbai) |

---

## 2. Стек

| Слой | Инструмент | Зачем |
|---|---|---|
| Фронтенд | React 19 + TypeScript + Vite, react-router | SPA, mobile-first (max-w 430px) |
| Стили | Tailwind CSS v4 (`@tailwindcss/vite`) | Токены темы в `src/index.css` `@theme` |
| Иконки | lucide-react | Никаких эмодзи в UI — осознанное решение |
| Шрифты | Onest (текст) + Unbounded (display), Google Fonts | Оба с кириллицей |
| Состояние | React Context (`src/lib/store.tsx`) + localStorage | Профиль локально, группы — на сервере |
| База/Realtime | Supabase: Postgres + Realtime (postgres_changes) | Состояние групп, live-синк |
| Хостинг | Vercel (hobby) + serverless functions (`api/`) | SPA-rewrite в `vercel.json` |
| LLM | Claude Opus 4.8 (`@anthropic-ai/sdk`, structured outputs) → фолбэк Gemini 2.5 Flash (REST) | Подборка дня, поиск |
| Эмбеддинги (опц.) | Voyage `voyage-3.5-lite` или Gemini `gemini-embedding-001` | Код готов, ключа нет — работает LLM-ранкер |
| QR | `qrcode` (npm) | QR-джойн для жюри |
| PWA | `public/manifest.json` + `public/sw.js` | SW кэширует `/img/*` |

---

## 3. Структура репозитория

```
src/
  main.tsx              роутер + Guard (гостям открыт только /p/* и онбординг) + регистрация SW
  index.css             Tailwind v4 @theme: цвета (ink/paper/lime/coral/violet), анимации (rise/pop/scan/ticker)
  lib/
    store.tsx           ядро: профиль, joins (server+local merge), joinGroup/simulateJoin, дедлайны от T0
    realtime.ts         Supabase: fetchJoins (replay), insertJoin (upsert ignoreDuplicates), subscribeJoins
    recommend.ts        объяснимый скоринг: интересы+3, бюджет+2, город+1.5, почти-собрана+2, рейтинг+0.5
    semantic.ts         поиск: vectors.json+косинус ЕСЛИ есть, иначе LLM-ранкер через /api/search
    predict.ts          эвристика прогноза сбора (fill × time)
    i18n.ts             словарь RU/KK, все строки UI
    format.ts           kzt(), pct(), timeLeft(deadline, lang), фейковые имена участников
    types.ts            Product, Profile, GroupView, Reco
  screens/              Welcome, Verify (eSIM-анимация), Setup, Interests, Feed, ProductDetail, Groups, ProfileScreen
  components/           ui.tsx (Button/Chip/ProgressBar/Avatars/Toasts/EsimBadge/BottomNav), ProductCard, DailyPick
  data/catalog.json     81 товар: тиры цен, seedMembers, hoursLeft, marketplace, hotCities

api/
  pick.ts               POST {profile, candidates} → {intro, picks[], provider}. Цепочка Claude→Gemini
  search.ts             POST: режим embed (вектор запроса) ИЛИ mode:'llm-rank' (Claude ранжирует каталог,
                        извлекает maxPriceKzt → бюджет фильтруется кодом)

scripts/
  build-catalog.mjs     генерация каталога из dummyjson (цены→₸ ×520, тиры −18%/−32%, сиды)
  localize-images.mjs   скачивание всех картинок в public/img/ (283 файла, 14МБ)
  embed-catalog.mjs     прекомпьют векторов каталога → public/vectors.json (Voyage или Gemini)
  test-realtime.mjs     e2e-тест broadcast-канала (два node-клиента)

docs/   ESIM.md (телеком-SSOT), PROJECT.md (этот файл)
pitch/  PITCH.md (7 слайдов+сценарий+Q&A), CHECKPOINT.md (шпаргалка), JURY-AUDIT.md (аудит),
        qr-demo-airpods.png, скриншоты
public/ img/ (каталог), manifest.json, sw.js, favicon.svg
```

---

## 4. Как работает групповая механика (сердце продукта)

1. **Каталог**: у товара `tiers: [{min:10, price}, {min:25, price}]`, `seedMembers` (стартовые
   участники) и `hoursLeft` (горизонт дедлайна).
2. **Дедлайны**: `deadline = T0 + hoursLeft`, где `T0` фиксируется в localStorage при первом
   запуске → таймеры стабильны и тикают. `DEMO_EXPIRED` (`p122`, iPhone 6) — дедлайн в прошлом,
   демонстрирует сценарий «не собралась → авторефанд».
3. **Вступления**: строка в таблице `birge_joins` (см. §5). UI optimistic (локальная строка),
   сервер — источник правды, новые устройства получают replay через `fetchJoins()`.
4. **Статусы**: `filling` → `complete` (m ≥ tier1.min) | `expired` (дедлайн прошёл и не собралась).
   Цена фиксируется по достигнутому тиру; тизер следующего тира; лимит вступлений = tier2.min.
5. **Гостевой режим**: `/p/:id` открыт без онбординга; в join-шите гость вводит только имя.

## 5. Supabase (sandbox-проект)

**Внимание:** проект `mztujmeykhlgwqpdoilf` — чужая песочница с другими таблицами
(user_data, duels, quiz_rooms, arenas — НЕ ТРОГАТЬ). Наша таблица одна:

```sql
public.birge_joins (id, product_id, client_id, name, city, created_at)
-- unique (product_id, client_id)  ← дедуп вступлений на уровне БД
-- RLS: anon SELECT + anon INSERT (без update/delete)
-- в публикации supabase_realtime → postgres_changes INSERT летят клиентам
```

Anon-ключ захардкожен в `src/lib/realtime.ts` (публичный по дизайну, под RLS).

**Зачистка перед демо** (Management API, токен из keychain CLI):
```bash
TOKEN=$(security find-generic-password -s "Supabase CLI" -a "supabase" -w)
DEC=$(echo "${TOKEN#go-keyring-base64:}" | base64 -d)
curl -s -X POST "https://api.supabase.com/v1/projects/mztujmeykhlgwqpdoilf/database/query" \
  -H "Authorization: Bearer $DEC" -H "Content-Type: application/json" \
  -d '{"query":"delete from public.birge_joins;"}'
```

## 6. ИИ-слой

| Фича | Где | Как | Латентность |
|---|---|---|---|
| Рекомендации ленты | `recommend.ts`, клиент | Объяснимый скоринг, чип «почему» на карточке | 0 мс |
| Подборка дня | `/api/pick` + `DailyPick.tsx` | Claude Opus 4.8 (effort low, JSON-схема) → Gemini → локальный шаблон. Кэш в localStorage на день (ключ `birge_pick_v2_дата_язык`) | ~8 с холодная, 0 из кэша |
| Поиск | `/api/search` + `semantic.ts` + Feed | Приоритет: vectors.json+косинус (если есть) → LLM-ранкер (Claude получает 81 SKU с ценами, возвращает ids + maxPriceKzt; бюджет фильтруется кодом ×1.1). Спиннер → скелетон → бейдж «умный поиск» | 3.5–4.5 с (LLM) / ~0.3 с (векторы) |
| Прогноз сбора | `predict.ts` | Эвристика: 0.22 + fill×0.62 + time×0.16, ETA ≈ need×2.2ч | 0 мс |

**Env-переменные (Vercel, Production):**
- `ANTHROPIC_API_KEY` — ✅ установлен (найден в .env проектов Diyar'а: entprep/absorb/alfred — один ключ)
- `GEMINI_API_KEY` — нет (цепочка готова)
- `VOYAGE_API_KEY` — нет (даст поиск ~0.3 с; после добавления: `node scripts/embed-catalog.mjs` → коммит `public/vectors.json` → деплой)

## 7. Демо-механики (знать наизусть)

| Механика | Как |
|---|---|
| QR-джойн | Кнопка QR в карточке → оверлей. Готовый PNG: `pitch/qr-demo-airpods.png` (p100, нужен 1 участник) |
| Симуляция участника | **Тройной тап по фото товара** → фейковый участник + insert в БД (видно на всех устройствах) |
| Демо-рефанд | Товар `p122` (iPhone 6) — баннер «не собралась, возврат оформлен» |
| Сброс | Профиль → «Сбросить демо» (чистит localStorage; серверные joins чистятся по §5) |
| KK-переключение | Профиль → Тіл — момент для демо локализации |
| Офлайн-стойкость | Каталог+картинки локальные; SW кэширует img; ИИ деградирует в фолбэки молча |

## 8. Операционка

```bash
npm run dev                  # localhost:5173 (или 5180), /api/* НЕ работают на vite dev
npx tsc -b && npm run build  # типы + прод-сборка
vercel --prod --yes          # деплой (алиас hackathon-birge.vercel.app публичный)
node scripts/test-realtime.mjs            # e2e realtime
```

Git: master → github.com/DarkKz1/hackathon-birge (public). История чистая от секретов (проверено).

## 9. Известные ограничения (честность для Q&A)

- eSIM-верификация — UI-концепт (по ТЗ); прод-путь описан в `docs/ESIM.md`.
- `/api/pick` и `/api/search` без rate-limit (демо; в проде — ключи за гейтвеем).
- Канал вставок открыт anon-ключом: накрутка возможна (демо; в проде insert идёт через
  авторизованный backend + eSIM identity — это и есть наш питч).
- Retail-цены каталога — имитация (dummyjson ×520₸); тиры — модельные −18/−32%.
- LLM-ранкер поиска линеен по каталогу — путь масштабирования: эмбеддинги → pgvector.

## 10. Хронология сессии (что было сделано за день 1)

1. Скаффолд (Vite+TS+Tailwind v4) → каталог из dummyjson → все экраны → realtime broadcast → деплой.
2. Локализация картинок (283 шт.) — независимость от CDN.
3. QR-джойн + демо-симуляция тройным тапом.
4. ИИ-слой: /api/pick (Claude→Gemini), /api/search (векторы/LLM-ранкер), прогноз сбора. Ключ Anthropic найден в .env других проектов и подключён к Vercel.
5. Аудит «жюри» (4 перспективы + код-ревью агентом) → фиксы: серверное состояние групп
   (таблица birge_joins вместо localStorage), гостевой QR-путь, тикающие таймеры,
   expired/refund-состояние, лимит группы, guards, PWA manifest+SW.
6. UI-пасс: lucide-иконки вместо эмодзи, компактная подборка, единый ритм отступов,
   скелетон поиска (фикс «поиск выглядит сломанным»).
7. Доки: ESIM.md (SSOT телеком-слоя), README, этот файл. Публикация на GitHub.
```
