import { useEffect, useRef, useState } from 'react'
import type { DayIndex, Plan, Prefs, SizeKey } from './types'
import { FACES, Face } from './faces'
import { DAY, WEEKDAYS, fmt, todayIndex } from './plans'

/* ---------- shared bits ---------- */

export const SIZES: { key: SizeKey; label: string; px: number | null }[] = [
  { key: '240', label: '240 × 240 — round dev board', px: 240 },
  { key: '336', label: '336 × 336 — Fitbit Versa 3', px: 336 },
  { key: 'fill', label: 'Fullscreen tablet', px: null },
]

/** Deuteranopia simulation, rendered once and referenced by CSS filter. */
export function ColorFilters() {
  return (
    <svg width="0" height="0" aria-hidden style={{ position: 'absolute' }}>
      <filter id="cb-deuteranopia" colorInterpolationFilters="linearRGB">
        <feColorMatrix
          type="matrix"
          values="0.625 0.375 0 0 0
                  0.700 0.300 0 0 0
                  0.000 0.300 0.7 0 0
                  0 0 0 1 0"
        />
      </filter>
    </svg>
  )
}

function useBox() {
  const ref = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const read = () => setBox({ w: el.clientWidth, h: el.clientHeight })
    const ro = new ResizeObserver(read)
    ro.observe(el)
    read()
    return () => ro.disconnect()
  }, [])
  return [ref, box] as const
}

export type StageProps = {
  plan: Plan
  now: number
  prefs: Prefs
  /** show the A–F badge above each face (compare grid / editor preview only) */
  labels?: boolean
  className?: string
}

/** Renders the selected face — or all six side by side — at the chosen size. */
export function FaceStage({ plan, now, prefs, labels = false, className = '' }: StageProps) {
  const [ref, box] = useBox()
  const fixed = SIZES.find((s) => s.key === prefs.size)!.px
  const compare = prefs.face === 'compare'

  // A chosen watch size is honoured exactly (that is the point of it) — the
  // grid wraps and scrolls instead of shrinking. "Fullscreen" fits the box.
  let px: number
  if (fixed) {
    px = fixed
  } else if (compare) {
    const cols = box.w >= 940 ? 3 : 2
    const rows = Math.ceil(FACES.length / cols)
    const fitW = (box.w - (cols + 1) * 14) / cols
    const fitH = (box.h - (rows + 1) * (labels ? 34 : 16)) / rows
    px = Math.min(fitW, fitH)
  } else {
    px = Math.min(box.w, box.h) - 8
  }
  px = Math.round(Math.max(110, px))

  const style = prefs.colorblind ? { filter: 'url(#cb-deuteranopia)' } : undefined

  return (
    <div ref={ref} className={`flex items-center justify-center overflow-auto ${className}`}>
      {prefs.face === 'compare' ? (
        <div className="flex flex-wrap items-start justify-center gap-3.5">
          {FACES.map((f) => (
            <div key={f.key} className="flex flex-col items-center gap-1">
              <div className="overflow-hidden rounded-2xl" style={style}>
                <Face face={f.key} plan={plan} now={now} size={px} patterns={prefs.patterns} />
              </div>
              {labels && (
                <div className="text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-200">{f.key}</span> · {f.name}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl" style={style}>
          <Face face={prefs.face} plan={plan} now={now} size={px} patterns={prefs.patterns} />
        </div>
      )}
    </div>
  )
}

/* ---------- controls (shared by both screens) ---------- */

export const inputCls =
  'rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 outline-none focus:border-sky-500'

export function Toggle({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-slate-300">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-sky-500" />
      {children}
    </label>
  )
}

export function Controls({
  prefs, setPrefs, scrub, setScrub, now, showDay = false, compact = false,
}: {
  prefs: Prefs
  setPrefs: (p: Partial<Prefs>) => void
  scrub: number | null
  setScrub: (v: number | null) => void
  now: number
  /** offer the weekday override (the display follows the real weekday by default) */
  showDay?: boolean
  compact?: boolean
}) {
  const today = todayIndex()
  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-3 ${compact ? 'text-xs' : ''}`}>
      <label className="flex items-center gap-2 text-sm text-slate-300">
        Face
        <select className={inputCls} value={prefs.face} onChange={(e) => setPrefs({ face: e.target.value as Prefs['face'] })}>
          {FACES.map((f) => (
            <option key={f.key} value={f.key}>
              {f.key} — {f.name}
            </option>
          ))}
          <option value="compare">Compare all six</option>
        </select>
      </label>

      {showDay && (
        <label className="flex items-center gap-2 text-sm text-slate-300">
          Day
          <select
            className={inputCls}
            value={String(prefs.day)}
            onChange={(e) => setPrefs({ day: e.target.value === 'today' ? 'today' : (Number(e.target.value) as DayIndex) })}
          >
            <option value="today">Today ({WEEKDAYS.find((d) => d.i === today)!.short})</option>
            {WEEKDAYS.map((d) => (
              <option key={d.i} value={d.i}>
                {d.long}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex items-center gap-2 text-sm text-slate-300">
        Size
        <select className={inputCls} value={prefs.size} onChange={(e) => setPrefs({ size: e.target.value as SizeKey })}>
          {SIZES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex min-w-[260px] flex-1 items-center gap-3">
        <span className="text-sm text-slate-300">Time</span>
        <input
          type="range" min={0} max={DAY - 1} step={5}
          value={Math.floor(now)}
          onChange={(e) => setScrub(Number(e.target.value))}
          className="h-1.5 flex-1 accent-sky-500"
        />
        <span className="w-14 shrink-0 font-mono text-sm text-slate-100">{fmt(now)}</span>
        <button
          onClick={() => setScrub(null)}
          className={`whitespace-nowrap rounded-md px-2 py-1 text-xs ${scrub === null ? 'bg-emerald-600/20 text-emerald-300' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}
          title="Follow the real clock again"
        >
          {scrub === null ? '● live' : 'go live'}
        </button>
      </div>

      <Toggle on={prefs.colorblind} onChange={(v) => setPrefs({ colorblind: v })}>colorblind check</Toggle>
      <Toggle on={prefs.patterns} onChange={(v) => setPrefs({ patterns: v })}>patterns</Toggle>
    </div>
  )
}
