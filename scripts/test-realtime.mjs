// Verifies the Supabase broadcast channel end-to-end: subscriber + sender.
import { createClient } from '@supabase/supabase-js'

const URL = 'https://mztujmeykhlgwqpdoilf.supabase.co'
const KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16dHVqbWV5a2hsZ3dxcGRvaWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNjI0ODAsImV4cCI6MjA4NjgzODQ4MH0.6_ui3S3wM3uOd-4VuNAQd4h3KFWoXUH2fHrwTNn28fw'

const a = createClient(URL, KEY)
const b = createClient(URL, KEY)

const recv = new Promise((resolve, reject) => {
  setTimeout(() => reject(new Error('timeout: no broadcast received in 10s')), 10000)
  a.channel('birge-groups', { config: { broadcast: { self: false } } })
    .on('broadcast', { event: 'join' }, ({ payload }) => resolve(payload))
    .subscribe()
})

const chB = b.channel('birge-groups')
chB.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    setTimeout(() => {
      chB.send({ type: 'broadcast', event: 'join', payload: { productId: 'p81', name: 'Тест', city: 'Алматы', clientId: 'node-test' } })
    }, 800)
  }
})

const payload = await recv
console.log('REALTIME OK:', JSON.stringify(payload))
process.exit(0)
