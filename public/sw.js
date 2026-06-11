// Минимальный SW: кэш картинок каталога — повторные открытия работают и при плохой сети
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()))
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (url.origin === location.origin && url.pathname.startsWith('/img/')) {
    e.respondWith(
      caches.open('birge-img-v1').then(async (c) => {
        const hit = await c.match(e.request)
        if (hit) return hit
        const res = await fetch(e.request)
        if (res.ok) c.put(e.request, res.clone())
        return res
      }),
    )
  }
})
