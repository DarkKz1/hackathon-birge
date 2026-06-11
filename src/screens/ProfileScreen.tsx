import { useStore } from '../lib/store'
import { BottomNav, Chip, EsimBadge } from '../components/ui'
import { CATEGORY_KEYS } from '../lib/recommend'
import { CITIES } from '../lib/i18n'
import type { Category } from '../lib/types'
import { kzt, initials } from '../lib/format'

export default function ProfileScreen() {
  const { profile, setProfile, tr, reset } = useStore()

  const toggleInterest = (c: Category) => {
    const next = profile.interests.includes(c)
      ? profile.interests.filter((x) => x !== c)
      : [...profile.interests, c]
    if (next.length >= 1) setProfile({ interests: next })
  }

  return (
    <div className="min-h-dvh bg-paper pb-28">
      <header className="px-5 pt-[max(env(safe-area-inset-top),20px)]">
        <h1 className="font-display text-[24px] font-bold">{tr('profile_title')}</h1>
      </header>

      <div className="px-5 mt-4 space-y-4">
        {/* identity card */}
        <div className="bg-ink text-paper rounded-3xl p-5 rise">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-lime text-ink font-display font-bold text-[22px] flex items-center justify-center">
              {initials(profile.name || 'Г')}
            </div>
            <div>
              <div className="text-[18px] font-bold">{profile.name}</div>
              <div className="text-[13px] text-paper/55">{profile.phone} · {profile.city}</div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-white/[0.06] border border-white/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold">{tr('esim_card_title')}</span>
              <EsimBadge compact />
            </div>
            <div className="mt-2.5 text-[11px] text-paper/40 font-semibold">eSIM ID (EID)</div>
            <div className="text-[13px] font-bold tracking-wider">{profile.esimId || '—'}</div>
            <div className="mt-1 text-[11px] text-paper/40 font-semibold">{profile.operator}</div>
            <p className="mt-3 text-[12px] leading-relaxed text-paper/55">{tr('esim_what')}</p>
          </div>
        </div>

        {/* budget */}
        <div className="bg-card rounded-3xl border border-line p-5 rise rise-1">
          <div className="text-[13px] font-bold text-ink-2">
            {tr('budget_label')} · <span className="text-lime-deep">{kzt(profile.budgetKzt)}</span>
          </div>
          <input
            type="range" min={10_000} max={400_000} step={5_000}
            value={profile.budgetKzt}
            onChange={(e) => setProfile({ budgetKzt: +e.target.value })}
            className="mt-3 w-full"
          />
        </div>

        {/* city */}
        <div className="bg-card rounded-3xl border border-line p-5 rise rise-2">
          <div className="text-[13px] font-bold text-ink-2 mb-3">{tr('setup_city')}</div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
            {CITIES.map((c) => (
              <Chip key={c} active={profile.city === c} onClick={() => setProfile({ city: c })}>{c}</Chip>
            ))}
          </div>
        </div>

        {/* interests */}
        <div className="bg-card rounded-3xl border border-line p-5 rise rise-2">
          <div className="text-[13px] font-bold text-ink-2 mb-3">{tr('interests_title')}</div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CATEGORY_KEYS) as Category[]).map((c) => (
              <Chip key={c} active={profile.interests.includes(c)} onClick={() => toggleInterest(c)}>
                {tr(CATEGORY_KEYS[c])}
              </Chip>
            ))}
          </div>
        </div>

        {/* language */}
        <div className="bg-card rounded-3xl border border-line p-5 rise rise-3">
          <div className="text-[13px] font-bold text-ink-2 mb-3">{tr('lang_label')}</div>
          <div className="flex gap-2">
            <Chip active={profile.lang === 'ru'} onClick={() => setProfile({ lang: 'ru' })}>Русский</Chip>
            <Chip active={profile.lang === 'kk'} onClick={() => setProfile({ lang: 'kk' })}>Қазақша</Chip>
          </div>
        </div>

        <button onClick={reset} className="w-full text-center text-[13px] font-semibold text-ink-3 py-3">
          {tr('reset')}
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
