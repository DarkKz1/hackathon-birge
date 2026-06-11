// Телеком-слой Birge (демо-сигналы поверх eSIM). По ТЗ физическая реализация не требуется —
// это UI-концепт реальных CAMARA / GSMA Open Gateway API. Значения детерминированы из профиля
// и товара, чтобы демо было стабильным и воспроизводимым. См. docs/ESIM-CREATIVE.md.
import type { Product, Profile } from './types'

// Районы по городам — для «термометра групп по районам» (Geofencing + Region Device Count).
const DISTRICTS: Record<string, string[]> = {
  Алматы: ['Бостандыкский', 'Медеуский', 'Алмалинский', 'Ауэзовский'],
  Астана: ['Есиль', 'Алматинский', 'Сарыарка', 'Байконур'],
  Шымкент: ['Аль-Фараби', 'Каратауский', 'Енбекшинский'],
  Караганда: ['Казыбекби', 'Октябрьский'],
  Актобе: ['Центр', 'Батыс-2'],
  Атырау: ['Авангард', 'Привокзальный'],
}

const hash = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export function districtOf(profile: Profile): string {
  const list = DISTRICTS[profile.city] ?? ['Центр']
  return list[hash(profile.city + profile.esimId) % list.length]
}

export interface DistrictGroup {
  district: string
  waiting: number // соседей в районе ждут этот товар (Region Device Count, mock)
  threshold: number // порог для бесплатной общей доставки
}

// Сколько соседей в одном районе ждут этот товар — детерминированно из товара+района.
export function districtGroup(p: Product, profile: Profile): DistrictGroup {
  const district = districtOf(profile)
  const seed = hash(p.id + district)
  const threshold = 5 + (seed % 4) // 5–8 до бесплатной доставки
  const waiting = 2 + (seed % (threshold - 1)) // 2..threshold-1 (всегда «почти»)
  return { district, waiting, threshold }
}

export interface Tenure {
  years: number // как давно номер у оператора (KYC Tenure)
  trusted: boolean // 3+ лет → доверенный организатор
  holdLimitKzt: number // лимит группового холда без предоплаты
}

export function tenureOf(profile: Profile): Tenure {
  const seed = hash(profile.phone || profile.esimId || 'guest')
  const years = 1 + (seed % 7) // 1–7 лет
  const trusted = years >= 3
  // лимит холда растёт со стажем: база 50к + 60к/год доверия
  const holdLimitKzt = trusted ? 50_000 + (years - 2) * 60_000 : 30_000
  return { years, trusted, holdLimitKzt }
}
