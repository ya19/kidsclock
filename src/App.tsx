import { useEffect, useMemo, useState } from 'react'
import type { Plan, Prefs, WeekMap } from './types'
import { load, minutesNow, planForDay, pruneWeek, save, todayIndex } from './plans'
import { ColorFilters } from './ui'
import Editor from './Editor'
import Display from './Display'

export default function App() {
  const initial = useMemo(load, [])
  const [plans, setPlans] = useState<Plan[]>(initial.plans)
  const [selectedId, setSelectedId] = useState(initial.selectedId)
  const [prefs, setPrefsRaw] = useState<Prefs>(initial.prefs)
  const [week, setWeek] = useState<WeekMap>(initial.week)
  const [scrub, setScrub] = useState<number | null>(null)
  const [clock, setClock] = useState(() => minutesNow())

  const setPrefs = (p: Partial<Prefs>) => setPrefsRaw((prev) => ({ ...prev, ...p }))

  /* real clock, every 30 seconds */
  useEffect(() => {
    const id = window.setInterval(() => setClock(minutesNow()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => save({ plans, selectedId, prefs, week }), [plans, selectedId, prefs, week])

  const plan = plans.find((p) => p.id === selectedId) ?? plans[0]
  const now = scrub ?? clock

  // The kid screen follows the real weekday; `prefs.day` overrides it for previewing.
  // `clock` re-renders every 30s, so the day flips on its own at midnight.
  const day = prefs.day === 'today' ? todayIndex() : prefs.day
  const displayPlan = planForDay(plans, week, day, selectedId)

  // Deleting a plan must not leave a weekday pointing at it.
  const updatePlans = (next: Plan[]) => {
    setPlans(next)
    setWeek((w) => pruneWeek(w, next))
  }

  if (prefs.screen === 'display') {
    return (
      <>
        <ColorFilters />
        <Display
          plan={displayPlan} now={now} prefs={prefs} setPrefs={setPrefs}
          scrub={scrub} setScrub={setScrub} onExit={() => setPrefs({ screen: 'editor' })}
        />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <ColorFilters />
      <header className="flex items-center gap-3 border-b border-slate-800 px-4 py-2.5">
        <span className="text-sm font-semibold tracking-wide text-slate-200">Color Clock</span>
        <span className="text-xs text-slate-500">prototyping bench</span>
        <div className="ml-auto flex overflow-hidden rounded-lg border border-slate-700">
          <button
            className="bg-slate-700 px-3 py-1.5 text-sm text-white"
            onClick={() => setPrefs({ screen: 'editor' })}
          >
            Editor
          </button>
          <button
            className="px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
            onClick={() => setPrefs({ screen: 'display' })}
          >
            Display
          </button>
        </div>
      </header>

      <Editor
        plans={plans} setPlans={updatePlans} selectedId={plan.id} setSelectedId={setSelectedId}
        week={week} setWeek={setWeek}
        prefs={prefs} setPrefs={setPrefs} now={now} scrub={scrub} setScrub={setScrub}
      />
    </div>
  )
}
