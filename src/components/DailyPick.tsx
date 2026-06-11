import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { catalog, useStore } from '../lib/store'
import type { Reco } from '../lib/types'
import { kzt, pct } from '../lib/format'

interface PickData {
  intro: string
  picks: { id: string; blurb: string }[]
  source: 'llm' | 'local'
}

const byId = new Map(catalog.map((p) => [p.id, p]))

export default function DailyPick({ recos }: { recos: Reco[] }) {
  const { profile, membersOf, tr } = useStore()
  const [data, setData] = useState<PickData | null>(null)

  useEffect(() => {
    const cacheKey = `birge_pick_${new Date().toDateString()}_${profile.lang}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      setData(JSON.parse(cached))
      return
    }

    const fallback = (): PickData => ({
      intro: tr('pick_fallback_intro').replace('{name}', profile.name),
      picks: recos.slice(0, 3).map((r) => ({
        id: r.product.id,
        blurb: `${tr('pick_fallback_blurb')} ${kzt(r.product.retailKzt - r.product.tiers[0].priceKzt)}`,
      })),
      source: 'local',
    })

    const candidates = recos.slice(0, 20).map((r) => ({
      id: r.product.id,
      title: r.product.title,
      category: r.product.category,
      priceKzt: r.product.tiers[0].priceKzt,
      retailKzt: r.product.retailKzt,
      members: membersOf(r.product),
      min: r.product.tiers[0].min,
    }))

    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 6000)
    fetch('/api/pick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctl.signal,
      body: JSON.stringify({
        profile: { name: profile.name, city: profile.city, budgetKzt: profile.budgetKzt, interests: profile.interests, lang: profile.lang },
        candidates,
      }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json) => {
        const picked: PickData = { ...json, picks: json.picks.filter((x: { id: string }) => byId.has(x.id)).slice(0, 3), source: 'llm' }
        if (picked.picks.length === 0) throw new Error('no valid picks')
        localStorage.setItem(cacheKey, JSON.stringify(picked))
        setData(picked)
      })
      .catch(() => setData(fallback()))
      .finally(() => clearTimeout(timer))
    return () => { ctl.abort(); clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.lang])

  if (!data) return null

  return (
    <div className="mx-5 mt-5 rise rounded-3xl bg-gradient-to-br from-violet to-[#4a3dd1] text-white p-5">
      <div className="flex items-center gap-2">
        <span className="text-[16px]">✨</span>
        <h2 className="font-bold text-[14px]">{tr('pick_title')}</h2>
      </div>
      <p className="mt-2 text-[13px] leading-snug text-white/85">{data.intro}</p>
      <div className="mt-3 space-y-2">
        {data.picks.map(({ id, blurb }) => {
          const p = byId.get(id)!
          return (
            <Link key={id} to={`/p/${id}`} className="flex gap-3 items-center bg-white/10 rounded-2xl p-2.5 active:scale-[0.98] transition-transform">
              <img src={p.image} alt="" className="w-12 h-12 object-contain rounded-xl bg-white shrink-0" loading="lazy" />
              <div className="min-w-0">
                <div className="text-[12px] font-semibold line-clamp-1">{p.title}</div>
                <div className="text-[11px] text-white/70 line-clamp-2 leading-snug">{blurb}</div>
                <div className="text-[12px] font-extrabold mt-0.5">
                  {kzt(p.tiers[0].priceKzt)} <span className="text-[10px] font-bold text-lime">−{pct(p.retailKzt, p.tiers[0].priceKzt)}%</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
