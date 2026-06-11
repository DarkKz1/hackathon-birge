// Прекомпьют эмбеддингов каталога: Voyage AI (voyage-3.5-lite) или Gemini (gemini-embedding-001).
// Запуск: VOYAGE_API_KEY=... node scripts/embed-catalog.mjs   (или GEMINI_API_KEY=...)
// Результат: public/vectors.json (id + нормализованный вектор на товар).
import { readFileSync, writeFileSync } from 'node:fs'

const VOYAGE = process.env.VOYAGE_API_KEY
const GEMINI = process.env.GEMINI_API_KEY
if (!VOYAGE && !GEMINI) {
  console.error('Ни VOYAGE_API_KEY, ни GEMINI_API_KEY не заданы — пропускаю. Поиск останется в substring-режиме.')
  process.exit(1)
}

const catalog = JSON.parse(readFileSync(new URL('../src/data/catalog.json', import.meta.url), 'utf8'))

const CAT_RU = {
  electronics: 'электроника гаджеты техника',
  beauty: 'красота уход косметика парфюм',
  home: 'дом кухня интерьер мебель',
  fashion: 'одежда мода стиль аксессуары',
  sport: 'спорт фитнес тренировки',
}

// Описания с dummyjson — более богатый документ для эмбеддинга
async function describe(p) {
  try {
    const r = await fetch(`https://dummyjson.com/products/${p.id.slice(1)}?select=description,category`)
    const j = await r.json()
    return `${j.description ?? ''} ${j.category ?? ''}`
  } catch {
    return ''
  }
}

console.log('Собираю документы…')
const docs = []
for (const p of catalog) {
  const desc = await describe(p)
  docs.push(`${p.title}. ${p.brand ?? ''}. ${desc}. ${CAT_RU[p.category]}`)
}

const normalize = (v) => {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1
  return v.map((x) => +(x / n).toFixed(4))
}

let model, vectors

if (VOYAGE) {
  model = 'voyage-3.5-lite'
  console.log(`Эмбеддинг через Voyage (1 батч, ${docs.length} документов)…`)
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${VOYAGE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: docs, model, input_type: 'document' }),
  })
  if (!res.ok) {
    console.error('Voyage error:', res.status, await res.text())
    process.exit(1)
  }
  const { data, usage } = await res.json()
  vectors = data.map((d) => normalize(d.embedding))
  console.log('Токенов потрачено:', usage?.total_tokens)
} else {
  model = 'gemini-embedding-001'
  console.log(`Эмбеддинг через Gemini (батчи по 100, ${docs.length} документов)…`)
  vectors = []
  for (let i = 0; i < docs.length; i += 100) {
    const batch = docs.slice(i, i + 100)
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${GEMINI}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: batch.map((text) => ({
            model: 'models/gemini-embedding-001',
            content: { parts: [{ text }] },
            taskType: 'RETRIEVAL_DOCUMENT',
            outputDimensionality: 768,
          })),
        }),
      },
    )
    if (!res.ok) {
      console.error('Gemini error:', res.status, await res.text())
      process.exit(1)
    }
    const j = await res.json()
    vectors.push(...j.embeddings.map((e) => normalize(e.values)))
    console.log(`  ${Math.min(i + 100, docs.length)}/${docs.length}`)
  }
}

const out = {
  model,
  dim: vectors[0].length,
  items: catalog.map((p, i) => ({ id: p.id, v: vectors[i] })),
}
writeFileSync(new URL('../public/vectors.json', import.meta.url), JSON.stringify(out))
console.log(`Готово: ${out.items.length} векторов × ${out.dim}d (${model})`)
