export const kzt = (n: number) => `${n.toLocaleString('ru-RU').replace(/ /g, ' ')} ₸`

export const pct = (retail: number, price: number) => Math.round((1 - price / retail) * 100)

export function timeLeft(deadline: number): string {
  const ms = Math.max(0, deadline - Date.now())
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  if (h > 0) return `${h}ч ${String(m).padStart(2, '0')}м`
  return `${m}:${String(s).padStart(2, '0')}`
}

const FIRST = ['Айгерим', 'Данияр', 'Аружан', 'Алишер', 'Мадина', 'Тимур', 'Жанель', 'Ерлан', 'Камила', 'Санжар', 'Дильназ', 'Нурсултан']

export const fakeName = (seed: number) => FIRST[seed % FIRST.length]

export const initials = (name: string) => name.slice(0, 1).toUpperCase()
