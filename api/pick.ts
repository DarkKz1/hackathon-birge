import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

// LLM-подборка дня: профиль + топ кандидатов по скорингу → именная подборка с объяснением.
// Требует ANTHROPIC_API_KEY в env Vercel; без ключа клиент использует локальный fallback.

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'no api key configured' })

  const { profile, candidates } = req.body ?? {}
  if (!profile || !Array.isArray(candidates) || candidates.length === 0) {
    return res.status(400).json({ error: 'profile and candidates required' })
  }

  const client = new Anthropic()
  const lang = profile.lang === 'kk' ? 'казахском' : 'русском'

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1500,
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: PICK_SCHEMA },
      },
      system:
        'Ты — дружелюбный шопинг-ассистент приложения Birge (коллективные покупки с глобальных маркетплейсов в Казахстане, цены в тенге). ' +
        `Отвечай на ${lang} языке. Выбери ровно 3 товара из списка кандидатов, которые лучше всего подходят пользователю. ` +
        'Пиши коротко, живо, без канцелярита и без выдуманных фактов о товарах.',
      messages: [
        {
          role: 'user',
          content: JSON.stringify({ profile, candidates: candidates.slice(0, 20) }),
        },
      ],
    })

    if (response.stop_reason === 'refusal') return res.status(502).json({ error: 'refused' })
    const block = response.content.find((b) => b.type === 'text')
    if (!block || block.type !== 'text') return res.status(502).json({ error: 'empty' })
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json(JSON.parse(block.text))
  } catch (e) {
    return res.status(502).json({ error: 'llm error' })
  }
}
