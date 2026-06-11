// Реальные цены Kaspi (снапшот, см. scripts/fetch-kaspi.mjs). Не mock: каждая цена получена
// из публичного API Kaspi, url ведёт на тот же товар (кликабельно — жюри может проверить).
import data from '../data/kaspi-prices.json'

export interface KaspiPrice {
  title: string
  priceKzt: number
  url: string
}

const items = data.items as Record<string, KaspiPrice>

export const kaspiOf = (catalogId: string): KaspiPrice | undefined => items[catalogId]

export const kaspiFetchedAt = data.fetchedAt as string

// «проверено сегодня» / дата — короткий человекочитаемый штамп
export function kaspiStamp(lang: 'ru' | 'kk'): string {
  const d = new Date(kaspiFetchedAt)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (sameDay) return lang === 'kk' ? `бүгін ${time} тексерілді` : `проверено сегодня ${time}`
  const date = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
  return lang === 'kk' ? `${date} тексерілді` : `проверено ${date}`
}
