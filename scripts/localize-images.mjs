// Downloads catalog images to public/img/ and rewrites catalog.json to local paths.
// Makes the demo independent of external CDN (hackathon Wi-Fi insurance).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const catPath = new URL('../src/data/catalog.json', import.meta.url)
const catalog = JSON.parse(readFileSync(catPath, 'utf8'))
mkdirSync(new URL('../public/img', import.meta.url), { recursive: true })

async function grab(url, name) {
  if (!url.startsWith('http')) return url // already local
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(new URL(`../public/img/${name}`, import.meta.url), buf)
  return `/img/${name}`
}

let n = 0
for (const p of catalog) {
  p.image = await grab(p.image, `${p.id}-t.webp`)
  p.images = await Promise.all(p.images.map((u, i) => grab(u, `${p.id}-${i}.webp`)))
  n++
  if (n % 20 === 0) console.log(`${n}/${catalog.length}`)
}

writeFileSync(catPath, JSON.stringify(catalog, null, 1))
console.log('done:', catalog.length, 'products localized')
