// Тянет РЕАЛЬНЫЕ цены Kaspi для КУРИРУЕМОГО списка наших товаров (только те, что реально
// есть и у нас, и на Kaspi). Матч валидируется обязательными токенами — фейк не привяжется.
// Запуск: node scripts/fetch-kaspi.mjs → public/kaspi-prices.json
import { readFileSync, writeFileSync } from 'node:fs'

const CITY = '750000000' // Алматы
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'

// catalogId → { q: поисковый запрос, must: токены, которые ОБЯЗАНЫ быть в названии Kaspi }
const CURATED = [
  { id: 'p123', q: 'Apple iPhone 13 Pro 256', must: ['iphone', '13', 'pro'] },
  { id: 'p78', q: 'Apple MacBook Pro 14', must: ['macbook', '14'] },
  { id: 'p100', q: 'Apple AirPods', must: ['airpods'] },
  { id: 'p103', q: 'Apple HomePod mini', must: ['homepod'] },
  { id: 'p160', q: 'Samsung Galaxy Tab S', must: ['samsung', 'galaxy', 'tab'] },
  { id: 'p6', q: 'Calvin Klein CK One туалетная вода', must: ['calvin', 'one'] },
  { id: 'p8', q: "Dior J'adore", must: ['dior'] },
  { id: 'p10', q: 'Gucci Bloom парфюм', must: ['gucci', 'bloom'] },
  { id: 'p7', q: 'Chanel Coco парфюм', must: ['chanel', 'coco'] },
  { id: 'p1', q: 'Essence Lash Princess тушь', must: ['essence', 'lash'] },
  { id: 'p119', q: 'Olay Shea Butter гель', must: ['olay'] },
]

const catalog = JSON.parse(readFileSync(new URL('../src/data/catalog.json', import.meta.url), 'utf8'))
const byId = new Map(catalog.map((p) => [p.id, p]))

async function searchKaspi(query) {
  const url = `https://kaspi.kz/yml/product-view/pl/results?text=${encodeURIComponent(query)}&page=0&all=false&fl=true&ui=d&i=-1&c=${CITY}`
  const r = await fetch(url, { headers: { 'x-ks-city': CITY, referer: 'https://kaspi.kz/shop/search/', 'user-agent': UA } })
  if (!r.ok) return null
  return (await r.json())?.data ?? null
}

const ACCESSORY = /чехол|плёнк|пленк|стекло|кабель|держател|защит|переходник|адаптер|ремешок|сумк|футляр|наклейк|book\s?case|gift set|набор/i

const out = { fetchedAt: new Date().toISOString(), city: 'Алматы', source: 'kaspi.kz', items: {} }

for (const { id, q, must } of CURATED) {
  const ourTitle = byId.get(id)?.title ?? id
  let data = null
  try {
    data = await searchKaspi(q)
  } catch {
    /* network */
  }
  if (!data?.length) {
    console.log(`✗ ${ourTitle.padEnd(28)} — поиск пуст`)
    continue
  }
  // первый результат, где есть ВСЕ must-токены и это не аксессуар
  const hit = data.slice(0, 10).find((d) => {
    const t = d.title.toLowerCase()
    return !ACCESSORY.test(t) && must.every((m) => t.includes(m))
  })
  if (!hit) {
    console.log(`✗ ${ourTitle.padEnd(28)} — нет валидного матча (must: ${must.join('+')})`)
    continue
  }
  const price = hit.unitSalePrice || hit.unitPrice
  out.items[id] = {
    title: hit.title,
    priceKzt: price,
    // shopLink приходит как /p/... — публичный кликабельный URL = /shop/p/...
    url: hit.shopLink ? `https://kaspi.kz/shop${hit.shopLink}` : `https://kaspi.kz/shop/search/?text=${encodeURIComponent(q)}`,
  }
  console.log(`✓ ${ourTitle.padEnd(28)} → ${hit.title.slice(0, 40).padEnd(40)} ${price}₸`)
  await new Promise((r) => setTimeout(r, 300))
}

writeFileSync(new URL('../public/kaspi-prices.json', import.meta.url), JSON.stringify(out, null, 1))
console.log(`\nГОТОВО: ${Object.keys(out.items).length}/${CURATED.length} реальных цен Kaspi. fetchedAt=${out.fetchedAt}`)
