export const kzt = (n: number) => `${n.toLocaleString('ru-RU').replace(/ /g, ' ')} ₸`

export const pct = (retail: number, price: number) => Math.round((1 - price / retail) * 100)

export function timeLeft(deadline: number, lang: 'ru' | 'kk' = 'ru'): string {
  const ms = Math.max(0, deadline - Date.now())
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  const [hu, mu] = lang === 'kk' ? ['сағ', 'мин'] : ['ч', 'м']
  if (h > 0) return `${h}${hu} ${String(m).padStart(2, '0')}${mu}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export const hourUnit = (lang: 'ru' | 'kk') => (lang === 'kk' ? 'сағ' : 'ч')

const FIRST = ['Айгерим', 'Данияр', 'Аружан', 'Алишер', 'Мадина', 'Тимур', 'Жанель', 'Ерлан', 'Камила', 'Санжар', 'Дильназ', 'Нурсултан']

export const fakeName = (seed: number) => FIRST[seed % FIRST.length]

export const initials = (name: string) => name.slice(0, 1).toUpperCase()
