import { NavLink } from 'react-router-dom'
import { useStore } from '../lib/store'
import { fakeName, initials } from '../lib/format'

export function Logo({ dark = false, size = 'text-2xl' }: { dark?: boolean; size?: string }) {
  return (
    <span className={`font-display font-semibold tracking-tight ${size} ${dark ? 'text-paper' : 'text-ink'}`}>
      birge<span className="text-lime">·</span>
    </span>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  className = '',
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'lime' | 'ghost'
  disabled?: boolean
  className?: string
}) {
  const base =
    'w-full rounded-2xl py-4 px-6 font-bold text-[17px] transition-all active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100'
  const styles = {
    primary: 'bg-ink text-paper',
    lime: 'bg-lime text-ink',
    ghost: 'bg-transparent text-ink-2 border border-line',
  }
  return (
    <button className={`${base} ${styles[variant]} ${className}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

export function Chip({
  children,
  active,
  onClick,
  className = '',
}: {
  children: React.ReactNode
  active?: boolean
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-semibold transition-all active:scale-95 ${
        active ? 'bg-ink text-paper' : 'bg-card text-ink-2 border border-line'
      } ${className}`}
    >
      {children}
    </button>
  )
}

export function ProgressBar({ value, max, complete }: { value: number; max: number; complete?: boolean }) {
  const w = Math.min(100, (value / max) * 100)
  return (
    <div className="h-2 w-full rounded-full bg-line overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${complete ? 'bg-lime' : 'bg-ink'}`}
        style={{ width: `${w}%` }}
      />
    </div>
  )
}

const AVA_COLORS = ['#d9f99d', '#fde68a', '#fbcfe8', '#c7d2fe', '#a7f3d0', '#fecaca']

export function Avatars({ count, seed, you, youLabel = 'Вы' }: { count: number; seed: number; you?: boolean; youLabel?: string }) {
  const shown = Math.min(count, 5)
  return (
    <div className="flex items-center">
      {Array.from({ length: shown }).map((_, i) => (
        <div
          key={i}
          className="w-8 h-8 rounded-full border-2 border-card flex items-center justify-center text-[11px] font-bold text-ink -ml-2 first:ml-0"
          style={{ background: AVA_COLORS[(seed + i) % AVA_COLORS.length] }}
        >
          {you && i === shown - 1 ? youLabel : initials(fakeName(seed + i))}
        </div>
      ))}
      {count > shown && (
        <div className="w-8 h-8 rounded-full border-2 border-card bg-ink text-paper flex items-center justify-center text-[11px] font-bold -ml-2">
          +{count - shown}
        </div>
      )}
    </div>
  )
}

export function Toasts() {
  const { toasts } = useStore()
  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[min(400px,92vw)] space-y-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="rise bg-ink text-paper rounded-2xl px-4 py-3 text-[14px] font-semibold shadow-xl flex items-center gap-2"
        >
          {t.emoji && <span>{t.emoji}</span>}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  )
}

export function EsimBadge({ compact = false }: { compact?: boolean }) {
  const { tr } = useStore()
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-ink text-paper font-semibold ${
        compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-[12px]'
      }`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-lime">
        <path d="M12 2L4 6v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6l-8-4z" fill="currentColor" />
        <path d="M9 12l2 2 4-4" stroke="#0d0f12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {compact ? 'eSIM' : tr('esim_verified')}
    </span>
  )
}

const TABS = [
  {
    to: '/feed',
    label: ['Лента', 'Таспа'],
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.4 : 1.8}>
        <rect x="3" y="3" width="8" height="8" rx="2" />
        <rect x="13" y="3" width="8" height="8" rx="2" />
        <rect x="3" y="13" width="8" height="8" rx="2" />
        <rect x="13" y="13" width="8" height="8" rx="2" />
      </svg>
    ),
  },
  {
    to: '/groups',
    label: ['Группы', 'Топтар'],
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.4 : 1.8}>
        <circle cx="9" cy="8" r="3.5" />
        <circle cx="16.5" cy="9.5" r="2.5" />
        <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5" />
        <path d="M16 14.5c2.5.3 5 1.8 5 4.5" />
      </svg>
    ),
  },
  {
    to: '/profile',
    label: ['Профиль', 'Профиль'],
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.4 : 1.8}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" />
      </svg>
    ),
  },
]

export function BottomNav() {
  const { lang } = useStore()
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-card/90 backdrop-blur-lg border-t border-line z-40 pb-[max(env(safe-area-inset-bottom),8px)]">
      <div className="flex justify-around pt-2 pb-1">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-5 py-1 rounded-xl transition-colors ${
                isActive ? 'text-ink' : 'text-ink-3'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {tab.icon(isActive)}
                <span className={`text-[11px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {tab.label[lang === 'ru' ? 0 : 1]}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
