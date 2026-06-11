/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import rawCatalog from '../data/catalog.json'
import type { GroupState, Product, Profile } from './types'
import { broadcastJoin, subscribeJoins } from './realtime'
import { t, type Lang, type TKey } from './i18n'
import { fakeName } from './format'

export const catalog = rawCatalog as Product[]
const byId = new Map(catalog.map((p) => [p.id, p]))

const EMPTY_PROFILE: Profile = {
  name: '',
  phone: '',
  city: 'Алматы',
  age: 25,
  budgetKzt: 60_000,
  interests: [],
  lang: 'ru',
  esimId: '',
  operator: '',
  onboarded: false,
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    return fallback
  }
}

interface Toast {
  id: number
  text: string
  emoji?: string
}

interface Store {
  profile: Profile
  setProfile: (patch: Partial<Profile>) => void
  groups: Record<string, GroupState>
  groupOf: (p: Product) => GroupState
  membersOf: (p: Product) => number
  joinGroup: (p: Product) => void
  simulateJoin: (p: Product) => void
  toasts: Toast[]
  toast: (text: string, emoji?: string) => void
  tr: (key: TKey) => string
  lang: Lang
  reset: () => void
}

const Ctx = createContext<Store>(null!)
export const useStore = () => useContext(Ctx)

let toastSeq = 1

export function StoreProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile>(() => load('birge_profile', EMPTY_PROFILE))
  const [groups, setGroups] = useState<Record<string, GroupState>>(() => load('birge_groups', {}))
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => localStorage.setItem('birge_profile', JSON.stringify(profile)), [profile])
  useEffect(() => localStorage.setItem('birge_groups', JSON.stringify(groups)), [groups])

  const toast = (text: string, emoji?: string) => {
    const id = toastSeq++
    setToasts((ts) => [...ts.slice(-2), { id, text, emoji }])
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 3500)
  }

  const groupOf = (p: Product): GroupState =>
    groups[p.id] ?? { extraMembers: 0, joined: false, deadline: Date.now() + p.hoursLeft * 3_600_000 }

  const membersOf = (p: Product) => p.seedMembers + groupOf(p).extraMembers

  const setProfile = (patch: Partial<Profile>) => setProfileState((prev) => ({ ...prev, ...patch }))

  const joinGroup = (p: Product) => {
    setGroups((g) => {
      const cur = g[p.id] ?? { extraMembers: 0, joined: false, deadline: Date.now() + p.hoursLeft * 3_600_000 }
      if (cur.joined) return g
      return { ...g, [p.id]: { ...cur, extraMembers: cur.extraMembers + 1, joined: true, joinedAt: Date.now() } }
    })
    broadcastJoin({ productId: p.id, name: profile.name || 'Гость', city: profile.city })
  }

  // demo fallback: triple-tap on product image fakes a remote participant joining
  const simulateJoin = (p: Product) => {
    const name = fakeName(Date.now() % 12)
    const city = ['Алматы', 'Астана', 'Шымкент'][Date.now() % 3]
    setGroups((g) => {
      const cur = g[p.id] ?? { extraMembers: 0, joined: false, deadline: Date.now() + p.hoursLeft * 3_600_000 }
      return { ...g, [p.id]: { ...cur, extraMembers: cur.extraMembers + 1 } }
    })
    toast(`${name} (${city}) ${t('toast_joined_other', profile.lang)}`, '⚡')
    broadcastJoin({ productId: p.id, name, city })
  }

  useEffect(() => {
    return subscribeJoins((e) => {
      const p = byId.get(e.productId)
      if (!p) return
      setGroups((g) => {
        const cur = g[p.id] ?? { extraMembers: 0, joined: false, deadline: Date.now() + p.hoursLeft * 3_600_000 }
        return { ...g, [p.id]: { ...cur, extraMembers: cur.extraMembers + 1 } }
      })
      toast(`${e.name} (${e.city}) ${t('toast_joined_other', profile.lang)}`, '⚡')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.lang])

  const reset = () => {
    localStorage.removeItem('birge_profile')
    localStorage.removeItem('birge_groups')
    location.href = '/'
  }

  const value = useMemo<Store>(
    () => ({
      profile,
      setProfile,
      groups,
      groupOf,
      membersOf,
      joinGroup,
      simulateJoin,
      toasts,
      toast,
      tr: (key) => t(key, profile.lang),
      lang: profile.lang,
      reset,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, groups, toasts],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
