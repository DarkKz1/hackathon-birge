import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Button, Chip } from '../components/ui'
import { CITIES } from '../lib/i18n'
import { kzt } from '../lib/format'

export default function Setup() {
  const nav = useNavigate()
  const { tr, profile, setProfile } = useStore()
  const [name, setName] = useState(profile.name)
  const [age, setAge] = useState(profile.age)
  const [city, setCity] = useState(profile.city)
  const [budget, setBudget] = useState(profile.budgetKzt)

  const save = () => {
    setProfile({ name: name.trim(), age, city, budgetKzt: budget })
    nav('/interests')
  }

  return (
    <div className="min-h-dvh flex flex-col px-6 bg-paper">
      <div className="pt-[max(env(safe-area-inset-top),24px)]">
        <button onClick={() => nav(-1)} className="text-ink-3 text-[15px] py-2">← {tr('back')}</button>
      </div>

      <h1 className="font-display text-[26px] font-bold mt-4 rise">{tr('setup_title')}</h1>
      <p className="mt-2 text-[14px] text-ink-3 rise rise-1">{tr('setup_sub')}</p>

      <div className="mt-8 space-y-6">
        <div className="rise rise-1">
          <label className="text-[13px] font-bold text-ink-2">{tr('setup_name')}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full bg-card border border-line rounded-2xl px-5 py-4 text-[17px] font-semibold outline-none focus:border-ink"
            placeholder="Диас"
          />
        </div>

        <div className="rise rise-2">
          <label className="text-[13px] font-bold text-ink-2">{tr('setup_age')} · {age}</label>
          <input type="range" min={16} max={70} value={age} onChange={(e) => setAge(+e.target.value)} className="mt-3 w-full" />
        </div>

        <div className="rise rise-2">
          <label className="text-[13px] font-bold text-ink-2">{tr('setup_city')}</label>
          <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar -mx-6 px-6">
            {CITIES.map((c) => (
              <Chip key={c} active={city === c} onClick={() => setCity(c)}>{c}</Chip>
            ))}
          </div>
        </div>

        <div className="rise rise-3">
          <label className="text-[13px] font-bold text-ink-2">
            {tr('setup_budget')} · <span className="text-lime-deep">{kzt(budget)}</span>
          </label>
          <input
            type="range" min={10_000} max={400_000} step={5_000}
            value={budget}
            onChange={(e) => setBudget(+e.target.value)}
            className="mt-3 w-full"
          />
          <div className="flex justify-between text-[11px] text-ink-3 mt-1.5 font-medium">
            <span>10 000 ₸</span><span>400 000 ₸</span>
          </div>
        </div>
      </div>

      <div className="flex-1" />
      <div className="pb-[max(env(safe-area-inset-bottom),24px)]">
        <Button disabled={!name.trim()} onClick={save}>{tr('continue')} →</Button>
      </div>
    </div>
  )
}
