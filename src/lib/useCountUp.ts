import { useEffect, useRef, useState } from 'react'

// Плавная анимация числа при изменении значения (count-up). Уважает prefers-reduced-motion.
export function useCountUp(value: number, durationMs = 700): number {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const rafRef = useRef(0)

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const from = fromRef.current
    const to = value
    if (reduce || from === to) {
      setDisplay(to)
      fromRef.current = to
      return
    }
    let start = 0
    const ease = (t: number) => 1 - Math.pow(1 - t, 3) // easeOutCubic
    const tick = (ts: number) => {
      if (!start) start = ts
      const p = Math.min(1, (ts - start) / durationMs)
      setDisplay(Math.round(from + (to - from) * ease(p)))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = to
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, durationMs])

  return display
}
