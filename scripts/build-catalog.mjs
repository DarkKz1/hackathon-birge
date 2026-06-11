// Generates src/data/catalog.json from dummyjson.com (real product images/names).
// Run: node scripts/build-catalog.mjs
import { writeFileSync } from 'node:fs'

const USD_KZT = 520
const CATS = {
  smartphones: 'electronics',
  laptops: 'electronics',
  'mobile-accessories': 'electronics',
  tablets: 'electronics',
  fragrances: 'beauty',
  'skin-care': 'beauty',
  beauty: 'beauty',
  furniture: 'home',
  'home-decoration': 'home',
  'kitchen-accessories': 'home',
  'mens-watches': 'fashion',
  'womens-bags': 'fashion',
  'womens-dresses': 'fashion',
  'mens-shirts': 'fashion',
  sunglasses: 'fashion',
  'sports-accessories': 'sport',
}
const MARKETS = {
  electronics: ['Amazon', 'AliExpress', 'Banggood'],
  beauty: ['iHerb', 'Amazon', 'Temu'],
  home: ['Temu', 'AliExpress', 'Taobao'],
  fashion: ['Taobao', 'Temu', 'AliExpress'],
  sport: ['AliExpress', 'Amazon', 'Temu'],
}
const CITY_POP = {
  electronics: ['Алматы', 'Астана'],
  beauty: ['Алматы', 'Шымкент'],
  home: ['Астана', 'Караганда'],
  fashion: ['Алматы', 'Астана', 'Шымкент'],
  sport: ['Астана', 'Алматы'],
}

// deterministic pseudo-random from product id
const rnd = (id, salt, mod) => ((id * 2654435761 + salt * 40503) >>> 16) % mod

const out = []
for (const [djCat, ourCat] of Object.entries(CATS)) {
  const res = await fetch(`https://dummyjson.com/products/category/${djCat}?limit=6`)
  const { products } = await res.json()
  for (const p of products ?? []) {
    if (!p.thumbnail) continue
    const retailKzt = Math.round((p.price * USD_KZT) / 100) * 100
    // wholesale breakpoints: ~ -18% at tier1, ~ -32% at tier2
    const t1 = Math.round((retailKzt * (0.78 + rnd(p.id, 1, 8) / 100)) / 100) * 100
    const t2 = Math.round((retailKzt * (0.62 + rnd(p.id, 2, 8) / 100)) / 100) * 100
    const min1 = [6, 8, 10][rnd(p.id, 3, 3)]
    const min2 = min1 * 2 + [4, 5, 10][rnd(p.id, 4, 3)]
    out.push({
      id: `p${p.id}`,
      title: p.title,
      brand: p.brand ?? null,
      category: ourCat,
      image: p.thumbnail,
      images: (p.images ?? []).slice(0, 3),
      rating: p.rating,
      retailKzt,
      tiers: [
        { min: min1, priceKzt: t1 },
        { min: min2, priceKzt: t2 },
      ],
      seedMembers: Math.min(rnd(p.id, 5, min1 - 1) + Math.floor(min1 / 3), min1 - 1),
      hoursLeft: 6 + rnd(p.id, 6, 40),
      marketplace: MARKETS[ourCat][rnd(p.id, 7, MARKETS[ourCat].length)],
      hotCities: CITY_POP[ourCat],
      shipDays: 7 + rnd(p.id, 8, 10),
    })
  }
}

writeFileSync(new URL('../src/data/catalog.json', import.meta.url), JSON.stringify(out, null, 1))
console.log(`catalog: ${out.length} products`)
