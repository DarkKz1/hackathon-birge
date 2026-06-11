import { Link, useNavigate } from 'react-router-dom'
import { catalog, useStore } from '../lib/store'
import { BottomNav, Button, ProgressBar } from '../components/ui'
import { kzt, pct, timeLeft } from '../lib/format'
import { useEffect, useState } from 'react'

export default function Groups() {
  const nav = useNavigate()
  const { groups, membersOf, tr } = useStore()
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const joined = catalog.filter((p) => groups[p.id]?.joined)

  return (
    <div className="min-h-dvh bg-paper pb-28">
      <header className="px-5 pt-[max(env(safe-area-inset-top),20px)]">
        <h1 className="font-display text-[24px] font-bold">{tr('groups_title')}</h1>
      </header>

      {joined.length === 0 ? (
        <div className="px-5 mt-24 text-center rise">
          <div className="text-[44px]">🛍</div>
          <p className="mt-4 text-[15px] text-ink-3 max-w-[260px] mx-auto">{tr('groups_empty')}</p>
          <div className="mt-6 max-w-[240px] mx-auto">
            <Button variant="lime" onClick={() => nav('/feed')}>{tr('groups_empty_cta')}</Button>
          </div>
        </div>
      ) : (
        <div className="px-5 mt-4 space-y-3">
          {joined.map((p, i) => {
            const m = membersOf(p)
            const complete = m >= p.tiers[0].min
            const price = complete ? Math.min(p.tiers[0].priceKzt, m >= p.tiers[1].min ? p.tiers[1].priceKzt : p.tiers[0].priceKzt) : p.tiers[0].priceKzt
            const g = groups[p.id]
            return (
              <Link
                key={p.id}
                to={`/p/${p.id}`}
                className="rise block bg-card rounded-3xl border border-line p-4 active:scale-[0.98] transition-transform"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex gap-3">
                  <img src={p.image} alt="" className="w-[68px] h-[68px] object-contain rounded-2xl bg-white" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${complete ? 'bg-lime/25 text-lime-deep' : 'bg-amber-100 text-amber-700'}`}>
                        {complete ? `✓ ${tr('status_complete')}` : `⏳ ${tr('status_filling')}`}
                      </span>
                      {!complete && <span className="text-[11px] font-bold text-coral">⏱ {timeLeft(g.deadline)}</span>}
                    </div>
                    <div className="mt-1.5 text-[13px] font-semibold leading-snug line-clamp-1">{p.title}</div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-[15px] font-extrabold">{kzt(price)}</span>
                      <span className="text-[11px] text-ink-3 line-through">{kzt(p.retailKzt)}</span>
                      <span className="text-[11px] font-bold text-coral">−{pct(p.retailKzt, price)}%</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1"><ProgressBar value={m} max={p.tiers[0].min} complete={complete} /></div>
                  <span className="text-[12px] font-bold tabular-nums">{m}/{p.tiers[0].min}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
