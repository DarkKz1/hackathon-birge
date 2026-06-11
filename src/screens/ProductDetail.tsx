import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { productById, useStore } from '../lib/store'
import { Avatars, Button, EsimBadge, ProgressBar } from '../components/ui'
import { MarketBadge } from '../components/ProductCard'
import { hourUnit, kzt, pct, timeLeft } from '../lib/format'
import { recommend } from '../lib/recommend'
import { predictFill } from '../lib/predict'

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }).map((_, i) => ({
        left: (i * 37) % 100,
        delay: (i % 9) * 0.12,
        color: ['#a3e635', '#ff5a3c', '#6d5cff', '#fde047'][i % 4],
        size: 6 + (i % 3) * 4,
      })),
    [],
  )
  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {pieces.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-sm"
          style={{
            left: `${p.left}%`,
            top: 0,
            width: p.size,
            height: p.size,
            background: p.color,
            animation: `confetti-fall ${1.8 + (i % 5) * 0.3}s ease-in ${p.delay}s both`,
          }}
        />
      ))}
    </div>
  )
}

function QrOverlay({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    QRCode.toDataURL(url, { width: 480, margin: 1, color: { dark: '#0d0f12', light: '#ffffff' } }).then(setSrc)
  }, [url])
  return (
    <div className="fixed inset-0 z-50 bg-ink/90 backdrop-blur flex flex-col items-center justify-center px-8" onClick={onClose}>
      <div className="text-paper/60 text-[14px] font-semibold mb-4 text-center">{title}</div>
      {src && <img src={src} alt="QR" className="w-full max-w-[300px] rounded-3xl pop" />}
      <div className="mt-5 text-paper font-display font-bold text-[18px]">
        birge<span className="text-lime">·</span>
      </div>
    </div>
  )
}

export default function ProductDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { profile, membersOf, groupOf, joinGroup, simulateJoin, toast, tr, lang } = useStore()
  const taps = useRef({ n: 0, t: 0 })
  const p = productById(id)
  const [sheet, setSheet] = useState(false)
  const [confetti, setConfetti] = useState(false)
  const [qr, setQr] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [, tick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const m = p ? membersOf(p) : 0
  const tier1Done = p ? m >= p.tiers[0].min : false

  // конфетти — только в МОМЕНТ сбора группы (переход false→true), не при каждом открытии
  const prevDone = useRef<boolean | null>(null)
  useEffect(() => {
    if (prevDone.current === false && tier1Done && p && groupOf(p).joined) {
      setConfetti(true)
      const t = setTimeout(() => setConfetti(false), 3000)
      return () => clearTimeout(t)
    }
    prevDone.current = tier1Done
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier1Done])

  if (!p) return <Navigate to={profile.onboarded ? '/feed' : '/'} replace />

  const g = groupOf(p)
  const expired = g.status === 'expired'
  const goal = tier1Done ? p.tiers[1] : p.tiers[0]
  const tier2Done = m >= p.tiers[1].min
  const full = m >= p.tiers[1].min
  const price = tier2Done ? p.tiers[1].priceKzt : p.tiers[0].priceKzt
  const reasons = recommend([p], profile, membersOf)[0].reasons
  const isGuest = !profile.onboarded

  const confirmJoin = () => {
    if (g.joined) return
    joinGroup(p, isGuest ? guestName : undefined)
    setSheet(false)
    toast(tr('join_success'), '🎉')
    if (m + 1 >= p.tiers[0].min) {
      setTimeout(() => toast(tr('group_complete'), '📦'), 1200)
    }
  }

  const invite = async () => {
    const url = `${location.origin}/p/${p.id}`
    try {
      if (navigator.share) {
        await navigator.share({ title: p.title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      toast(tr('invite_copied'), '🔗')
    } catch {
      /* пользователь отменил share / clipboard недоступен */
    }
  }

  return (
    <div className="min-h-dvh bg-paper pb-36">
      {confetti && <Confetti />}
      {qr && <QrOverlay url={`${location.origin}/p/${p.id}`} title={tr('invite')} onClose={() => setQr(false)} />}

      {/* header image */}
      <div className="relative bg-white">
        <img
          src={p.image}
          alt={p.title}
          className="w-full h-[290px] object-contain pt-10"
          onClick={() => {
            const now = Date.now()
            taps.current.n = now - taps.current.t < 600 ? taps.current.n + 1 : 1
            taps.current.t = now
            if (taps.current.n === 3) {
              taps.current.n = 0
              simulateJoin(p)
            }
          }}
        />
        <button
          onClick={() => nav(-1)}
          className="absolute top-[max(env(safe-area-inset-top),16px)] left-4 w-10 h-10 rounded-full bg-ink/85 text-paper flex items-center justify-center backdrop-blur active:scale-90 transition-transform"
        >
          ←
        </button>
        <div className="absolute top-[max(env(safe-area-inset-top),16px)] right-4 flex gap-2 items-center">
          <MarketBadge name={p.marketplace} />
          <button
            onClick={() => setQr(true)}
            className="w-10 h-10 rounded-full bg-ink/85 text-paper flex items-center justify-center backdrop-blur active:scale-90 transition-transform"
            aria-label="QR"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <path d="M14 14h3v3h-3zM18 18h3v3h-3z" />
            </svg>
          </button>
        </div>
        <div className="absolute bottom-3 left-4 rounded-lg bg-coral text-white text-[14px] font-extrabold px-2.5 py-1">
          −{pct(p.retailKzt, price)}%
        </div>
      </div>

      <div className="px-5 mt-4">
        <div className="flex items-start justify-between gap-3 rise">
          <div>
            {p.brand && <div className="text-[12px] font-bold text-ink-3 uppercase tracking-wide">{p.brand}</div>}
            <h1 className="text-[19px] font-bold leading-snug mt-0.5">{p.title}</h1>
          </div>
          <div className="shrink-0 flex items-center gap-1 bg-card border border-line rounded-xl px-2 py-1 text-[13px] font-bold">
            ★ {p.rating.toFixed(1)}
          </div>
        </div>

        <div className="mt-2 text-[12px] text-ink-3 font-medium rise rise-1">
          {tr('source')}: {p.marketplace} · {tr('ship_eta')} ~{p.shipDays} {tr('days')}
        </div>

        {/* expired banner */}
        {expired && (
          <div className="mt-4 rounded-2xl bg-coral/10 border border-coral/30 px-4 py-3 text-[13px] font-semibold text-coral rise">
            ↩️ {tr('expired_banner')}
          </div>
        )}

        {/* price + group block */}
        <div className={`mt-4 bg-card rounded-3xl border border-line p-5 rise rise-1 ${expired ? 'opacity-70' : ''}`}>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[12px] font-semibold text-ink-3">{tr('group_price')}</div>
              <div className="text-[32px] font-extrabold leading-none mt-1">{kzt(price)}</div>
            </div>
            <div className="text-right">
              <div className="text-[12px] font-semibold text-ink-3">{tr('retail_price')}</div>
              <div className="text-[17px] font-bold text-ink-3 line-through mt-1">{kzt(p.retailKzt)}</div>
            </div>
          </div>

          <div className="mt-3 inline-flex items-center gap-1.5 bg-lime/25 text-lime-deep rounded-full px-3 py-1 text-[13px] font-bold">
            {tr('savings')}: {kzt(p.retailKzt - price)}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <Avatars count={m} seed={parseInt(p.id.slice(1)) || 1} you={g.joined} youLabel={lang === 'kk' ? 'Сіз' : 'Вы'} />
            <div className="text-[13px] font-bold tabular-nums">
              {Math.min(m, goal.min)}<span className="text-ink-3">/{goal.min} {tr('members')}</span>
            </div>
          </div>
          <div className="mt-2.5">
            <ProgressBar value={m} max={goal.min} complete={tier1Done} />
          </div>

          <div className="mt-3 flex items-center justify-between text-[12px] font-semibold">
            <span className="text-ink-2">
              {expired
                ? tr('status_expired')
                : tier1Done
                  ? `${tr('group_complete').split('!')[0]}! 🎉`
                  : `${tr('need_more')}: ${goal.min - m}`}
            </span>
            {!expired && (
              <span className="text-coral whitespace-nowrap">⏱ {tr('time_left')}: {timeLeft(g.deadline, lang)}</span>
            )}
          </div>

          {/* fill prediction */}
          {!tier1Done && !expired && (() => {
            const { prob, etaHours } = predictFill(p, m, g.deadline)
            return (
              <div className="mt-3 inline-flex items-center gap-1.5 bg-violet/10 text-violet rounded-full px-3 py-1.5 text-[12px] font-bold">
                📈 {tr('predict_label')} · {prob}% · {tr('predict_eta')} ~{etaHours}{hourUnit(lang)}
              </div>
            )
          })()}

          {/* next tier teaser */}
          {!tier2Done && !expired && (
            <div className="mt-4 rounded-2xl bg-paper border border-dashed border-ink-3/40 px-4 py-3 text-[12px] font-semibold text-ink-2">
              💡 {p.tiers[1].min} {tr('members')} {tr('next_tier')} <b className="text-ink">{kzt(p.tiers[1].priceKzt)}</b> (−{pct(p.retailKzt, p.tiers[1].priceKzt)}%)
            </div>
          )}
        </div>

        {/* why recommended */}
        {reasons.length > 0 && (
          <div className="mt-4 rise rise-2">
            <h3 className="text-[14px] font-bold">{tr('why_showed')}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {reasons.map((r, i) => (
                <span key={i} className="text-[12px] font-semibold text-violet bg-violet/10 rounded-full px-3 py-1.5">
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* how it works */}
        <div className="mt-5 bg-ink text-paper rounded-3xl p-5 rise rise-3">
          <h3 className="text-[14px] font-bold">{tr('how_works')}</h3>
          <div className="mt-3 space-y-3">
            {[tr('how_1'), tr('how_2'), tr('how_3')].map((s, i) => (
              <div key={i} className="flex gap-3 items-start text-[13px] text-paper/80">
                <span className="w-6 h-6 shrink-0 rounded-full bg-lime text-ink text-[12px] font-extrabold flex items-center justify-center">{i + 1}</span>
                {s}
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2 text-[11px] text-paper/50">
            <EsimBadge compact /> {tr('esim_what')}
          </div>
        </div>

        {/* invite */}
        <button
          onClick={invite}
          className="mt-4 w-full rise rise-4 rounded-2xl border-2 border-dashed border-violet/50 text-violet font-bold text-[14px] py-3.5 active:scale-[0.97] transition-transform"
        >
          🤝 {tr('invite')}
        </button>
      </div>

      {/* sticky CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-card/95 backdrop-blur-lg border-t border-line px-5 pt-3 pb-[max(env(safe-area-inset-bottom),16px)] z-40">
        {expired ? (
          <div className="w-full rounded-2xl py-4 bg-line text-ink-3 font-bold text-[16px] text-center">
            ↩️ {tr('status_expired')}
          </div>
        ) : g.joined ? (
          <div className="w-full rounded-2xl py-4 bg-lime/25 text-lime-deep font-bold text-[16px] text-center">
            ✓ {tr('joined_badge')} · {kzt(price)}
          </div>
        ) : full ? (
          <div className="w-full rounded-2xl py-4 bg-line text-ink-2 font-bold text-[16px] text-center">
            {tr('group_full')}
          </div>
        ) : (
          <Button variant="lime" onClick={() => setSheet(true)}>
            {tr('join_cta')} {kzt(price)}
          </Button>
        )}
      </div>

      {/* join bottom sheet */}
      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setSheet(false)}>
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]" />
          <div
            className="relative w-full max-w-[430px] bg-card rounded-t-[28px] p-6 pb-[max(env(safe-area-inset-bottom),24px)] rise"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-line mx-auto" />
            <h2 className="font-display text-[19px] font-bold mt-4">{tr('join_title')}</h2>

            <div className="mt-4 flex gap-3 items-center bg-paper rounded-2xl p-3">
              <img src={p.image} alt="" className="w-14 h-14 object-contain rounded-xl bg-white" />
              <div className="min-w-0">
                <div className="text-[13px] font-semibold line-clamp-1">{p.title}</div>
                <div className="text-[15px] font-extrabold mt-0.5">{kzt(price)} <span className="text-[11px] text-ink-3 line-through font-semibold">{kzt(p.retailKzt)}</span></div>
              </div>
            </div>

            {isGuest && (
              <div className="mt-4">
                <label className="text-[13px] font-bold text-ink-2">{tr('guest_name_label')}</label>
                <input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  maxLength={24}
                  autoFocus
                  className="mt-2 w-full bg-paper border border-line rounded-2xl px-4 py-3 text-[16px] font-semibold outline-none focus:border-ink"
                  placeholder="Айдос"
                />
                <div className="mt-1.5 text-[11px] text-ink-3 font-medium">{tr('guest_note')}</div>
              </div>
            )}

            <div className="mt-4 space-y-2.5 text-[13px] font-medium text-ink-2">
              <div className="flex gap-2.5 items-start"><span>🔒</span>{tr('join_hold')}</div>
              <div className="flex gap-2.5 items-start"><span>↩️</span>{tr('join_refund')}</div>
              <div className="flex gap-2.5 items-start">
                <span>🛡</span>
                {isGuest ? `${tr('guest_badge')} · ${tr('guest_note')}` : `${tr('esim_verified')} — ${profile.phone}`}
              </div>
            </div>

            <Button variant="primary" className="mt-6" disabled={isGuest && !guestName.trim()} onClick={confirmJoin}>
              {tr('join_confirm')} {kzt(price)}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
