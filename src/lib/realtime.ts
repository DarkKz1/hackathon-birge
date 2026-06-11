import { createClient } from '@supabase/supabase-js'

// Broadcast-only channel (ephemeral pub/sub, no DB) — syncs group joins across devices for the live demo.
const SUPABASE_URL = 'https://mztujmeykhlgwqpdoilf.supabase.co'
const SUPABASE_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16dHVqbWV5a2hsZ3dxcGRvaWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNjI0ODAsImV4cCI6MjA4NjgzODQ4MH0.6_ui3S3wM3uOd-4VuNAQd4h3KFWoXUH2fHrwTNn28fw'

export const CLIENT_ID = (() => {
  const k = 'birge_client_id'
  let v = localStorage.getItem(k)
  if (!v) {
    v = Math.random().toString(36).slice(2, 10)
    localStorage.setItem(k, v)
  }
  return v
})()

export interface JoinEvent {
  productId: string
  name: string
  city: string
  clientId: string
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
const channel = supabase.channel('birge-groups', { config: { broadcast: { self: false } } })

let onJoin: ((e: JoinEvent) => void) | null = null
let subscribed = false

export function subscribeJoins(handler: (e: JoinEvent) => void) {
  onJoin = handler
  if (!subscribed) {
    subscribed = true
    channel
      .on('broadcast', { event: 'join' }, ({ payload }) => {
        const e = payload as JoinEvent
        if (e.clientId !== CLIENT_ID) onJoin?.(e)
      })
      .subscribe()
  }
  return () => {
    onJoin = null
  }
}

export function broadcastJoin(e: Omit<JoinEvent, 'clientId'>) {
  channel.send({ type: 'broadcast', event: 'join', payload: { ...e, clientId: CLIENT_ID } })
}
