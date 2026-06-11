import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { kzt, pct } from '../lib/format'
import type { Reco } from '../lib/types'
import { ProgressBar } from './ui'

export function MarketBadge({ name }: { name: string }) {
  return (
    <span className="rounded-md bg-ink/80 text-paper text-[10px] font-bold px-1.5 py-0.5 backdrop-blur-sm">
      {name}
    </span>
  )
}

export default function ProductCard({ reco, delay = 0 }: { reco: Reco; delay?: number }) {
  const { membersOf, groupOf, tr } = useStore()
  const p = reco.product
  const m = membersOf(p)
  const goal = m >= p.tiers[0].min ? p.tiers[1] : p.tiers[0]
  const price = m >= p.tiers[1].min ? p.tiers[1].priceKzt : p.tiers[0].priceKzt
  const joined = groupOf(p).joined

  return (
    <Link
      to={`/p/${p.id}`}
      className="rise block bg-card rounded-3xl p-3 border border-line active:scale-[0.97] transition-transform"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative">
        <img src={p.image} alt={p.title} className="w-full h-[130px] object-contain rounded-2xl bg-white" loading="lazy" />
        <div className="absolute top-2 left-2"><MarketBadge name={p.marketplace} /></div>
        <div className="absolute top-2 right-2 rounded-md bg-coral text-white text-[11px] font-extrabold px-1.5 py-0.5">
          −{pct(p.retailKzt, price)}%
        </div>
        {joined && (
          <div className="absolute bottom-2 left-2 rounded-md bg-lime text-ink text-[10px] font-extrabold px-1.5 py-0.5">
            ✓ {tr('joined_badge')}
          </div>
        )}
      </div>

      <div className="mt-2.5 px-1">
        <div className="text-[13px] font-semibold leading-snug line-clamp-2 min-h-[34px]">{p.title}</div>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className="text-[16px] font-extrabold">{kzt(price)}</span>
          <span className="text-[11px] text-ink-3 line-through">{kzt(p.retailKzt)}</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1"><ProgressBar value={m} max={goal.min} complete={m >= p.tiers[0].min} /></div>
          <span className="text-[11px] font-bold text-ink-2 tabular-nums">{m}/{goal.min}</span>
        </div>
        {reco.reasons.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {reco.reasons.map((r, i) => (
              <span key={i} className="text-[10px] font-semibold text-lime-deep bg-lime/20 rounded-full px-2 py-0.5">
                {r}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
