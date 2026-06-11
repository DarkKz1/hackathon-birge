import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Button } from '../components/ui'
import { CATEGORY_KEYS } from '../lib/recommend'
import type { Category } from '../lib/types'

const EMOJI: Record<Category, string> = {
  electronics: '📱',
  beauty: '✨',
  home: '🏠',
  fashion: '👗',
  sport: '🏋️',
}

export default function Interests() {
  const nav = useNavigate()
  const { tr, profile, setProfile } = useStore()
  const [sel, setSel] = useState<Category[]>(profile.interests)

  const toggle = (c: Category) =>
    setSel((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]))

  const finish = () => {
    setProfile({ interests: sel, onboarded: true })
    nav('/feed')
  }

  return (
    <div className="min-h-dvh flex flex-col px-6 bg-paper">
      <div className="pt-[max(env(safe-area-inset-top),24px)]">
        <button onClick={() => nav(-1)} className="text-ink-3 text-[15px] py-2">← {tr('back')}</button>
      </div>

      <h1 className="font-display text-[26px] font-bold mt-4 rise">{tr('interests_title')}</h1>
      <p className="mt-2 text-[14px] text-ink-3 rise rise-1">{tr('interests_sub')}</p>

      <div className="mt-8 grid grid-cols-2 gap-3">
        {(Object.keys(EMOJI) as Category[]).map((c, i) => {
          const active = sel.includes(c)
          return (
            <button
              key={c}
              onClick={() => toggle(c)}
              className={`rise rounded-3xl p-5 text-left transition-all active:scale-95 border-2 ${
                active ? 'bg-ink text-paper border-ink' : 'bg-card border-line'
              }`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="text-[30px]">{EMOJI[c]}</div>
              <div className="mt-3 font-bold text-[15px] leading-tight">{tr(CATEGORY_KEYS[c])}</div>
              <div className={`mt-2 w-6 h-6 rounded-full flex items-center justify-center ${active ? 'bg-lime' : 'bg-line'}`}>
                {active && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0d0f12" strokeWidth="3.5" strokeLinecap="round"><path d="M5 13l4 4L19 7" /></svg>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex-1" />
      <div className="pb-[max(env(safe-area-inset-bottom),24px)]">
        <Button disabled={sel.length < 2} onClick={finish}>
          {tr('done')} {sel.length >= 2 ? '→' : `(${sel.length}/2)`}
        </Button>
      </div>
    </div>
  )
}
