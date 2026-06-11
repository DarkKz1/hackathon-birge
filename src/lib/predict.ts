import type { Product } from './types'

// Эвристический прогноз сбора группы (v1; v2 — модель на реальных данных групп).
// Сигналы: заполненность, оставшееся время, размер недобора.
export function predictFill(p: Product, members: number, deadline: number) {
  const need = Math.max(0, p.tiers[0].min - members)
  if (need === 0) return { prob: 100, etaHours: 0 }
  const fill = members / p.tiers[0].min
  const hoursLeft = Math.max(0, (deadline - Date.now()) / 3_600_000)
  const timeFactor = Math.min(hoursLeft / 48, 1)
  const prob = Math.round(Math.min(0.97, 0.22 + fill * 0.62 + timeFactor * 0.16) * 100)
  const etaHours = Math.min(Math.max(Math.round(need * 2.2), 2), 36)
  return { prob, etaHours }
}
