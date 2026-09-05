import { useEffect, useState } from 'react'
import type { Plan, Prefs } from './types'
import { Controls, FaceStage } from './ui'

/**
 * The kid-facing screen: black, no chrome, no words.
 * Dev controls stay hidden until you tap the dot in the corner.
 */
export default function Display({
  plan, now, prefs, setPrefs, scrub, setScrub, onExit,
}: {
  plan: Plan
  now: number
  prefs: Prefs
  setPrefs: (p: Partial<Prefs>) => void
  scrub: number | null
  setScrub: (v: number | null) => void
  onExit: () => void
}) {
  const [panel, setPanel] = useState(false)
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') (panel ? setPanel(false) : onExit())
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [panel, onExit])

  return (
    <div className="fixed inset-0" style={{ background: prefs.light ? '#f3ede4' : '#000' }}>
      <FaceStage plan={plan} now={now} prefs={prefs} className="h-full w-full" />

      <button
        onClick={() => setPanel((v) => !v)}
        className={`absolute right-3 top-3 h-6 w-6 rounded-full ${prefs.light ? 'border border-black/15 text-black/25 hover:text-black/70' : 'border border-white/20 text-white/25 hover:text-white/80'}`}
        title="Show controls (Esc to leave)"
      >
        ·
      </button>

      {panel && (
        <div className="absolute inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 p-3 backdrop-blur">
          <div className="mb-2 flex items-center gap-3">
            <button className="rounded-md bg-slate-200 px-2.5 py-1.5 text-sm text-slate-800 hover:bg-slate-300" onClick={onExit}>
              ← Editor
            </button>
            <span className="text-xs text-slate-500">Esc closes this panel, then leaves the display</span>
          </div>
          <Controls prefs={prefs} setPrefs={setPrefs} scrub={scrub} setScrub={setScrub} now={now} showDay />
        </div>
      )}
    </div>
  )
}
