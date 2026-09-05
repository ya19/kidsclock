/** Minutes from midnight, 0..1440. 1440 is "end of day". */
export type Minutes = number

export type Block = {
  id: string
  start: Minutes
  end: Minutes
  /** hex, e.g. "#f59e0b" */
  color: string
  /** exactly one emoji character */
  icon: string
  /** parent-facing only — never rendered on the kid display */
  label: string
}

export type Plan = {
  id: string
  name: string
  blocks: Block[]
}

/** A slice of the day: either a block, or an uncovered gap (block === null). */
export type Segment = {
  start: Minutes
  end: Minutes
  block: Block | null
  /** index among real blocks (for per-block patterns); -1 for gaps */
  index: number
}

export type FaceKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'

export type FaceProps = {
  plan: Plan
  /** current time in minutes from midnight (may be fractional) */
  now: Minutes
  /** rendered edge length in CSS pixels */
  size: number
  /** overlay a distinct pattern per block (colorblind aid) */
  patterns: boolean
}

export type SizeKey = '240' | '336' | 'fill'

/** Weekday index as returned by Date.getDay() — 0 is Sunday. */
export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** Which plan each weekday uses. null = no plan assigned for that day. */
export type WeekMap = Record<number, string | null>

export type Prefs = {
  face: FaceKey | 'compare'
  size: SizeKey
  colorblind: boolean
  patterns: boolean
  screen: 'editor' | 'display'
  /** which day the display renders: the real weekday, or one you pick to preview */
  day: 'today' | DayIndex
}
