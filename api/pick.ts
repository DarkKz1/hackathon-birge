import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

// LLM-подборка дня: профиль + топ кандидатов по скорингу → именная подборка с объяснением.
// Цепочка провайдеров: ANTHROPIC_API_KEY (Claude Opus 4.8) → GEMINI_API_KEY (Gemini 2.5 Flash).
// Без ключей клиент использует локальный fallback — демо не зависит от API.

const PICK_SCHEMA = {
  type: 'object' as const,
  properties: {
    intro: {
      type: 'string' as const,
      description: 'Одно тёплое личное предложение-вступление к подборке, обращение по имени',
    },
    picks: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const, description: 'id товара из списка кандидатов' },
          blurb: { type: 'string' as const, description: 'Одно живое предложение, почему этот товар стоит взять в группе именно этому пользователю' },
        },
        required: ['id', 'blurb'],
        additionalProperties: false,
      },
    },
  },
  required: ['intro', 'picks'],
  additionalProperties: false,
}

const systemPrompt = (lang: string) =>
  'Ты — дружелюбный шопинг-ассистент приложения Birge (коллективные покупки с глобальных маркетплейсов в Казахстане, цены в тенге). ' +
  `Отвечай на ${lang === 'kk' ? 'казахском' : 'русском'} языке. Выбери ровно 3 товара из списка кандидатов, которые лучше всего подходят пользователю. ` +
  'Пиши коротко, живо, без канцелярита и без выдуманных фактов о товарах.'

async function viaClaude(profile: Record<string, unknown>, candidates: unknown[]) {
  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1500,
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: PICK_SCHEMA },
    },
    system: systemPrompt(String(profile.lang)),
    messages: [{ role: 'user', content: JSON.stringify({ profile, candidates }) }],
  })
  if (response.stop_reason === 'refusal') throw new Error('refused')
  const block = response.content.find((b) => b.type === 'text')
  if (!block || block.type !== 'text') throw new Error('empty')
  return { ...JSON.parse(block.text), provider: 'claude-opus-4-8' }
}

async function viaGemini(profile: Record<string, unknown>, candidates: unknown[]) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt(String(profile.lang)) }] },
        contents: [{ role: 'user', parts: [{ text: JSON.stringify({ profile, candidates }) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              intro: { type: 'STRING' },
              picks: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: { id: { type: 'STRING' }, blurb: { type: 'STRING' } },
                  required: ['id', 'blurb'],
                },
              },
            },
            required: ['intro', 'picks'],
          },
        },
      }),
    },
  )
  if (!r.ok) throw new Error(`gemini ${r.status}`)
  const j = await r.json()
  const text = j.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('gemini empty')
  return { ...JSON.parse(text), provider: 'gemini-2.5-flash' }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { profile, candidates } = req.body ?? {}
  if (!profile || !Array.isArray(candidates) || candidates.length === 0) {
    return res.status(400).json({ error: 'profile and candidates required' })
  }
  const top = candidates.slice(0, 20)

  const chain: Array<() => Promise<Record<string, unknown>>> = []
  if (process.env.ANTHROPIC_API_KEY) chain.push(() => viaClaude(profile, top))
  if (process.env.GEMINI_API_KEY) chain.push(() => viaGemini(profile, top))
  if (chain.length === 0) return res.status(503).json({ error: 'no api key configured' })

  for (const attempt of chain) {
    try {
      const result = await attempt()
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json(result)
    } catch {
      // пробуем следующего провайдера
    }
  }
  return res.status(502).json({ error: 'all providers failed' })
}
