import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

// Семантический поиск, два режима:
// 1) embed: вектор запроса (Voyage/Gemini по полю model из vectors.json), косинус на клиенте.
// 2) llm-rank: без эмбеддинг-ключа — Claude ранжирует компактный каталог по запросу
//    (81 SKU ≈ 1.5k токенов, structured output → гарантированный список id).

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

interface RankItem {
  id: string
  title: string
  category: string
  priceKzt?: number
}

async function viaClaudeRank(query: string, items: RankItem[]): Promise<string[]> {
  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 400,
    output_config: {
      effort: 'low',
      format: {
        type: 'json_schema',
        schema: {
          type: 'object' as const,
          properties: {
            ids: {
              type: 'array' as const,
              items: { type: 'string' as const },
              description: 'id товаров, релевантных запросу, по убыванию релевантности; пустой массив если ничего не подходит',
            },
          },
          required: ['ids'],
          additionalProperties: false,
        },
      },
    },
    system:
      'Ты — поисковый ранкер маркетплейса. Дан запрос пользователя (русский/казахский/английский) и каталог товаров с ценами в тенге. ' +
      'Верни id товаров, которые семантически подходят запросу (по смыслу, не по подстроке), максимум 12, по убыванию релевантности. ' +
      'Если в запросе указан бюджет или ценовое ограничение («до 20 тысяч», «дешёвый», «арзан») — СТРОГО исключи товары дороже. Ничего не подходит — верни пустой массив.',
    messages: [{ role: 'user', content: JSON.stringify({ query, catalog: items }) }],
  })
  if (response.stop_reason === 'refusal') return []
  const block = response.content.find((b) => b.type === 'text')
  if (!block || block.type !== 'text') return []
  return (JSON.parse(block.text).ids as string[]) ?? []
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { query, model, mode, items } = req.body ?? {}
  if (typeof query !== 'string' || !query.trim()) return res.status(400).json({ error: 'query required' })

  try {
    res.setHeader('Cache-Control', 'no-store')

    if (mode === 'llm-rank') {
      if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'no anthropic key' })
      if (!Array.isArray(items) || items.length === 0 || items.length > 200) {
        return res.status(400).json({ error: 'items required' })
      }
      const ids = await viaClaudeRank(query.slice(0, 200), items.slice(0, 200))
      return res.status(200).json({ ids })
    }

    let v: number[]
    if (model === 'gemini-embedding-001') {
      if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'no gemini key' })
      v = await viaGemini(query.slice(0, 500))
    } else {
      if (!process.env.VOYAGE_API_KEY) return res.status(503).json({ error: 'no voyage key' })
      v = await viaVoyage(query.slice(0, 500))
    }
    return res.status(200).json({ v })
  } catch {
    return res.status(502).json({ error: 'search error' })
  }
}
