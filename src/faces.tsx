import { useId } from 'react'
import type { ReactElement } from 'react'
import type { FaceKey, FaceProps, Segment } from './types'
import { DAY, GAP_COLOR, blockAt, nextBlock, segments, sortBlocks } from './plans'

/* ------------------------------------------------------------------ *
 * Shared geometry. Every face draws into a 100x100 viewBox and is
 * scaled by width/height, so one face works at 240px or fullscreen.
 * ------------------------------------------------------------------ */

const TAU = Math.PI * 2
const C = 50
const EMOJI_FONT = "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif"
const SWEEP = 'transform 800ms cubic-bezier(.4,0,.2,1)'
const HALF = DAY / 2
/** Everything that is not a block colour, for the two face backgrounds. */
type Kit = {
  bg: string
  gap: string
  ink: string
  inkFaint: number
  spent: string
  /** done time recedes but stays readable — it is done, not gone */
  spentOpacity: number
}
const kit = (light: boolean): Kit =>
  light
    ? { bg: '#eef1f6', gap: '#d3d9e4', ink: '#0f172a', inkFaint: 0.5, spent: '#ffffff', spentOpacity: 0.5 }
    : { bg: '#0a0c11', gap: GAP_COLOR, ink: '#ffffff', inkFaint: 0.62, spent: '#05070b', spentOpacity: 0.52 }

const f = (n: number) => Number(n.toFixed(3))

/** Point on a circle. m=0 is at the top, time runs clockwise. */
function pol(r: number, m: number, period = DAY): [number, number] {
  const a = (m / period) * TAU - TAU / 4
  return [f(C + r * Math.cos(a)), f(C + r * Math.sin(a))]
}

/** Annular sector (donut slice) from m0 to m1. */
function ringPath(ri: number, ro: number, m0: number, m1: number, period = DAY): string {
  const span = (m1 - m0) / period
  if (span >= 0.9999) {
    return (
      `M ${C - ro} ${C} A ${ro} ${ro} 0 1 1 ${C + ro} ${C} A ${ro} ${ro} 0 1 1 ${C - ro} ${C} Z ` +
      `M ${C - ri} ${C} A ${ri} ${ri} 0 1 1 ${C + ri} ${C} A ${ri} ${ri} 0 1 1 ${C - ri} ${C} Z`
    )
  }
  const large = span > 0.5 ? 1 : 0
  const [x0o, y0o] = pol(ro, m0, period)
  const [x1o, y1o] = pol(ro, m1, period)
  const [x1i, y1i] = pol(ri, m1, period)
  const [x0i, y0i] = pol(ri, m0, period)
  return (
    `M ${x0o} ${y0o} A ${ro} ${ro} 0 ${large} 1 ${x1o} ${y1o} ` +
    `L ${x1i} ${y1i} A ${ri} ${ri} 0 ${large} 0 ${x0i} ${y0i} Z`
  )
}

/* ------------------------------------------------------------------ *
 * Per-block patterns (colorblind aid) + glow, scoped to each instance.
 * ------------------------------------------------------------------ */

const PATTERN_COUNT = 6

function patternBody(i: number) {
  const s = { stroke: '#fff', strokeWidth: 0.9, fill: 'none' }
  switch (i) {
    case 0: return <circle cx="2.5" cy="2.5" r="1.05" fill="#fff" />
    case 1: return <path d="M-1 6 L6 -1 M1 8 L8 1" {...s} />
    case 2: return <path d="M-1 -1 L6 6 M-1 4 L1 6 M4 -1 L6 1" {...s} />
    case 3: return <path d="M-1 2.5 L6 2.5" {...s} />
    case 4: return <path d="M2.5 -1 L2.5 6" {...s} />
    default: return <path d="M-1 2.5 L6 2.5 M2.5 -1 L2.5 6" {...s} />
  }
}

function useGfx(patterns: boolean) {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, '')
  const pat = (i: number) => `url(#${raw}p${((i % PATTERN_COUNT) + PATTERN_COUNT) % PATTERN_COUNT})`
  const glow = `url(#${raw}glow)`
  const defs = (
    <defs>
      <filter id={`${raw}glow`} x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="2.4" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      {patterns &&
        Array.from({ length: PATTERN_COUNT }, (_, i) => (
          <pattern key={i} id={`${raw}p${i}`} patternUnits="userSpaceOnUse" width="5" height="5">
            {patternBody(i)}
          </pattern>
        ))}
    </defs>
  )
  return { pat, glow, defs }
}

/** A block shape: flat color, plus an optional distinct pattern on top. */
function Shape({
  d, rect, color, index, patterns, pat, opacity = 1,
}: {
  d?: string
  rect?: { x: number; y: number; w: number; h: number; rx?: number }
  color: string
  index: number
  patterns: boolean
  pat: (i: number) => string
  opacity?: number
}) {
  const draw = (fill: string, o: number) =>
    d ? (
      <path d={d} fill={fill} fillRule="evenodd" opacity={o} />
    ) : (
      <rect x={rect!.x} y={rect!.y} width={rect!.w} height={rect!.h} rx={rect!.rx ?? 0} fill={fill} opacity={o} />
    )
  return (
    <>
      {draw(color, opacity)}
      {patterns && index >= 0 && draw(pat(index), 0.4 * opacity)}
    </>
  )
}

function Emo({ x, y, size, ch }: { x: number; y: number; size: number; ch: string }) {
  if (size < 2.6) return null
  return (
    <text
      x={x} y={y} fontSize={f(size)} textAnchor="middle" dominantBaseline="central"
      fontFamily={EMOJI_FONT} style={{ userSelect: 'none' }}
    >
      {ch}
    </text>
  )
}

/** An hour number on a dial. Text on the face is opt-in (the `hours` toggle). */
function HourNum({ x, y, size = 6, k, children }: { x: number; y: number; size?: number; k: Kit; children: number }) {
  return (
    <text
      x={x} y={y} fontSize={f(size)} textAnchor="middle" dominantBaseline="central"
      fill={k.ink} fillOpacity={k.inkFaint} fontFamily="ui-sans-serif, system-ui, sans-serif"
      style={{ userSelect: 'none' }}
    >
      {children}
    </text>
  )
}

/** Hour numbers spaced around a circular dial of `period` minutes. */
function DialHours({ r, hours, offset = 0, period = DAY, size = 6, k }: {
  r: number
  hours: number[]
  offset?: number
  period?: number
  size?: number
  k: Kit
}) {
  return (
    <g>
      {hours.map((h) => {
        const [x, y] = pol(r, h * 60 - offset, period)
        return <HourNum key={h} x={x} y={y} size={size} k={k}>{h}</HourNum>
      })}
    </g>
  )
}

const Bg = ({ k, rx = 0 }: { k: Kit; rx?: number }) => <rect x="0" y="0" width="100" height="100" rx={rx} fill={k.bg} />

/** Arc-length-aware emoji size so icons never spill out of a thin slice. */
function arcEmoji(dur: number, radius: number, band: number, period = DAY) {
  const chord = (dur / period) * TAU * radius
  return Math.min(band * 0.72, chord * 0.72, 12)
}

function Ticks({ ri, ro, k, count = 24 }: { ri: number; ro: number; k: Kit; count?: number }) {
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const major = i % 6 === 0
        const [x1, y1] = pol(ri, (i / count) * DAY)
        const [x2, y2] = pol(ro, (i / count) * DAY)
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={k.ink} strokeOpacity={major ? 0.5 : 0.18} strokeWidth={major ? 0.9 : 0.5} strokeLinecap="round" />
        )
      })}
    </g>
  )
}

function Hand({ now, r0, r1, k, period = DAY }: { now: number; r0: number; r1: number; k: Kit; period?: number }) {
  const deg = ((now % period) / period) * 360
  return (
    <g style={{ transform: `rotate(${f(deg)}deg)`, transformOrigin: '50px 50px', transformBox: 'view-box', transition: SWEEP }}>
      <line x1={C} y1={C - r0} x2={C} y2={C - r1} stroke={k.bg} strokeWidth="3.2" strokeLinecap="round" opacity="0.85" />
      <line x1={C} y1={C - r0} x2={C} y2={C - r1} stroke={k.ink} strokeWidth="1.6" strokeLinecap="round" />
    </g>
  )
}

/* ------------------------------------------------------------------ *
 * A / D / G — one 24h ring, three treatments
 *
 * `offset` is the minute placed at the top of the dial: 0 puts midnight
 * up (A, D), 720 puts noon up (G), which drops the whole waking day into
 * the top half of the face.
 * ------------------------------------------------------------------ */

function RingFace({
  plan, now, size, patterns, hours, dimPast, light, ri: riBase, ro: roBase, offset = 0, ticks = false, dimElapsed = false,
}: FaceProps & {
  ri: number
  ro: number
  offset?: number
  ticks?: boolean
  dimElapsed?: boolean
}) {
  const { pat, defs } = useGfx(patterns)
  const k = kit(light)
  // Hour numbers live outside the ring, so the ring gives up room for them.
  const scale = hours ? 0.86 : 1
  const ri = riBase * scale
  const ro = roBase * scale
  const rm = (ri + ro) / 2
  const turned = (m: number) => m - offset

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img">
      {defs}
      <Bg k={k} />
      {segments(plan).map((s: Segment, i) => {
        const mid = (s.start + s.end) / 2
        const [ex, ey] = pol(rm, turned(mid))
        return (
          <g key={i}>
            <Shape d={ringPath(ri, ro, turned(s.start), turned(s.end))} color={s.block?.color ?? k.gap}
              index={s.index} patterns={patterns} pat={pat} />
            {s.block && <Emo x={ex} y={ey} size={arcEmoji(s.end - s.start, rm, ro - ri)} ch={s.block.icon} />}
          </g>
        )
      })}
      {(dimElapsed || dimPast) && now > 0.5 && (
        <path d={ringPath(ri, ro, turned(0), turned(Math.min(now, DAY - 0.01)))}
          fill={k.spent} opacity={k.spentOpacity} />
      )}
      {ticks && <Ticks ri={ro + 1} ro={ro + 3.4} k={k} />}
      {hours && <DialHours r={ro + 5.6} hours={[0, 6, 12, 18]} offset={offset} size={5.4} k={k} />}
      <Hand now={(now - offset + DAY) % DAY} r0={-2} r1={ri - 1.5} k={k} />
      <circle cx={C} cy={C} r="2.6" fill={k.ink} />
    </svg>
  )
}

/** A — midnight at the top, one lap per day. */
export function FaceA(p: FaceProps) {
  return <RingFace {...p} ri={29} ro={46} ticks />
}

/** D — same dial, with everything already spent shaded back without the toggle. */
export function FaceD(p: FaceProps) {
  return <RingFace {...p} ri={26} ro={47} dimElapsed />
}

/** G — noon at the top, so the waking day sits across the top half. */
export function FaceG(p: FaceProps) {
  return <RingFace {...p} ri={29} ro={46} offset={HALF} ticks />
}

/* ------------------------------------------------------------------ *
 * B — 12h double ring (inner 00-12, outer 12-24)
 * ------------------------------------------------------------------ */

export function FaceB({ plan, now, size, patterns, hours, dimPast, light }: FaceProps) {
  const { pat, defs } = useGfx(patterns)
  const k = kit(light)
  const rings = hours
    ? [{ ri: 17, ro: 26 }, { ri: 30, ro: 40 }]
    : [{ ri: 19, ro: 30 }, { ri: 34, ro: 46 }]
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img">
      {defs}
      <Bg k={k} />
      {rings.map((ring, r) => {
        const lo = r * HALF, hi = lo + HALF
        const rm = (ring.ri + ring.ro) / 2
        return (
          <g key={r}>
            {segments(plan)
              .map((s) => ({ ...s, start: Math.max(s.start, lo), end: Math.min(s.end, hi) }))
              .filter((s) => s.end > s.start)
              .map((s, i) => {
                const mid = (s.start + s.end) / 2 - lo
                const [ex, ey] = pol(rm, mid, HALF)
                return (
                  <g key={i}>
                    <Shape d={ringPath(ring.ri, ring.ro, s.start - lo, s.end - lo, HALF)}
                      color={s.block?.color ?? k.gap} index={s.index} patterns={patterns} pat={pat} />
                    {s.block && (
                      <Emo x={ex} y={ey} size={arcEmoji(s.end - s.start, rm, ring.ro - ring.ri, HALF)} ch={s.block.icon} />
                    )}
                  </g>
                )
              })}
            {dimPast && now > lo + 0.5 && (
              <path d={ringPath(ring.ri, ring.ro, 0, Math.min(now, hi - 0.01) - lo, HALF)}
                fill={k.spent} opacity={k.spentOpacity} />
            )}
          </g>
        )
      })}
      {hours && (
        <>
          {/* inner ring reads like a wall clock, so it gets 0/3/6/9 in the hole */}
          <DialHours r={11} hours={[0, 3, 6, 9]} period={HALF} size={4.6} k={k} />
          <DialHours r={44.6} hours={[12, 15, 18, 21]} period={HALF} offset={HALF} size={5.2} k={k} />
        </>
      )}

      {/* the hand only covers the ring for the current half of the day */}
      <Hand now={now} period={HALF} k={k}
        r0={now < HALF ? rings[0].ri - 2.5 : rings[1].ri - 2.5}
        r1={now < HALF ? rings[0].ro + 2.5 : rings[1].ro + 2.5} />
      <circle cx={C} cy={C} r="2.2" fill={k.ink} opacity="0.9" />
    </svg>
  )
}

/* ------------------------------------------------------------------ *
 * C — vertical timeline, morning at the top
 * ------------------------------------------------------------------ */

export function FaceC({ plan, now, size, patterns, hours, dimPast, light }: FaceProps) {
  const { pat, defs } = useGfx(patterns)
  const k = kit(light)
  const x = hours ? 28 : 18
  const w = hours ? 54 : 64
  const y0 = 6, y1 = 94
  const raw = useId().replace(/[^a-zA-Z0-9]/g, '')
  const y = (m: number) => y0 + (m / DAY) * (y1 - y0)
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img">
      {defs}
      <Bg k={k} />
      <clipPath id={`${raw}clip`}>
        <rect x={x} y={y0} width={w} height={y1 - y0} rx="7" />
      </clipPath>
      <g clipPath={`url(#${raw}clip)`}>
        {segments(plan).map((s, i) => {
          const h = y(s.end) - y(s.start)
          return (
            <g key={i}>
              <Shape rect={{ x, y: y(s.start), w, h }} color={s.block?.color ?? k.gap}
                index={s.index} patterns={patterns} pat={pat} />
              {s.block && <Emo x={x + w / 2} y={y(s.start) + h / 2} size={Math.min(h * 0.7, w * 0.55, 22)} ch={s.block.icon} />}
            </g>
          )
        })}
        {dimPast && now > 0.5 && (
          <rect x={x} y={y0} width={w} height={f(y(now) - y0)} fill={k.spent} opacity={k.spentOpacity} />
        )}
      </g>
      {hours && (
        <g>
          {[0, 6, 12, 18, 24].map((h) => (
            <HourNum key={h} x={x - 13} y={y(h * 60)} size={5.6} k={k}>{h}</HourNum>
          ))}
        </g>
      )}

      <g style={{ transform: `translateY(${f(y(now))}px)`, transformOrigin: '0 0', transformBox: 'view-box', transition: SWEEP }}>
        <line x1={x - 7} y1="0" x2={x + w + 7} y2="0" stroke={k.bg} strokeWidth="3" />
        <line x1={x - 7} y1="0" x2={x + w + 7} y2="0" stroke={k.ink} strokeWidth="1.3" />
        <path d={`M ${x - 7} -2.6 L ${x - 2.6} 0 L ${x - 7} 2.6 Z`} fill={k.ink} />
        <path d={`M ${x + w + 7} -2.6 L ${x + w + 2.6} 0 L ${x + w + 7} 2.6 Z`} fill={k.ink} />
      </g>
    </svg>
  )
}

/* ------------------------------------------------------------------ *
 * E — focus card: now fills the screen, next is a chip
 * ------------------------------------------------------------------ */

export function FaceE({ plan, now, size, patterns, light }: FaceProps) {
  const { pat, defs } = useGfx(patterns)
  const k = kit(light)
  const cur = blockAt(plan, now)
  const next = nextBlock(plan, now)
  const span = cur ? { start: cur.start, end: cur.end } : { start: lastEnd(plan, now), end: next?.start ?? DAY }
  const total = Math.max(1, span.end - span.start)
  const left = Math.max(0, Math.min(1, (span.end - now) / total))
  const idx = cur ? sortBlocks(plan.blocks).indexOf(cur) : -1
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img">
      {defs}
      <Bg k={k} />
      <Shape rect={{ x: 0, y: 0, w: 100, h: 100 }} color={cur?.color ?? k.gap}
        index={idx} patterns={patterns} pat={pat} />
      {cur && <Emo x={50} y={42} size={36} ch={cur.icon} />}
      {/* how much of the current block is left */}
      <g transform="rotate(-90 50 76)">
        <circle cx="50" cy="76" r="7.5" fill="none" stroke="#000" strokeOpacity="0.3" strokeWidth="2.8" />
        <circle cx="50" cy="76" r="7.5" fill="none" stroke={cur ? '#fff' : k.ink} strokeOpacity="0.95" strokeWidth="2.8"
          strokeLinecap="round" pathLength={1} strokeDasharray={`${f(left)} 1`}
          style={{ transition: 'stroke-dasharray 800ms linear' }} />
      </g>
      {next && (
        <g>
          <rect x="30" y="86" width="40" height="12" rx="6" fill="#000" fillOpacity="0.3" />
          <path d="M37 89 L41 92 L37 95 Z" fill={cur ? '#fff' : k.ink} fillOpacity="0.8" />
          <circle cx="47.5" cy="92" r="3" fill={next.color} />
          <Emo x={58} y={92} size={8} ch={next.icon} />
        </g>
      )}
    </svg>
  )
}

function lastEnd(plan: FaceProps['plan'], now: number) {
  const before = sortBlocks(plan.blocks).filter((b) => b.end <= now)
  return before.length ? before[before.length - 1].end : 0
}

/* ------------------------------------------------------------------ *
 * F — bead row: one dot per block, now is the big one
 * ------------------------------------------------------------------ */

export function FaceF({ plan, now, size, patterns, dimPast, light }: FaceProps) {
  const { pat, glow, defs } = useGfx(patterns)
  const k = kit(light)
  const blocks = sortBlocks(plan.blocks)
  const n = Math.max(1, blocks.length)
  const cols = Math.min(n, Math.max(1, Math.ceil(Math.sqrt(n * 1.7))))
  const rows = Math.ceil(n / cols)
  const cw = 100 / cols
  const rh = Math.min(100 / rows, 34)
  const top = C - ((rows - 1) * rh) / 2
  const col = (i: number) => i % cols
  const row = (i: number) => Math.floor(i / cols)
  const pos = (i: number) => [f(cw * (col(i) + 0.5)), f(top + rh * row(i))] as const
  const r = Math.min(cw * 0.36, rh * 0.36, 15)

  const curIdx = blocks.findIndex((b) => now >= b.start && now < b.end)
  const nextIdx = blocks.findIndex((b) => b.start > now)
  const pip = (): readonly [number, number] => {
    if (curIdx >= 0) return pos(curIdx)
    if (nextIdx < 0) return pos(n - 1)
    if (nextIdx === 0) return pos(0)
    const prev = blocks[nextIdx - 1]
    const nx = blocks[nextIdx]
    const a = pos(nextIdx - 1)
    const b = pos(nextIdx)
    if (row(nextIdx - 1) !== row(nextIdx)) return b
    const t = (now - prev.end) / Math.max(1, nx.start - prev.end)
    return [f(a[0] + t * (b[0] - a[0])), a[1]] as const
  }
  const [px, py] = pip()

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img">
      {defs}
      <Bg k={k} />
      {Array.from({ length: rows }, (_, rw) => {
        const firstI = rw * cols
        const lastI = Math.min(n - 1, firstI + cols - 1)
        return (
          <line key={rw} x1={pos(firstI)[0]} y1={pos(firstI)[1]} x2={pos(lastI)[0]} y2={pos(lastI)[1]}
            stroke={k.ink} strokeOpacity="0.16" strokeWidth="1.2" strokeLinecap="round" />
        )
      })}
      {blocks.map((b, i) => {
        const isNow = i === curIdx
        const rr = isNow ? r * 1.55 : r
        const dim = isNow ? 1 : now >= b.end ? (dimPast ? 0.3 : 0.55) : 0.85
        const [x, y] = pos(i)
        return (
          <g key={b.id} filter={isNow ? glow : undefined}>
            <circle cx={x} cy={y} r={f(rr)} fill={b.color} opacity={dim} />
            {patterns && <circle cx={x} cy={y} r={f(rr)} fill={pat(i)} opacity={0.4 * dim} />}
            {isNow && <circle cx={x} cy={y} r={f(rr)} fill="none" stroke={k.ink} strokeWidth="1.2" strokeOpacity="0.95" />}
            <g opacity={dim}>
              <Emo x={x} y={y} size={rr * 1.2} ch={b.icon} />
            </g>
          </g>
        )
      })}
      <g style={{ transform: `translate(${px}px, ${py}px)`, transformOrigin: '0 0', transformBox: 'view-box', transition: SWEEP }}>
        <path d={`M 0 ${f(r * 1.55 + 1.6)} l -2.4 4 l 4.8 0 Z`} fill={k.ink} opacity="0.9" />
      </g>
    </svg>
  )
}

/* ------------------------------------------------------------------ *
 * Registry — add a variant here and it shows up everywhere.
 * ------------------------------------------------------------------ */

export type FaceEntry = { key: FaceKey; name: string; Comp: (p: FaceProps) => ReactElement }

export const FACES: FaceEntry[] = [
  { key: 'A', name: '24h ring', Comp: FaceA },
  { key: 'B', name: '12h double ring', Comp: FaceB },
  { key: 'C', name: 'Vertical timeline', Comp: FaceC },
  { key: 'D', name: 'Depleting ring', Comp: FaceD },
  { key: 'E', name: 'Focus card', Comp: FaceE },
  { key: 'F', name: 'Bead row', Comp: FaceF },
  { key: 'G', name: '24h ring, noon up', Comp: FaceG },
]

export function Face({ face, ...props }: FaceProps & { face: FaceKey }) {
  const entry = FACES.find((x) => x.key === face) ?? FACES[0]
  const Comp = entry.Comp
  return <Comp {...props} />
}
