import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { catalog, useStore } from '../lib/store'
import { recommend, CATEGORY_KEYS } from '../lib/recommend'
import type { Category, Product } from '../lib/types'
import ProductCard from '../components/ProductCard'
import DailyPick from '../components/DailyPick'
import { BottomNav, Chip, EsimBadge, Logo, ProgressBar } from '../components/ui'
import { kzt, timeLeft } from '../lib/format'

function HotCard({ p }: { p: Product }) {
  const { membersOf, groupOf, tr } = useStore()
  const m = membersOf(p)
  const need = Math.max(0, p.tiers[0].min - m)
  return (
    <Link
      to={`/p/${p.id}`}
      className="shrink-0 w-[260px] bg-ink text-paper rounded-3xl p-4 flex gap-3 active:scale-[0.97] transition-transform"
    >
      <img src={p.image} alt="" className="w-[72px] h-[72px] object-contain rounded-xl bg-white" loading="lazy" />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold line-clamp-1">{p.title}</div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-[15px] font-extrabold text-lime">{kzt(p.tiers[0].priceKzt)}</span>
          <span className="text-[10px] text-paper/40 line-through">{kzt(p.retailKzt)}</span>
        </div>
        <div className="mt-2"><ProgressBar value={m} max={p.tiers[0].min} complete={need === 0} /></div>
        <div className="mt-1.5 flex justify-between gap-2 text-[10px] font-semibold text-paper/60">
          <span className="whitespace-nowrap">{tr('need_more')}: {need}</span>
          <span className="text-coral whitespace-nowrap">⏱ {timeLeft(groupOf(p).deadline)}</span>
        </div>
      </div>
    </Link>
  )
}

export default function Feed() {
  const { profile, membersOf, tr } = useStore()
  const [cat, setCat] = useState<Category | 'all'>('all')
  const [q, setQ] = useState('')

  const recos = useMemo(
    () => recommend(catalog, profile, membersOf),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile],
  )

  const hot = useMemo(
    () =>
      catalog
        .filter((p) => {
          const fill = membersOf(p) / p.tiers[0].min
          return fill >= 0.6
        })
        .sort((a, b) => membersOf(b) / b.tiers[0].min - membersOf(a) / a.tiers[0].min)
        .slice(0, 8),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const visible = recos.filter(
    (r) =>
      (cat === 'all' || r.product.category === cat) &&
      (!q || r.product.title.toLowerCase().includes(q.toLowerCase())),
  )

  const cats: (Category | 'all')[] = ['all', ...profile.interests, ...(['electronics', 'beauty', 'home', 'fashion', 'sport'] as Category[]).filter((c) => !profile.interests.includes(c))]

  return (
    <div className="min-h-dvh bg-paper pb-28">
      <header className="px-5 pt-[max(env(safe-area-inset-top),20px)] flex items-center justify-between">
        <Logo />
        <EsimBadge compact />
      </header>

      <div className="px-5 mt-4">
        <h1 className="font-display text-[22px] font-bold rise">
          {tr('feed_for_you')}, {profile.name} 👋
        </h1>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tr('feed_search')}
          className="rise rise-1 mt-3 w-full bg-card border border-line rounded-2xl px-4 py-3 text-[15px] outline-none focus:border-ink"
        />
      </div>

      {/* AI daily pick */}
      {!q && cat === 'all' && <DailyPick recos={recos} />}

      {/* hot groups rail */}
      {hot.length > 0 && !q && cat === 'all' && (
        <div className="mt-5 rise rise-2">
          <div className="px-5 flex items-center gap-1.5 mb-2.5">
            <span className="text-[15px]">🔥</span>
            <h2 className="font-bold text-[15px]">{tr('feed_hot')}</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-5">
            {hot.map((p) => <HotCard key={p.id} p={p} />)}
          </div>
        </div>
      )}

      {/* category chips */}
      <div className="mt-5 flex gap-2 overflow-x-auto no-scrollbar px-5 rise rise-3">
        {cats.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
            {c === 'all' ? tr('feed_all') : tr(CATEGORY_KEYS[c])}
          </Chip>
        ))}
      </div>

      {/* product grid */}
      <div className="mt-4 px-5 grid grid-cols-2 gap-3">
        {visible.slice(0, 30).map((r, i) => (
          <ProductCard key={r.product.id} reco={r} delay={Math.min(i, 8) * 40} />
        ))}
      </div>

      <BottomNav />
    </div>
  )
}
