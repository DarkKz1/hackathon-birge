import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Button, EsimBadge } from '../components/ui'

const genEid = () => '89997 01' + String(Math.floor(Math.random() * 1e10)).padStart(10, '0').replace(/(\d{4})(?=\d)/g, '$1 ')

export default function Verify() {
  const nav = useNavigate()
  const { tr, setProfile } = useStore()
  const [phone, setPhone] = useState('+7 7')
  const [stage, setStage] = useState<'input' | 'checking' | 'ok'>('input')
  const [step, setStep] = useState(0)
  const eid = useRef(genEid())

  const phoneOk = phone.replace(/\D/g, '').length === 11

  useEffect(() => {
    if (stage !== 'checking') return
    const timers = [
      setTimeout(() => setStep(1), 900),
      setTimeout(() => setStep(2), 1900),
      setTimeout(() => setStep(3), 2800),
      setTimeout(() => {
        setProfile({ phone, esimId: eid.current, operator: 'KZ Mobile · eSIM' })
        setStage('ok')
      }, 3500),
    ]
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])

  const steps = [tr('verify_step1'), tr('verify_step2'), tr('verify_step3')]

  return (
    <div className="min-h-dvh bg-ink text-paper flex flex-col px-6">
      <div className="pt-[max(env(safe-area-inset-top),24px)]">
        <button onClick={() => nav(-1)} className="text-paper/50 text-[15px] py-2">← {tr('back')}</button>
      </div>

      <h1 className="font-display text-[26px] font-bold mt-6 rise">{tr('verify_title')}</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-paper/55 rise rise-1">{tr('verify_no_sms')}</p>

      {/* SIM chip visual */}
      <div className="mt-10 flex justify-center rise rise-2">
        <div className={`relative w-[120px] h-[150px] rounded-3xl border-2 overflow-hidden transition-colors duration-500 ${stage === 'ok' ? 'border-lime' : 'border-white/20'} ${stage === 'checking' ? 'pulse-ring' : ''}`}>
          <div className="absolute inset-4 rounded-2xl border border-white/15" />
          <svg viewBox="0 0 60 75" className="absolute inset-0 m-auto w-[60px]">
            <rect x="10" y="14" width="40" height="47" rx="8" fill="none" stroke={stage === 'ok' ? '#a3e635' : 'rgba(255,255,255,0.35)'} strokeWidth="2" />
            <path d="M10 30h40 M10 45h40 M30 14v47 M20 30v31 M40 30v31" stroke={stage === 'ok' ? '#a3e635' : 'rgba(255,255,255,0.25)'} strokeWidth="1.5" />
          </svg>
          {stage === 'checking' && (
            <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-transparent via-lime/40 to-transparent scanline" />
          )}
          {stage === 'ok' && (
            <div className="absolute inset-0 flex items-center justify-center bg-ink/70">
              <div className="pop w-12 h-12 rounded-full bg-lime flex items-center justify-center">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0d0f12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {stage === 'input' && (
        <div className="mt-10 rise rise-3">
          <label className="text-[13px] font-semibold text-paper/50">{tr('verify_phone_label')}</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-2 w-full bg-white/[0.07] border border-white/15 rounded-2xl px-5 py-4 text-[20px] font-bold tracking-wider outline-none focus:border-lime"
            placeholder="+7 7__ ___ __ __"
          />
        </div>
      )}

      {stage === 'checking' && (
        <div className="mt-10 space-y-3">
          {steps.map((s, i) => (
            <div key={i} className={`flex items-center gap-3 text-[14px] transition-opacity duration-300 ${step > i ? 'text-paper' : step === i ? 'text-paper/70' : 'opacity-25'}`}>
              {step > i ? (
                <span className="w-5 h-5 rounded-full bg-lime flex items-center justify-center shrink-0">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0d0f12" strokeWidth="3.5" strokeLinecap="round"><path d="M5 13l4 4L19 7" /></svg>
                </span>
              ) : (
                <span className={`w-5 h-5 rounded-full border-2 shrink-0 ${step === i ? 'border-lime border-t-transparent animate-spin' : 'border-white/20'}`} />
              )}
              {s}
            </div>
          ))}
        </div>
      )}

      {stage === 'ok' && (
        <div className="mt-8 rise text-center">
          <div className="flex justify-center"><EsimBadge /></div>
          <h2 className="font-display text-[20px] font-bold mt-4">{tr('verify_ok')}</h2>
          <div className="mt-4 mx-auto max-w-[300px] rounded-2xl bg-white/[0.06] border border-white/10 p-4 text-left">
            <div className="text-[11px] text-paper/40 font-semibold">eSIM ID (EID)</div>
            <div className="text-[14px] font-bold tracking-wider mt-0.5">{eid.current}</div>
            <div className="mt-2 text-[11px] text-paper/40 font-semibold">{tr('verify_device_bound')}</div>
            <div className="text-[13px] font-semibold mt-0.5 flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a3e635" strokeWidth="2"><rect x="6" y="2" width="12" height="20" rx="3" /><circle cx="12" cy="18" r="1" fill="#a3e635" /></svg>
              iPhone · {phone}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1" />

      <div className="pb-[max(env(safe-area-inset-bottom),24px)]">
        {stage === 'input' && (
          <Button variant="lime" disabled={!phoneOk} onClick={() => setStage('checking')}>
            {tr('verify_cta')}
          </Button>
        )}
        {stage === 'ok' && (
          <Button variant="lime" onClick={() => nav('/setup')}>
            {tr('continue')} →
          </Button>
        )}
      </div>
    </div>
  )
}
