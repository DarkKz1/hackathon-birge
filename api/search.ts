import type { VercelRequest, VercelResponse } from '@vercel/node'

// Эмбеддинг поискового запроса. Провайдер выбирается по полю model из vectors.json,
// чтобы вектор запроса и векторы каталога гарантированно были из одной модели.
// Векторы каталога статичны (public/vectors.json), косинус считается на клиенте — при 81 SKU это <1 мс.

async function viaVoyage(query: string): Promise<number[]> {
  const r = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: [query], model: 'voyage-3.5-lite', input_type: 'query' }),
  })
  if (!r.ok) throw new Error(`voyage ${r.status}`)
  const { data } = await r.json()
  return data[0].embedding
}

async function viaGemini(query: string): Promise<number[]> {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text: query }] },
        taskType: 'RETRIEVAL_QUERY',
        outputDimensionality: 768,
      }),
    },
  )
  if (!r.ok) throw new Error(`gemini ${r.status}`)
  const j = await r.json()
  return j.embedding.values
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { query, model } = req.body ?? {}
  if (typeof query !== 'string' || !query.trim()) return res.status(400).json({ error: 'query required' })

  try {
    let v: number[]
    if (model === 'gemini-embedding-001') {
      if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'no gemini key' })
      v = await viaGemini(query.slice(0, 500))
    } else {
      if (!process.env.VOYAGE_API_KEY) return res.status(503).json({ error: 'no voyage key' })
      v = await viaVoyage(query.slice(0, 500))
    }
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ v })
  } catch {
    return res.status(502).json({ error: 'embed error' })
  }
}
