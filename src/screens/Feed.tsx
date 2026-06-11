import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Flame, SearchX, Sparkles } from 'lucide-react'
import { semanticSearch } from '../lib/semantic'
import { catalog, useStore } from '../lib/store'
import { recommend, CATEGORY_KEYS } from '../lib/recommend'
import type { Category, Product } from '../lib/types'
import ProductCard from '../components/ProductCard'
import DailyPick from '../components/DailyPick'
import { BottomNav, Chip, EsimBadge, Logo, ProgressBar } from '../components/ui'
import { kzt, timeLeft } from '../lib/format'

function HotCard({ p }: { p: Product }) {
  const { membersOf, groupOf, tr, lang } = useStore()
  const m = membersOf(p)
  const need = Math.max(0, p.tiers[0].min - m)
  return (
    <Link
      to={`/p/${p.id}`}
      className="shrink-0 w-[240px] bg-ink text-paper rounded-3xl p-3.5 flex gap-3 active:scale-[0.97] transition-transform"
    >
      <img src={p.image} alt="" className="w-[64px] h-[64px] object-contain rounded-xl bg-white" loading="lazy" />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold line-clamp-1">{p.title}</div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-[14px] font-extrabold text-lime">{kzt(p.tiers[0].priceKzt)}</span>
          <span className="text-[10px] text-paper/40 line-through">{kzt(p.retailKzt)}</span>
        </div>
        <div className="mt-2"><ProgressBar value={m} max={p.tiers[0].min} complete={need === 0} /></div>
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] font-semibold text-paper/60">
          <span className="whitespace-nowrap">{tr('need_short')} {need}</span>
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <Clock size={11} /> {timeLeft(groupOf(p).deadline, lang)}
          </span>
        </div>
      </div>
    </Link>
  )
}

function SkeletonGrid() {
  return (
    <div className="mt-5 px-5 grid grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card rounded-3xl border border-line p-3 animate-pulse">
          <div className="h-[120px] rounded-2xl bg-line/60" />
          <div className="mt-3 h-3 rounded bg-line/60 w-3/4" />
          <div className="mt-2 h-3 rounded bg-line/60 w-1/2" />
        </div>
      ))}
    </div>
  )
}

export default function Feed() {
  const { profile, membersOf, groupOf, joinsVersion, tr } = useStore()
  const [cat, setCat] = useState<Category | 'all'>('all')
  const [q, setQ] = useState('')
  const [semHits, setSemHits] = useState<Map<string, number> | null>(null)
  const [searching, setSearching] = useState(false)
  const searchSeq = useRef(0)

  // семантический поиск: debounce 350мс; пока ждём — скелетон, не ложное «не найдено»
  useEffect(() => {
    const query = q.trim()
    const seq = ++searchSeq.current
    if (query.length < 3) {
      setSemHits(null)
      setSearching(false)
      return
    }
    setSearching(true)
    const t = setTimeout(async () => {
      const hits = await semanticSearch(query)
      if (searchSeq.current !== seq) return
      setSearching(false)
      setSemHits(hits ? new Map(hits.map((h) => [h.id, h.score])) : null)
    }, 350)
    return () => clearTimeout(t)
  }, [q])

  // joinsVersion в deps: live-джойны двигают и рекомендации, и «почти собраны»
  const recos = useMemo(
    () => recommend(catalog, profile, membersOf),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, joinsVersion],
  )

  const hot = useMemo(
    () =>
      catalog
        .filter((p) => {
          const fill = membersOf(p) / p.tiers[0].min
          return fill >= 0.6 && fill < 1 && groupOf(p).status === 'filling'
        })
        .sort((a, b) => membersOf(b) / b.tiers[0].min - membersOf(a) / a.tiers[0].min)
        .slice(0, 8),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [joinsVersion],
  )

  const visible = (
    q && semHits
      ? recos
          .filter((r) => semHits.has(r.product.id))
          .sort((a, b) => semHits.get(b.product.id)! - semHits.get(a.product.id)!)
      : recos.filter((r) => !q || r.product.title.toLowerCase().includes(q.toLowerCase()))
  ).filter((r) => cat === 'all' || r.product.category === cat)

  const cats: (Category | 'all')[] = ['all', ...profile.interests, ...(['electronics', 'beauty', 'home', 'fashion', 'sport'] as Category[]).filter((c) => !profile.interests.includes(c))]

  const showSkeleton = Boolean(q) && searching && visible.length === 0
  const showEmpty = Boolean(q) && !searching && visible.length === 0

  return (
    <div className="min-h-dvh bg-paper pb-28">
      <header className="px-5 pt-[max(env(safe-area-inset-top),20px)] flex items-center justify-between">
        <Logo />
        <EsimBadge compact />
      </header>

      <div className="px-5 mt-5">
        <h1 className="font-display text-[20px] font-bold rise">
          {tr('feed_for_you')}, {profile.name}
        </h1>
        <div className="relative rise rise-1 mt-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tr('feed_search')}
            className="w-full bg-card border border-line rounded-2xl px-4 py-3 text-[15px] outline-none focus:border-ink"
          />
          {q && searching && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-violet border-t-transparent animate-spin" />
          )}
          {q && !searching && semHits && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-[11px] font-bold text-violet bg-violet/10 rounded-full px-2 py-1">
              <Sparkles size={11} /> {tr('search_ai')}
            </span>
          )}
        </div>
      </div>

      {/* AI daily pick */}
      {!q && cat === 'all' && <DailyPick recos={recos} />}

      {/* hot groups rail */}
      {hot.length > 0 && !q && cat === 'all' && (
        <section className="mt-7 rise rise-2">
          <div className="px-5 flex items-center gap-1.5 mb-2.5">
            <Flame size={15} className="text-coral" />
            <h2 className="font-bold text-[15px]">{tr('feed_hot')}</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-5">
            {hot.map((p) => <HotCard key={p.id} p={p} />)}
          </div>
        </section>
      )}

      {/* category chips */}
      <div className="mt-7 flex gap-2 overflow-x-auto no-scrollbar px-5 rise rise-3">
        {cats.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
            {c === 'all' ? tr('feed_all') : tr(CATEGORY_KEYS[c])}
          </Chip>
        ))}
      </div>

      {/* product grid */}
      {showSkeleton ? (
        <SkeletonGrid />
      ) : showEmpty ? (
        <div className="mt-16 px-5 text-center rise">
          <SearchX size={36} className="mx-auto text-ink-3" strokeWidth={1.5} />
          <div className="mt-3 font-bold text-[16px]">{tr('search_empty')}</div>
          <p className="mt-1.5 text-[13px] text-ink-3 max-w-[260px] mx-auto">{tr('search_empty_hint')}</p>
        </div>
      ) : (
        <div className="mt-5 px-5 grid grid-cols-2 gap-3">
          {visible.slice(0, 30).map((r, i) => (
            <ProductCard key={r.product.id} reco={r} delay={Math.min(i, 8) * 40} />
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
