import { useEffect, useRef, useState } from 'react'
import type { Block, Plan, Prefs, WeekMap } from './types'
import {
  DAY, EMOJI_GROUPS, PALETTE, STEP, WEEKDAYS, conflicts, fmt, isValid, planFromJson, planToJson,
  firstGap, sortBlocks, timeOptions, todayIndex, uid,
} from './plans'
import { Controls, FaceStage, inputCls } from './ui'
import { loadApiKey, parseDayText, parseDayWithClaude, saveApiKey } from './dayText'

const btn = 'rounded-md bg-slate-200 px-2.5 py-1.5 text-sm text-slate-800 hover:bg-slate-300 active:bg-slate-400 disabled:opacity-40'
const btnGhost = 'rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-30'

function Popover({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div ref={ref} className="absolute left-0 top-full z-20 mt-1 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
      {children}
    </div>
  )
}

function TimeSelect({ value, onChange, includeEnd }: { value: number; onChange: (v: number) => void; includeEnd: boolean }) {
  return (
    <select className={`${inputCls} font-mono`} value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {timeOptions(includeEnd).map((m) => (
        <option key={m} value={m}>
          {fmt(m)}
        </option>
      ))}
    </select>
  )
}

/** Grouped, searchable icon set — with a free field for anything it does not carry. */
function IconPicker({ onPick }: { onPick: (ch: string) => void }) {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const groups = EMOJI_GROUPS.map((g) => ({
    name: g.name,
    items: needle ? g.items.filter((i) => i.kw.includes(needle) || i.ch === q.trim()) : g.items,
  })).filter((g) => g.items.length)

  return (
    <div className="w-[19rem]">
      <input
        autoFocus className={`${inputCls} mb-2 w-full`} value={q}
        placeholder="search — play, lunch, teeth, park…"
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="max-h-72 overflow-y-auto pr-1">
        {groups.map((g) => (
          <div key={g.name} className="mb-1">
            <div className="sticky top-0 bg-white py-1 text-[11px] font-medium text-slate-500">{g.name}</div>
            <div className="grid grid-cols-8 gap-0.5">
              {g.items.map((i) => (
                <button key={i.ch} title={i.kw} className="rounded p-1 text-xl hover:bg-slate-200" onClick={() => onPick(i.ch)}>
                  {i.ch}
                </button>
              ))}
            </div>
          </div>
        ))}
        {!groups.length && <div className="px-1 py-3 text-xs text-slate-500">Nothing matches — paste any emoji below.</div>}
      </div>
      <input
        className={`${inputCls} mt-2 w-full`} placeholder="or paste any emoji"
        onChange={(e) => { const ch = [...e.target.value][0]; if (ch) onPick(ch) }}
      />
    </div>
  )
}

function BlockRow({
  block, bad, first, last, onPatch, onDelete, onMove,
}: {
  block: Block
  bad: boolean
  first: boolean
  last: boolean
  onPatch: (p: Partial<Block>) => void
  onDelete: () => void
  onMove: (dir: -1 | 1) => void
}) {
  const [pick, setPick] = useState<'color' | 'icon' | null>(null)
  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-lg border p-2 transition-colors ${
        bad ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex flex-col">
        <button className={btnGhost} disabled={first} onClick={() => onMove(-1)} title="Move earlier">▲</button>
        <button className={btnGhost} disabled={last} onClick={() => onMove(1)} title="Move later">▼</button>
      </div>

      <TimeSelect value={block.start} onChange={(v) => onPatch({ start: v })} includeEnd={false} />
      <span className="text-slate-500">→</span>
      <TimeSelect value={block.end} onChange={(v) => onPatch({ end: v })} includeEnd />

      <div className="relative">
        <button
          className="h-8 w-8 rounded-md border border-slate-300"
          style={{ background: block.color }}
          onClick={() => setPick(pick === 'color' ? null : 'color')}
          title="Colour"
        />
        <Popover open={pick === 'color'} onClose={() => setPick(null)}>
          <div className="grid w-44 grid-cols-4 gap-1.5">
            {PALETTE.map((c) => (
              <button key={c} className="h-8 w-8 rounded-md border border-slate-300" style={{ background: c }}
                onClick={() => { onPatch({ color: c }); setPick(null) }} />
            ))}
          </div>
          <input type="color" value={block.color} onChange={(e) => onPatch({ color: e.target.value })}
            className="mt-2 h-7 w-full bg-transparent" />
        </Popover>
      </div>

      <div className="relative">
        <button className="h-8 w-9 rounded-md border border-slate-300 bg-slate-50 text-lg leading-none"
          onClick={() => setPick(pick === 'icon' ? null : 'icon')} title="Icon">
          {block.icon}
        </button>
        <Popover open={pick === 'icon'} onClose={() => setPick(null)}>
          <IconPicker onPick={(ch) => { onPatch({ icon: ch }); setPick(null) }} />
        </Popover>
      </div>

      <input className={`${inputCls} min-w-[8rem] flex-1`} value={block.label}
        placeholder="label (editor only)" onChange={(e) => onPatch({ label: e.target.value })} />

      <button className={`${btn} hover:bg-rose-500 hover:text-white`} onClick={onDelete} title="Delete block">✕</button>
    </div>
  )
}

/** Which plan each weekday shows on the kid screen. */
function WeekStrip({
  plans, week, setWeek, selectedId, onPick,
}: {
  plans: Plan[]
  week: WeekMap
  setWeek: (w: WeekMap) => void
  selectedId: string
  onPick: (id: string) => void
}) {
  const today = todayIndex()
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-sm font-medium text-slate-800">Week</span>
        <span className="text-xs text-slate-500">the display screen shows today&rsquo;s plan on its own</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {WEEKDAYS.map((d) => {
          const isToday = d.i === today
          const assigned = plans.find((p) => p.id === week[d.i])
          return (
            <div key={d.i} className={`rounded-lg border p-1.5 ${isToday ? 'border-sky-500 bg-sky-50' : 'border-slate-200'}`}>
              <div className="mb-1 flex items-center justify-between">
                <span className={`text-[11px] font-semibold ${isToday ? 'text-sky-700' : 'text-slate-500'}`}>{d.short}</span>
                {assigned && assigned.id !== selectedId && (
                  <button className={`${btnGhost} px-1 py-0`} title={`Edit ${assigned.name}`} onClick={() => onPick(assigned.id)}>edit</button>
                )}
              </div>
              <select
                className={`${inputCls} w-full px-1 text-[11px]`}
                value={week[d.i] ?? ''}
                onChange={(e) => setWeek({ ...week, [d.i]: e.target.value || null })}
              >
                <option value="">— none —</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Write the day in words; get blocks. Claude is optional and needs your own key. */
function DayWriter({ onPlan }: { onPlan: (name: string, blocks: Block[], notes: string[]) => void }) {
  const [text, setText] = useState('')
  const [key, setKey] = useState(loadApiKey)
  const [showKey, setShowKey] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const build = () => {
    setErr(null)
    const { blocks, notes } = parseDayText(text)
    if (!blocks.length) return setErr('No times found. Try lines like "7:00 wake up" or "9-12 school".')
    onPlan('Written day', blocks, notes)
  }

  const ask = async () => {
    setErr(null)
    setBusy(true)
    try {
      const { blocks, notes } = await parseDayWithClaude(text, key)
      onPlan('Written day', blocks, notes)
    } catch (e) {
      setErr((e as Error).message || 'Claude call failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-sm font-medium text-slate-800">Write the day</span>
        <span className="text-xs text-slate-500">one activity per line — it becomes a new plan</span>
      </div>
      <textarea
        className={`${inputCls} h-28 w-full`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'7:00 wake up\n7:30 breakfast\n9:00-12:00 school\n12 lunch\n13:00 nap\n18:00 dinner\n19:30 bath\n20:00 sleep'}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button className={`${btn} bg-sky-600 hover:bg-sky-500`} onClick={build} disabled={!text.trim()}>
          Build blocks
        </button>
        <button className={btn} onClick={ask} disabled={!text.trim() || !key || busy} title={key ? 'Send the text to Claude' : 'Add an API key first'}>
          {busy ? 'Asking Claude…' : 'Ask Claude'}
        </button>
        <button className={btnGhost} onClick={() => setShowKey((v) => !v)}>
          {key ? 'API key ✓' : 'add API key'}
        </button>
      </div>

      {showKey && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
          <p className="mb-2 text-xs text-slate-500">
            Your Anthropic key is kept in this browser only (localStorage). It is never committed, never
            sent anywhere but Anthropic, and anyone using this device can read it — so do not add it on
            the kid&rsquo;s tablet. &ldquo;Build blocks&rdquo; needs no key at all.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              type="password" className={`${inputCls} min-w-[16rem] flex-1 font-mono text-xs`}
              value={key} placeholder="sk-ant-..." onChange={(e) => setKey(e.target.value)}
            />
            <button className={btn} onClick={() => { saveApiKey(key); setShowKey(false) }}>Save</button>
            <button className={btn} onClick={() => { setKey(''); saveApiKey('') }}>Clear</button>
          </div>
        </div>
      )}

      {err && <div className="mt-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
    </div>
  )
}

export default function Editor({
  plans, setPlans, selectedId, setSelectedId, week, setWeek, prefs, setPrefs, now, scrub, setScrub,
}: {
  plans: Plan[]
  setPlans: (p: Plan[]) => void
  selectedId: string
  setSelectedId: (id: string) => void
  week: WeekMap
  setWeek: (w: WeekMap) => void
  prefs: Prefs
  setPrefs: (p: Partial<Prefs>) => void
  now: number
  scrub: number | null
  setScrub: (v: number | null) => void
}) {
  const plan = plans.find((p) => p.id === selectedId) ?? plans[0]
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [io, setIo] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const reject = (msg: string, id?: string) => {
    setError(msg)
    setFlash(id ?? null)
    window.setTimeout(() => { setError(null); setFlash(null) }, 2600)
  }

  const commit = (blocks: Block[], failMsg: string, id?: string) => {
    if (!isValid(blocks)) return reject(failMsg, id)
    setError(null)
    setPlans(plans.map((p) => (p.id === plan.id ? { ...p, blocks: sortBlocks(blocks) } : p)))
  }

  const patch = (id: string, p: Partial<Block>) => {
    const next = plan.blocks.map((b) => (b.id === id ? { ...b, ...p } : b))
    const b = next.find((x) => x.id === id)!
    if (b.start >= b.end) return reject(`${fmt(b.start)}–${fmt(b.end)} is not a valid range`, id)
    commit(next, 'That would overlap another block', id)
  }

  const addBlock = () => {
    const gap = firstGap(plan)
    if (!gap) return reject('No free time left in the day — delete or shrink a block first')
    const nb: Block = { id: uid(), ...gap, color: PALETTE[plan.blocks.length % PALETTE.length], icon: '🧩', label: 'New block' }
    commit([...plan.blocks, nb], 'No room for a new block')
  }

  /** Swap a block with its neighbour, keeping the pair's combined time span. */
  const move = (id: string, dir: -1 | 1) => {
    const s = sortBlocks(plan.blocks)
    const i = s.findIndex((b) => b.id === id)
    const j = i + dir
    if (j < 0 || j >= s.length) return
    const [a, b] = dir === 1 ? [s[i], s[j]] : [s[j], s[i]]
    const aDur = a.end - a.start
    const bDur = b.end - b.start
    const first = { ...b, start: a.start, end: a.start + bDur }
    const second = { ...a, start: b.end - aDur, end: b.end }
    commit(plan.blocks.map((x) => (x.id === a.id ? second : x.id === b.id ? first : x)), 'Cannot swap those blocks')
  }

  const setPlan = (p: Plan) => setPlans(plans.map((x) => (x.id === p.id ? p : x)))

  const newPlan = () => {
    const p: Plan = { id: uid(), name: `Plan ${plans.length + 1}`, blocks: [] }
    setPlans([...plans, p])
    setSelectedId(p.id)
  }
  const duplicate = () => {
    const p: Plan = { id: uid(), name: `${plan.name} copy`, blocks: plan.blocks.map((b) => ({ ...b, id: uid() })) }
    setPlans([...plans, p])
    setSelectedId(p.id)
  }
  const rename = () => {
    const name = window.prompt('Plan name', plan.name)
    if (name) setPlan({ ...plan, name })
  }
  const remove = () => {
    if (plans.length === 1) return reject('Keep at least one plan')
    if (!window.confirm(`Delete "${plan.name}"?`)) return
    const rest = plans.filter((p) => p.id !== plan.id)
    setPlans(rest)
    setSelectedId(rest[0].id)
  }

  /** A written day always lands in a new plan, so nothing you already have is lost. */
  const fromText = (name: string, blocks: Block[], notes: string[]) => {
    const p: Plan = { id: uid(), name, blocks }
    setPlans([...plans, p])
    setSelectedId(p.id)
    if (notes.length) reject(`Adjusted — ${notes.join(' · ')}`)
  }

  const exportJson = async () => {
    const text = planToJson(plan)
    setIo(text)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      reject('Clipboard blocked — copy from the box below')
    }
  }
  const importJson = () => {
    try {
      const p = planFromJson(io ?? '')
      setPlans([...plans, p])
      setSelectedId(p.id)
      setIo(null)
    } catch (e) {
      reject(`Import failed: ${(e as Error).message}`)
    }
  }

  const daysUsing = WEEKDAYS.filter((d) => week[d.i] === plan.id).map((d) => d.short)
  const bad = conflicts(plan.blocks)
  const covered = plan.blocks.reduce((n, b) => n + (b.end - b.start), 0)

  return (
    <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,42%)]">
      {/* ---------------- left: plan + blocks ---------------- */}
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
          <select className={inputCls} value={plan.id} onChange={(e) => setSelectedId(e.target.value)}>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {daysUsing.length > 0 && (
            <span className="text-xs text-slate-500">shows on {daysUsing.join(', ')}</span>
          )}
          <button className={btn} onClick={newPlan}>New</button>
          <button className={btn} onClick={duplicate}>Duplicate</button>
          <button className={btn} onClick={rename}>Rename</button>
          <button className={btn} onClick={remove}>Delete</button>
          <div className="ml-auto flex gap-2">
            <button className={btn} onClick={exportJson}>{copied ? 'Copied ✓' : 'Export JSON'}</button>
            <button className={btn} onClick={() => setIo(io === null || io.length > 0 ? '' : null)}>Import JSON</button>
          </div>
        </div>

        <WeekStrip plans={plans} week={week} setWeek={setWeek} selectedId={plan.id} onPick={setSelectedId} />

        <DayWriter onPlan={fromText} />

        {io !== null && (
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <textarea
              className={`${inputCls} h-40 w-full font-mono text-xs`} value={io}
              placeholder='{ "name": "My plan", "blocks": [ { "start": 420, "end": 480, "color": "#f59e0b", "icon": "🥣", "label": "Breakfast" } ] }'
              onChange={(e) => setIo(e.target.value)}
            />
            <div className="mt-2 flex gap-2">
              <button className={btn} onClick={importJson}>Import as new plan</button>
              <button className={btn} onClick={() => setIo(null)}>Close</button>
            </div>
          </div>
        )}

        {error && <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

        <div className="flex flex-col gap-2">
          {sortBlocks(plan.blocks).map((b, i, arr) => (
            <BlockRow
              key={b.id} block={b} bad={bad.has(b.id) || flash === b.id}
              first={i === 0} last={i === arr.length - 1}
              onPatch={(p) => patch(b.id, p)}
              onDelete={() => commit(plan.blocks.filter((x) => x.id !== b.id), 'Could not delete')}
              onMove={(d) => move(b.id, d)}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button className={`${btn} bg-sky-600 hover:bg-sky-500`} onClick={addBlock}>+ Add block</button>
          <span className="text-xs text-slate-500">
            {plan.blocks.length} blocks · {Math.round((covered / DAY) * 100)}% of the day covered ·
            {' '}uncovered time shows as grey · steps of {STEP} min
          </span>
        </div>
      </div>

      {/* ---------------- right: live preview ---------------- */}
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-slate-200 bg-[#f3ede4] p-3">
          <FaceStage plan={plan} now={now} prefs={prefs} labels className="h-[min(56vh,520px)] w-full" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <Controls prefs={prefs} setPrefs={setPrefs} scrub={scrub} setScrub={setScrub} now={now} />
        </div>
      </div>
    </div>
  )
}
