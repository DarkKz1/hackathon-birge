import type { Product, Profile, Reco } from './types'
import { t, type TKey } from './i18n'

export function recommend(catalog: Product[], profile: Profile, members: (p: Product) => number): Reco[] {
  const lang = profile.lang
  const score = (p: Product): Reco => {
    let s = 0
    const reasons: string[] = []
    if (profile.interests.includes(p.category)) {
      s += 3
      reasons.push(t('why_interest', lang))
    }
    if (p.tiers[0].priceKzt <= profile.budgetKzt) {
      s += 2
      reasons.push(t('why_budget', lang))
    }
    if (p.hotCities.includes(profile.city)) {
      s += 1.5
      reasons.push(`${t('why_city', lang)} ${profile.city}`)
    }
    const m = members(p)
    const fill = m / p.tiers[0].min
    if (fill >= 0.6 && fill < 1) {
      s += 2
      reasons.push(t('why_almost', lang))
    }
    if (p.rating >= 4.2) {
      s += 0.5
      reasons.push(t('why_rating', lang))
    }
    return { product: p, score: s, reasons: reasons.slice(0, 2) }
  }
  return catalog.map(score).sort((a, b) => b.score - a.score)
}

export const CATEGORY_KEYS: Record<string, TKey> = {
  electronics: 'cat_electronics',
  beauty: 'cat_beauty',
  home: 'cat_home',
  fashion: 'cat_fashion',
  sport: 'cat_sport',
}
