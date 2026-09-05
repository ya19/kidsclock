import type { Block, DayIndex, Plan, Prefs, Segment, WeekMap } from './types'

export const DAY = 1440
export const STEP = 15
export const GAP_COLOR = '#2b303c'

export const PALETTE = [
  '#f43f5e', '#f97316', '#f59e0b', '#facc15',
  '#84cc16', '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899',
  '#e2e8f0', '#94a3b8', '#7c5c3e', '#0ea5e9',
]

export type Emoji = { ch: string; kw: string }

const group = (name: string, pairs: [string, string][]) => ({ name, items: pairs.map(([ch, kw]) => ({ ch, kw })) })

/**
 * A picker aimed at a child's day rather than the whole Unicode set: wide enough
 * that most activities have a fitting icon, small enough to scan. The keywords are
 * what the search box matches; the text input below it accepts anything else.
 */
export const EMOJI_GROUPS: { name: string; items: Emoji[] }[] = [
  group('Sleep & waking', [
    ['😴', 'sleep asleep nap'], ['💤', 'sleep nap zzz'], ['🌙', 'night bedtime moon'],
    ['⭐', 'night star'], ['🛏️', 'bed sleep'], ['🌅', 'morning wake sunrise'],
    ['☀️', 'morning day sun'], ['⏰', 'wake alarm time'], ['🥱', 'tired yawn sleepy'],
  ]),
  group('Wash & dress', [
    ['🪥', 'teeth brush tooth'], ['🛁', 'bath wash'], ['🚿', 'shower wash'],
    ['🧼', 'soap wash hands'], ['🧴', 'cream lotion sunscreen'], ['🚽', 'toilet potty'],
    ['👕', 'dress clothes shirt'], ['👗', 'dress clothes'], ['🧦', 'socks dress'],
    ['👟', 'shoes dress'], ['🧥', 'coat jacket outside'], ['🎒', 'bag school backpack'],
    ['💇', 'hair brush comb'], ['🧢', 'hat cap'],
  ]),
  group('Meals & snacks', [
    ['🥣', 'breakfast cereal porridge'], ['🥞', 'breakfast pancakes'], ['🍞', 'bread toast'],
    ['🧀', 'cheese snack'], ['🥪', 'sandwich lunch'], ['🍕', 'pizza lunch dinner'],
    ['🍝', 'pasta dinner'], ['🍲', 'soup dinner'], ['🥗', 'salad vegetables'],
    ['🍎', 'apple fruit snack'], ['🍌', 'banana fruit snack'], ['🍓', 'berries fruit'],
    ['🍇', 'grapes fruit'], ['🥕', 'carrot vegetable snack'], ['🥛', 'milk drink'],
    ['🧃', 'juice drink'], ['💧', 'water drink'], ['🍪', 'biscuit cookie treat'],
    ['🍦', 'ice cream treat'], ['🎂', 'cake birthday party'],
  ]),
  group('Kindergarten & learning', [
    ['🏫', 'school kindergarten nursery'], ['📚', 'books reading learning'], ['📖', 'story book reading'],
    ['✏️', 'writing pencil'], ['📝', 'homework writing'], ['🎨', 'painting art'],
    ['🖍️', 'drawing crayons colouring'], ['✂️', 'cutting craft'], ['🧩', 'puzzle'],
    ['🔤', 'letters abc reading'], ['🔢', 'numbers counting maths'], ['🧪', 'science experiment'],
    ['🗺️', 'map geography'], ['🎓', 'graduation school'], ['🧑‍🏫', 'teacher class'],
    ['🪁', 'kite outside play'], ['🔬', 'science looking'],
  ]),
  group('Play', [
    ['🧸', 'teddy toys play'], ['🧱', 'lego bricks blocks building'], ['🪀', 'toy play yoyo'],
    ['🎲', 'game dice play'], ['🃏', 'cards game'], ['🛝', 'slide playground'],
    ['🎠', 'carousel playground fair'], ['🏰', 'castle pretend play'], ['🚂', 'train toy'],
    ['🚗', 'car toy driving'], ['🚌', 'bus school ride'], ['✈️', 'plane travel'],
    ['🚀', 'rocket space play'], ['🦖', 'dinosaur play'], ['🪆', 'dolls play'],
    ['🎪', 'circus show outing'], ['🎯', 'target game'], ['🫧', 'bubbles play'],
  ]),
  group('Moving & sport', [
    ['⚽', 'football soccer ball sport'], ['🏀', 'basketball ball sport'], ['🎾', 'tennis ball'],
    ['🏓', 'ping pong table tennis'], ['🚲', 'bike cycling'], ['🛴', 'scooter'],
    ['🛹', 'skateboard'], ['🏊', 'swimming pool'], ['🤸', 'gymnastics tumbling exercise'],
    ['🕺', 'dance dancing'], ['🧘', 'yoga calm quiet'], ['🥋', 'karate judo class'],
    ['🤾', 'sport class'], ['🏃', 'running exercise'],
  ]),
  group('Outside', [
    ['🌳', 'park tree outside'], ['🌲', 'forest woods walk'], ['🏞️', 'park nature outside'],
    ['🌻', 'flowers garden'], ['🌷', 'flowers garden'], ['🪴', 'plants gardening'],
    ['🏖️', 'beach holiday'], ['🌊', 'sea water swimming'], ['⛰️', 'mountain hike'],
    ['🥾', 'walk hike'], ['🐝', 'bee nature'], ['🦋', 'butterfly nature'],
    ['🐞', 'ladybird nature'], ['☔', 'rain wet weather'], ['❄️', 'snow cold winter'],
    ['🌈', 'rainbow weather'],
  ]),
  group('Home & people', [
    ['🏠', 'home house'], ['🧹', 'tidy cleaning chores'], ['🧺', 'laundry washing chores'],
    ['🛒', 'shopping shop errands'], ['🧑‍🍳', 'cooking baking helping'], ['🍳', 'cooking breakfast'],
    ['👨‍👩‍👧', 'family together'], ['👵', 'grandma visit family'], ['👴', 'grandpa visit family'],
    ['🤗', 'hug cuddle'], ['👋', 'hello goodbye'], ['❤️', 'love favourite'],
    ['🐕', 'dog pet walk'], ['🐈', 'cat pet'], ['🐟', 'fish pet'], ['🐰', 'rabbit pet'],
  ]),
  group('Screen & music', [
    ['📺', 'tv screen cartoon'], ['🎬', 'film movie'], ['🎵', 'music song'],
    ['🎹', 'piano music lesson'], ['🥁', 'drums music'], ['🎸', 'guitar music'],
    ['🎤', 'singing music'], ['🎧', 'listening audio story'], ['📱', 'phone screen'],
  ]),
  group('Health & appointments', [
    ['🩺', 'doctor checkup'], ['🦷', 'dentist teeth'], ['💊', 'medicine'],
    ['😷', 'ill sick'], ['🏥', 'hospital clinic'], ['🩹', 'plaster hurt'],
  ]),
  group('Time & other', [
    ['⏳', 'waiting quiet time'], ['🕐', 'clock time'], ['📅', 'calendar plan'],
    ['🤫', 'quiet calm'], ['🎁', 'present party'],
    ['🎈', 'party balloon'], ['🚦', 'waiting travel'], ['🧳', 'packing trip'],
  ]),
]

/** Flat list, for anything that just needs the characters. */
export const EMOJI = EMOJI_GROUPS.flatMap((g) => g.items.map((i) => i.ch))

export const uid = () => Math.random().toString(36).slice(2, 9)

/* ---------- time helpers ---------- */

export const clampMin = (m: number) => Math.max(0, Math.min(DAY, Math.round(m)))
export const snap = (m: number) => clampMin(Math.round(m / STEP) * STEP)

export function fmt(m: number): string {
  const t = ((Math.round(m) % DAY) + DAY) % DAY
  const h = Math.floor(t / 60)
  const mm = t % 60
  if (Math.round(m) === DAY) return '24:00'
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export function minutesNow(d = new Date()): number {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60
}

/** Every 15-min option in the day, optionally including 24:00. */
export function timeOptions(includeEnd: boolean): number[] {
  const out: number[] = []
  for (let m = 0; m <= DAY; m += STEP) {
    if (m === DAY && !includeEnd) continue
    out.push(m)
  }
  return out
}

/* ---------- blocks ---------- */

export const sortBlocks = (bs: Block[]) => [...bs].sort((a, b) => a.start - b.start)

/** ids of blocks that overlap another block, or are otherwise invalid */
export function conflicts(blocks: Block[]): Set<string> {
  const bad = new Set<string>()
  for (const b of blocks) {
    if (!(b.start >= 0 && b.end <= DAY && b.start < b.end)) bad.add(b.id)
  }
  const s = sortBlocks(blocks)
  for (let i = 0; i < s.length - 1; i++) {
    if (s[i].end > s[i + 1].start) {
      bad.add(s[i].id)
      bad.add(s[i + 1].id)
    }
  }
  return bad
}

export const isValid = (blocks: Block[]) => conflicts(blocks).size === 0

/** Blocks plus the neutral gaps between them, covering 0..1440. */
export function segments(plan: Plan): Segment[] {
  const s = sortBlocks(plan.blocks)
  const out: Segment[] = []
  let cursor = 0
  s.forEach((b, i) => {
    if (b.start > cursor) out.push({ start: cursor, end: b.start, block: null, index: -1 })
    out.push({ start: b.start, end: b.end, block: b, index: i })
    cursor = Math.max(cursor, b.end)
  })
  if (cursor < DAY) out.push({ start: cursor, end: DAY, block: null, index: -1 })
  return out
}

export function blockAt(plan: Plan, now: number): Block | null {
  return sortBlocks(plan.blocks).find((b) => now >= b.start && now < b.end) ?? null
}

/** The next block today, wrapping around to tomorrow morning at the end of the day. */
export function nextBlock(plan: Plan, now: number): Block | null {
  const s = sortBlocks(plan.blocks)
  const later = s.find((b) => b.start > now)
  if (later) return later
  const first = s[0]
  return first && first !== blockAt(plan, now) ? first : null
}

/** First gap of at least `len` minutes, for "add block". */
export function firstGap(plan: Plan, len = 60): { start: number; end: number } | null {
  for (const seg of segments(plan)) {
    if (seg.block === null && seg.end - seg.start >= STEP) {
      return { start: seg.start, end: Math.min(seg.end, seg.start + len) }
    }
  }
  return null
}

/* ---------- seeds ---------- */

const B = (start: number, end: number, color: string, icon: string, label: string): Block =>
  ({ id: uid(), start, end, color, icon, label })

export function seedPlans(): Plan[] {
  return [
    {
      id: uid(),
      name: 'Weekday',
      blocks: [
        B(0, 420, '#6366f1', '😴', 'Sleep'),
        B(420, 450, '#f59e0b', '🌅', 'Wake up'),
        B(450, 480, '#facc15', '🥣', 'Breakfast'),
        B(480, 510, '#22c55e', '👕', 'Get dressed'),
        B(510, 540, '#06b6d4', '🚌', 'Ride to school'),
        B(540, 720, '#3b82f6', '🏫', 'School'),
        B(720, 780, '#f97316', '🍕', 'Lunch'),
        B(780, 930, '#3b82f6', '📚', 'School'),
        B(930, 1020, '#84cc16', '🛝', 'Playground'),
        B(1020, 1080, '#a855f7', '🎨', 'Quiet play'),
        B(1080, 1140, '#f43f5e', '🍎', 'Dinner'),
        B(1140, 1170, '#14b8a6', '🛁', 'Bath'),
        B(1170, 1200, '#ec4899', '📖', 'Story'),
        B(1200, 1440, '#6366f1', '🌙', 'Sleep'),
      ],
    },
    {
      id: uid(),
      name: 'Weekend',
      blocks: [
        B(0, 480, '#6366f1', '😴', 'Sleep'),
        B(480, 540, '#facc15', '🥣', 'Slow breakfast'),
        B(540, 660, '#84cc16', '🧸', 'Free play'),
        // deliberate 30-min gap here — uncovered time renders neutral grey
        B(690, 780, '#22c55e', '🌳', 'Park'),
        B(780, 840, '#f97316', '🥪', 'Lunch'),
        B(840, 960, '#a855f7', '💤', 'Rest / quiet'),
        B(960, 1080, '#06b6d4', '🚲', 'Bike ride'),
        B(1080, 1140, '#f43f5e', '🍕', 'Dinner'),
        B(1140, 1200, '#14b8a6', '🛁', 'Bath'),
        B(1200, 1230, '#ec4899', '📖', 'Story'),
        B(1230, 1440, '#6366f1', '🌙', 'Sleep'),
      ],
    },
    {
      id: uid(),
      name: 'Travel day',
      blocks: [
        B(0, 330, '#6366f1', '😴', 'Sleep'),
        B(330, 390, '#f59e0b', '🌅', 'Early wake up'),
        B(390, 420, '#facc15', '🥣', 'Breakfast'),
        B(420, 510, '#94a3b8', '🚗', 'Drive to airport'),
        B(510, 630, '#0ea5e9', '🎒', 'Airport wait'),
        B(630, 840, '#3b82f6', '✈️', 'Flight'),
        B(840, 900, '#f97316', '🥪', 'Snack'),
        B(900, 1020, '#94a3b8', '🚗', 'Drive to hotel'),
        B(1020, 1140, '#84cc16', '🏖️', 'Explore'),
        B(1140, 1200, '#f43f5e', '🍕', 'Dinner'),
        B(1200, 1260, '#14b8a6', '🛁', 'Bath'),
        B(1260, 1440, '#6366f1', '🌙', 'Sleep'),
      ],
    },
  ]
}

/* ---------- the week ---------- */

/** Monday-first for the UI; the index is Date.getDay(). */
export const WEEKDAYS: { i: DayIndex; short: string; long: string }[] = [
  { i: 1, short: 'Mon', long: 'Monday' },
  { i: 2, short: 'Tue', long: 'Tuesday' },
  { i: 3, short: 'Wed', long: 'Wednesday' },
  { i: 4, short: 'Thu', long: 'Thursday' },
  { i: 5, short: 'Fri', long: 'Friday' },
  { i: 6, short: 'Sat', long: 'Saturday' },
  { i: 0, short: 'Sun', long: 'Sunday' },
]

export const todayIndex = (d = new Date()) => d.getDay() as DayIndex

export function defaultWeek(plans: Plan[]): WeekMap {
  const byName = (n: string) => plans.find((p) => p.name === n)?.id ?? null
  const school = byName('Weekday')
  const home = byName('Weekend')
  return { 0: home, 1: school, 2: school, 3: school, 4: school, 5: school, 6: home }
}

/** The plan a given weekday should show, falling back to the edited plan. */
export function planForDay(plans: Plan[], week: WeekMap, day: DayIndex, fallbackId: string): Plan {
  const mapped = plans.find((p) => p.id === week[day])
  return mapped ?? plans.find((p) => p.id === fallbackId) ?? plans[0]
}

/** Drop assignments pointing at plans that no longer exist. */
export function pruneWeek(week: WeekMap, plans: Plan[]): WeekMap {
  const out: WeekMap = {}
  for (const { i } of WEEKDAYS) out[i] = plans.some((p) => p.id === week[i]) ? week[i] : null
  return out
}

/* ---------- persistence ---------- */

const KEY = 'kidsclock.v1'
/** Bumped when a default changes in a way stored settings would otherwise mask. */
const SCHEMA = 2

export type Saved = { plans: Plan[]; selectedId: string; prefs: Prefs; week: WeekMap; v?: number }

export const defaultPrefs: Prefs = {
  face: 'A',
  size: '336',
  colorblind: false,
  patterns: false,
  hours: false,
  dimPast: false,
  light: true,
  screen: 'editor',
  day: 'today',
}

function sane(p: unknown): p is Plan {
  const q = p as Plan
  return !!q && typeof q.name === 'string' && Array.isArray(q.blocks)
}

export function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Saved>
      const plans = (parsed.plans ?? []).filter(sane)
      if (plans.length) {
        const week = parsed.week ? pruneWeek(parsed.week, plans) : defaultWeek(plans)
        const prefs = { ...defaultPrefs, ...(parsed.prefs ?? {}) }
        // The light dial shipped defaulting to off, then became the default. A
        // browser that stored the old value keeps showing the dark dial forever,
        // so hand it the new default once. Toggling it back sticks from then on.
        if ((parsed.v ?? 1) < SCHEMA) prefs.light = defaultPrefs.light
        return {
          plans,
          selectedId: plans.some((p) => p.id === parsed.selectedId) ? parsed.selectedId! : plans[0].id,
          prefs,
          week,
        }
      }
    }
  } catch {
    /* fall through to seeds */
  }
  const plans = seedPlans()
  return { plans, selectedId: plans[0].id, prefs: defaultPrefs, week: defaultWeek(plans) }
}

export function save(s: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...s, v: SCHEMA }))
  } catch {
    /* quota / private mode — prototyping only, ignore */
  }
}

/* ---------- import / export ---------- */

export function planToJson(plan: Plan): string {
  return JSON.stringify(
    { name: plan.name, blocks: plan.blocks.map(({ id: _id, ...rest }) => rest) },
    null,
    2,
  )
}

/** Accepts { name, blocks } or a bare blocks array. Throws with a readable message. */
export function planFromJson(text: string): Plan {
  const data = JSON.parse(text)
  const rawBlocks = Array.isArray(data) ? data : data?.blocks
  if (!Array.isArray(rawBlocks)) throw new Error('Expected { name, blocks: [...] }')
  const blocks: Block[] = rawBlocks.map((b: Partial<Block>, i: number) => {
    const start = snap(Number(b.start))
    const end = snap(Number(b.end))
    if (!Number.isFinite(start) || !Number.isFinite(end)) throw new Error(`Block ${i + 1}: bad start/end`)
    return {
      id: uid(),
      start,
      end,
      color: typeof b.color === 'string' ? b.color : PALETTE[i % PALETTE.length],
      icon: typeof b.icon === 'string' && b.icon ? [...b.icon][0] : '⬜',
      label: typeof b.label === 'string' ? b.label : '',
    }
  })
  if (!isValid(blocks)) throw new Error('Blocks overlap or have invalid times')
  return { id: uid(), name: typeof data?.name === 'string' ? data.name : 'Imported plan', blocks: sortBlocks(blocks) }
}
