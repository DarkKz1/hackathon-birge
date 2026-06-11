/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import rawCatalog from '../data/catalog.json'
import type { GroupView, Product, Profile } from './types'
import { CLIENT_ID, fetchJoins, insertJoin, subscribeJoins, type JoinRow } from './realtime'
import { t, type Lang, type TKey } from './i18n'
import { fakeName } from './format'

export const catalog = rawCatalog as Product[]
const byId = new Map(catalog.map((p) => [p.id, p]))

// Демо-группа «не собралась» — дедлайн в прошлом, виден сценарий авторефанда
export const DEMO_EXPIRED = new Set(['p122'])

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
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    if (Array.isArray(fallback)) return (Array.isArray(parsed) ? parsed : fallback) as T
    return { ...fallback, ...parsed }
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private mode / quota — живём без персиста */
  }
}

// Точка отсчёта дедлайнов: фиксируется при первом запуске → таймеры стабильны и тикают
const T0 = (() => {
  try {
    let v = localStorage.getItem('birge_t0')
    if (!v) {
      v = String(Date.now())
      localStorage.setItem('birge_t0', v)
    }
    return +v
  } catch {
    return Date.now()
  }
})()

export const deadlineOf = (p: Product) =>
  DEMO_EXPIRED.has(p.id) ? T0 - 2 * 3_600_000 : T0 + p.hoursLeft * 3_600_000

const joinKey = (r: JoinRow) => `${r.productId}:${r.clientId}`

interface Toast {
  id: number
  text: string
  emoji?: string
}

interface Store {
  profile: Profile
  setProfile: (patch: Partial<Profile>) => void
  joinsVersion: number
  groupOf: (p: Product) => GroupView
  membersOf: (p: Product) => number
  joinGroup: (p: Product, guestName?: string) => void
  simulateJoin: (p: Product) => void
  joinedProducts: () => Product[]
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
  // локальные строки (свои join'ы + симуляции) — офлайн-фолбэк и optimistic UI
  const [localJoins, setLocalJoins] = useState<JoinRow[]>(() => load<JoinRow[]>('birge_local_joins', []))
  const [serverJoins, setServerJoins] = useState<JoinRow[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => save('birge_profile', profile), [profile])
  useEffect(() => save('birge_local_joins', localJoins), [localJoins])

  // merged: сервер + локальные, дедуп по (product, client)
  const joins = useMemo(() => {
    const map = new Map<string, JoinRow>()
    for (const r of [...serverJoins, ...localJoins]) map.set(joinKey(r), r)
    const grouped = new Map<string, JoinRow[]>()
    for (const r of map.values()) {
      const list = grouped.get(r.productId) ?? []
      list.push(r)
      grouped.set(r.productId, list)
    }
    return grouped
  }, [serverJoins, localJoins])

  const toast = (text: string, emoji?: string) => {
    const id = toastSeq++
    setToasts((ts) => [...ts.slice(-2), { id, text, emoji }])
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 3500)
  }

  // initial replay + live-подписка
  useEffect(() => {
    fetchJoins().then((rows) => rows && setServerJoins(rows))
    const known = new Set<string>()
    const unsub = subscribeJoins((row) => {
      const k = joinKey(row)
      if (known.has(k)) return
      known.add(k)
      setServerJoins((prev) => (prev.some((r) => joinKey(r) === k) ? prev : [...prev, row]))
      if (row.clientId !== CLIENT_ID && !row.clientId.startsWith(`${CLIENT_ID}-`)) {
        toast(`${row.name} (${row.city}) ${t('toast_joined_other', profile.lang)}`, 'zap')
      }
    })
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.lang])

  const membersOf = (p: Product) => p.seedMembers + (joins.get(p.id)?.length ?? 0)

  const groupOf = (p: Product): GroupView => {
    const m = membersOf(p)
    const deadline = deadlineOf(p)
    const joined = (joins.get(p.id) ?? []).some((r) => r.clientId === CLIENT_ID)
    const status = m >= p.tiers[0].min ? 'complete' : Date.now() > deadline ? 'expired' : 'filling'
    return { joined, deadline, status }
  }

  const setProfile = (patch: Partial<Profile>) => setProfileState((prev) => ({ ...prev, ...patch }))

  const addLocal = (row: JoinRow) =>
    setLocalJoins((prev) => (prev.some((r) => joinKey(r) === joinKey(row)) ? prev : [...prev, row]))

  const joinGroup = (p: Product, guestName?: string) => {
    const g = groupOf(p)
    if (g.joined || g.status === 'expired') return
    if (membersOf(p) >= p.tiers[1].min) return // группа заполнена по максимальному тиру
    const row: JoinRow = {
      productId: p.id,
      clientId: CLIENT_ID,
      name: guestName?.trim() || profile.name || 'Гость',
      city: profile.city,
    }
    addLocal(row)
    insertJoin(row)
  }

  // демо-страховка: тройной тап по фото = «удалённый участник» (insert виден всем устройствам)
  let simSeq = 0
  const simulateJoin = (p: Product) => {
    if (membersOf(p) >= p.tiers[1].min) return
    const name = fakeName((Date.now() + simSeq) % 12)
    const city = ['Алматы', 'Астана', 'Шымкент'][(Date.now() + simSeq) % 3]
    simSeq++
    const row: JoinRow = {
      productId: p.id,
      clientId: `${CLIENT_ID}-sim-${Math.random().toString(36).slice(2, 7)}`,
      name,
      city,
    }
    addLocal(row)
    insertJoin(row)
    toast(`${name} (${city}) ${t('toast_joined_other', profile.lang)}`, 'zap')
  }

  const joinedProducts = () =>
    catalog.filter((p) => (joins.get(p.id) ?? []).some((r) => r.clientId === CLIENT_ID))

  const reset = () => {
    try {
      localStorage.removeItem('birge_profile')
      localStorage.removeItem('birge_local_joins')
      localStorage.removeItem('birge_client_id')
      localStorage.removeItem('birge_t0')
      for (const k of Object.keys(localStorage)) if (k.startsWith('birge_pick_')) localStorage.removeItem(k)
    } catch {
      /* ignore */
    }
    location.href = '/'
  }

  const value = useMemo<Store>(
    () => ({
      profile,
      setProfile,
      joinsVersion: serverJoins.length * 10_000 + localJoins.length,
      groupOf,
      membersOf,
      joinGroup,
      simulateJoin,
      joinedProducts,
      toasts,
      toast,
      tr: (key) => t(key, profile.lang),
      lang: profile.lang,
      reset,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, joins, toasts],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const productById = (id: string | undefined) => (id ? byId.get(id) : undefined)
