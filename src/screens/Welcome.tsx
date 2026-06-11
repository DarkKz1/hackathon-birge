import { useNavigate } from 'react-router-dom'
import { useStore, catalog } from '../lib/store'
import { Button, Logo } from '../components/ui'
import { kzt, pct } from '../lib/format'

export default function Welcome() {
  const nav = useNavigate()
  const { tr, profile } = useStore()
  const strip = [...catalog].sort((a, b) => b.retailKzt - a.retailKzt).slice(0, 12)

  return (
    <div className="min-h-dvh bg-ink text-paper flex flex-col overflow-hidden">
      <div className="px-6 pt-[max(env(safe-area-inset-top),24px)]">
        <Logo dark />
      </div>

      <div className="px-6 mt-10 rise">
        <h1 className="font-display text-[34px] leading-[1.12] font-bold">
          {tr('welcome_h1')}
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-paper/65">{tr('welcome_sub')}</p>
      </div>

      {/* live ticker of deals */}
      <div className="mt-10 rise rise-2 overflow-hidden">
        <div className="flex gap-3 ticker w-max">
          {[...strip, ...strip].map((p, i) => (
            <div key={i} className="w-[150px] shrink-0 rounded-2xl bg-white/[0.06] border border-white/10 p-3">
              <img src={p.image} alt="" className="w-full h-[90px] object-contain rounded-lg bg-white/90" loading="lazy" />
              <div className="mt-2 text-[12px] font-medium text-paper/80 line-clamp-1">{p.title}</div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-[13px] font-bold text-lime">{kzt(p.tiers[1].priceKzt)}</span>
                <span className="text-[10px] text-paper/40 line-through">{kzt(p.retailKzt)}</span>
              </div>
              <div className="mt-1 text-[10px] font-bold text-coral">−{pct(p.retailKzt, p.tiers[1].priceKzt)}%</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      <div className="px-6 pb-[max(env(safe-area-inset-bottom),24px)] rise rise-3">
        <div className="flex items-center gap-2 mb-4 text-[13px] text-paper/60">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-lime" />
          </span>
          {tr('welcome_have')}
        </div>
        <Button variant="lime" onClick={() => nav(profile.onboarded ? '/feed' : '/verify')}>
          {tr('welcome_cta')} →
        </Button>
      </div>
    </div>
  )
}
