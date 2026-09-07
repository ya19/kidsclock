import { useEffect, useMemo, useRef, useState } from 'react'
import type { Plan, Prefs, WeekMap } from './types'
import { load, minutesNow, planForDay, planFromLink, pruneWeek, save, todayIndex } from './plans'
import { ColorFilters } from './ui'
import { loadSync, pull, push } from './sync'
import type { SyncDoc } from './sync'
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
  const [syncState, setSyncState] = useState<{ at: number | null; error: string | null }>({ at: null, error: null })
  const stamp = useRef<number>(initial.updatedAt ?? 0)
  const pushing = useRef(false)

  const setPrefs = (p: Partial<Prefs>) => setPrefsRaw((prev) => ({ ...prev, ...p }))

  /* a shared link carries a plan in its fragment — take it, then clean the URL */
  const [shared, setShared] = useState<string | null>(null)
  useEffect(() => {
    const p = planFromLink(window.location.hash)
    if (!p) return
    setPlans((prev) => [...prev, p])
    setSelectedId(p.id)
    setShared(p.name)
    history.replaceState(null, '', window.location.pathname + window.location.search)
    const t = window.setTimeout(() => setShared(null), 6000)
    return () => window.clearTimeout(t)
  }, [])

  /* real clock, every 30 seconds */
  useEffect(() => {
    const id = window.setInterval(() => setClock(minutesNow()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => save({ plans, selectedId, prefs, week, updatedAt: stamp.current }),
    [plans, selectedId, prefs, week])

  /* ---- sync: one shared document, newest write wins ---- */

  const adopt = (doc: SyncDoc) => {
    stamp.current = doc.updatedAt
    setPlans(doc.plans)
    if (doc.week) setWeek(pruneWeek(doc.week, doc.plans))
    setSelectedId((id) => (doc.plans.some((p) => p.id === id) ? id : doc.plans[0].id))
    setSyncState({ at: Date.now(), error: null })
  }

  const fetchRemote = async () => {
    const cfg = loadSync()
    if (!cfg || pushing.current) return
    try {
      const doc = await pull(cfg)
      if (doc && doc.updatedAt > stamp.current) adopt(doc)
      else setSyncState((s) => ({ at: Date.now(), error: s.error && null }))
    } catch (e) {
      setSyncState({ at: null, error: (e as Error).message })
    }
  }

  // On open, and again whenever the tab comes back to the front.
  useEffect(() => {
    fetchRemote()
    const onFocus = () => document.visibilityState === 'visible' && fetchRemote()
    document.addEventListener('visibilitychange', onFocus)
    const id = window.setInterval(fetchRemote, 30_000)
    return () => {
      document.removeEventListener('visibilitychange', onFocus)
      window.clearInterval(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Local edits go up after a pause, so a burst of typing is one write. */
  const timer = useRef<number>(0)
  const sendUp = (next: Plan[], nextWeek: WeekMap) => {
    const cfg = loadSync()
    if (!cfg) return
    stamp.current = Date.now()
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(async () => {
      pushing.current = true
      try {
        await push(cfg, { plans: next, week: nextWeek, updatedAt: stamp.current })
        setSyncState({ at: Date.now(), error: null })
      } catch (e) {
        const theirs = (e as { theirs?: SyncDoc }).theirs
        if (theirs) adopt(theirs)
        else setSyncState({ at: null, error: (e as Error).message })
      } finally {
        pushing.current = false
      }
    }, 1200)
  }

  const plan = plans.find((p) => p.id === selectedId) ?? plans[0]
  const now = scrub ?? clock

  // The kid screen follows the real weekday; `prefs.day` overrides it for previewing.
  // `clock` re-renders every 30s, so the day flips on its own at midnight.
  const day = prefs.day === 'today' ? todayIndex() : prefs.day
  const displayPlan = planForDay(plans, week, day, selectedId)

  // Deleting a plan must not leave a weekday pointing at it.
  const updatePlans = (next: Plan[]) => {
    setPlans(next)
    setWeek((w) => {
      const pruned = pruneWeek(w, next)
      sendUp(next, pruned)
      return pruned
    })
  }

  const updateWeek = (w: WeekMap) => {
    setWeek(w)
    sendUp(plans, w)
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
    <div className="min-h-screen bg-[#faf8f5] text-slate-900">
      <ColorFilters />
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
        <span className="text-sm font-semibold tracking-wide text-slate-900">Color Clock</span>
        <span className="text-xs text-slate-500">prototyping bench</span>
        <div className="ml-auto flex overflow-hidden rounded-lg border border-slate-300">
          <button
            className="bg-slate-800 px-3 py-1.5 text-sm text-white"
            onClick={() => setPrefs({ screen: 'editor' })}
          >
            Editor
          </button>
          <button
            className="bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            onClick={() => setPrefs({ screen: 'display' })}
          >
            Display
          </button>
        </div>
      </header>

      {shared && (
        <div className="border-b border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          Added the shared plan “{shared}”. Assign it to the days you want in the Week strip below.
        </div>
      )}

      <Editor
        plans={plans} setPlans={updatePlans} selectedId={plan.id} setSelectedId={setSelectedId}
        week={week} setWeek={updateWeek}
        sync={syncState} onSyncNow={fetchRemote}
        prefs={prefs} setPrefs={setPrefs} now={now} scrub={scrub} setScrub={setScrub}
      />
    </div>
  )
}
