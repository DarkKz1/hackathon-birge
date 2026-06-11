import { createClient } from '@supabase/supabase-js'

// Состояние групп живёт в таблице birge_joins (sandbox-проект, RLS: anon select+insert).
// Подписка на postgres_changes INSERT даёт live-обновления; начальный fetch — replay для новых устройств.
const SUPABASE_URL = 'https://mztujmeykhlgwqpdoilf.supabase.co'
const SUPABASE_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16dHVqbWV5a2hsZ3dxcGRvaWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNjI0ODAsImV4cCI6MjA4NjgzODQ4MH0.6_ui3S3wM3uOd-4VuNAQd4h3KFWoXUH2fHrwTNn28fw'

const safeStorage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value)
    } catch {
      /* private mode / quota — работаем без персиста */
    }
  },
}

export const CLIENT_ID = (() => {
  let v = safeStorage.get('birge_client_id')
  if (!v) {
    v = Math.random().toString(36).slice(2, 10)
    safeStorage.set('birge_client_id', v)
  }
  return v
})()

export interface JoinRow {
  productId: string
  clientId: string
  name: string
  city: string
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

interface DbRow {
  product_id: string
  client_id: string
  name: string
  city: string
}

const fromDb = (r: DbRow): JoinRow => ({
  productId: r.product_id,
  clientId: r.client_id,
  name: r.name,
  city: r.city,
})

// null = сервер недоступен → вызывающий работает в офлайн-режиме на локальном состоянии
export async function fetchJoins(): Promise<JoinRow[] | null> {
  try {
    const { data, error } = await supabase
      .from('birge_joins')
      .select('product_id, client_id, name, city')
      .limit(2000)
    if (error || !data) return null
    return (data as DbRow[]).map(fromDb)
  } catch {
    return null
  }
}

export function insertJoin(row: JoinRow) {
  supabase
    .from('birge_joins')
    .upsert(
      { product_id: row.productId, client_id: row.clientId, name: row.name.slice(0, 40), city: row.city.slice(0, 40) },
      { onConflict: 'product_id,client_id', ignoreDuplicates: true },
    )
    .then(({ error }) => {
      if (error) console.warn('join insert failed (offline?):', error.message)
    })
}

export function subscribeJoins(handler: (row: JoinRow) => void) {
  const channel = supabase
    .channel('birge-joins-db')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'birge_joins' },
      (payload) => handler(fromDb(payload.new as DbRow)),
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}
