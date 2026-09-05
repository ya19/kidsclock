import type { Block } from './types'
import { DAY, PALETTE, snap, sortBlocks, uid } from './plans'

/**
 * Turn a written day into blocks.
 *
 * Two paths, same output: a local parser that needs no key and no network,
 * and an optional Claude call for prose the parser cannot read. Whatever
 * comes back is snapped, de-overlapped and clamped here — the model is never
 * trusted to produce a valid plan on its own.
 */

export type Draft = { start: number; end?: number; label: string; icon?: string; color?: string }
export type Parsed = { blocks: Block[]; notes: string[] }

/* ---------- keyword → icon + colour ---------- */

const LOOKUP: [RegExp, string, string][] = [
  [/\b(sleep|bed ?time|bedtime|night|asleep)\b/i, '😴', '#6366f1'],
  [/\b(nap|rest|quiet time)\b/i, '💤', '#a855f7'],
  [/\b(wake|get up|morning)\b/i, '🌅', '#f59e0b'],
  [/\b(breakfast|cereal)\b/i, '🥣', '#facc15'],
  [/\b(lunch)\b/i, '🍕', '#f97316'],
  [/\b(dinner|supper)\b/i, '🍎', '#f43f5e'],
  [/\b(snack|fruit)\b/i, '🍎', '#f43f5e'],
  [/\b(brush|teeth|tooth)\b/i, '🪥', '#06b6d4'],
  [/\b(bath|shower|wash)\b/i, '🛁', '#14b8a6'],
  [/\b(dress|clothes|get ready)\b/i, '👕', '#22c55e'],
  [/\b(school|kindergarten|nursery|class|lesson)\b/i, '🏫', '#3b82f6'],
  [/\b(homework|study|read(ing)?|book)\b/i, '📚', '#3b82f6'],
  [/\b(story|bedtime story)\b/i, '📖', '#ec4899'],
  [/\b(bus|drive|car|ride|travel|trip)\b/i, '🚌', '#06b6d4'],
  [/\b(bike|scooter|cycl)/i, '🚲', '#06b6d4'],
  [/\b(park|outside|outdoor|garden|walk)\b/i, '🌳', '#22c55e'],
  [/\b(playground|slide|swing)\b/i, '🛝', '#84cc16'],
  [/\b(play|toys?|lego|game)\b/i, '🧸', '#84cc16'],
  [/\b(draw|paint|art|craft|colou?r)\b/i, '🎨', '#a855f7'],
  [/\b(music|sing|piano|dance)\b/i, '🎵', '#a855f7'],
  [/\b(ball|football|soccer|sport|swim|gym)\b/i, '⚽', '#84cc16'],
  [/\b(tv|screen|movie|film|cartoon)\b/i, '🎬', '#94a3b8'],
  [/\b(tidy|clean|chore|help)\b/i, '🧹', '#94a3b8'],
  [/\b(dog|cat|pet|animal)\b/i, '🐕', '#7c5c3e'],
  [/\b(doctor|dentist|appointment)\b/i, '🧩', '#94a3b8'],
]

function decorate(label: string, i: number): { icon: string; color: string } {
  for (const [re, icon, color] of LOOKUP) if (re.test(label)) return { icon, color }
  return { icon: '🧩', color: PALETTE[i % PALETTE.length] }
}

/* ---------- local parser ---------- */

const T = String.raw`(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?`
const DASH = String.raw`\s*(?:-|–|—|to|until|till)\s*`
const RANGE_FIRST = new RegExp(String.raw`^\s*${T}${DASH}${T}\s*[-–:.]?\s*(.+)$`, 'i')
const RANGE_LAST = new RegExp(String.raw`^\s*(.+?)[\s,:]+${T}${DASH}${T}\s*$`, 'i')
const TIME_FIRST = new RegExp(String.raw`^\s*${T}\s*[-–:.,]?\s+(.+)$`, 'i')
const TIME_LAST = new RegExp(String.raw`^\s*(.+?)[\s,:]+${T}\s*$`, 'i')

function toMinutes(h: string, m: string | undefined, ap: string | undefined): number | null {
  let hh = Number(h)
  const mm = Number(m ?? 0)
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || mm > 59) return null
  const suffix = (ap ?? '').replace(/\./g, '').toLowerCase()
  if (suffix === 'pm' && hh < 12) hh += 12
  if (suffix === 'am' && hh === 12) hh = 0
  if (hh > 24) return null
  return Math.min(DAY, hh * 60 + mm)
}

/** Read one line of a written day. Returns null for lines with no time in them. */
export function parseLine(line: string): Draft | null {
  let m = RANGE_FIRST.exec(line)
  if (m) {
    const start = toMinutes(m[1], m[2], m[3])
    const end = toMinutes(m[4], m[5], m[6])
    if (start !== null && end !== null) return { start, end, label: m[7].trim() }
  }
  m = RANGE_LAST.exec(line)
  if (m) {
    const start = toMinutes(m[2], m[3], m[4])
    const end = toMinutes(m[5], m[6], m[7])
    if (start !== null && end !== null) return { start, end, label: m[1].trim() }
  }
  m = TIME_FIRST.exec(line)
  if (m) {
    const start = toMinutes(m[1], m[2], m[3])
    if (start !== null) return { start, label: m[4].trim() }
  }
  m = TIME_LAST.exec(line)
  if (m) {
    const start = toMinutes(m[2], m[3], m[4])
    if (start !== null) return { start, label: m[1].trim() }
  }
  return null
}

/**
 * Drafts → a valid set of blocks: snapped to 15 minutes, missing ends filled
 * from the next start, overlaps clamped, empties dropped.
 */
export function blocksFromDrafts(drafts: Draft[]): Parsed {
  const notes: string[] = []
  const rows = drafts
    .map((d) => ({ ...d, start: snap(d.start), end: d.end === undefined ? undefined : snap(d.end) }))
    .sort((a, b) => a.start - b.start)

  const SLEEP = /\b(sleep|bed ?time|bedtime|asleep|night)\b/i
  const blocks: Block[] = []
  rows.forEach((row, i) => {
    const next = rows[i + 1]
    const inferred = row.end === undefined
    // An end nobody wrote runs to the next thing that was written. The last
    // block gets an hour — unless it is sleep, which runs to midnight.
    let end = row.end ?? (next ? next.start : SLEEP.test(row.label) ? DAY : Math.min(DAY, row.start + 60))
    if (next && end > next.start) {
      notes.push(`"${row.label}" overlapped "${next.label}" — trimmed to ${hhmm(next.start)}`)
      end = next.start
    }
    if (end <= row.start) {
      notes.push(`"${row.label}" had no length and was dropped`)
      return
    }
    if (inferred && end - row.start > 180) {
      notes.push(`"${row.label}" runs to ${hhmm(end)} — no next time was given, shorten it if that is wrong`)
    }
    const look = decorate(row.label, i)
    blocks.push({
      id: uid(),
      start: row.start,
      end,
      color: row.color ?? look.color,
      icon: row.icon ? [...row.icon][0] : look.icon,
      label: row.label.slice(0, 60),
    })
  })
  return { blocks: sortBlocks(blocks), notes }
}

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/** Parse a whole written day locally. No key, no network. */
export function parseDayText(text: string): Parsed {
  const drafts: Draft[] = []
  const skipped: string[] = []
  for (const raw of text.split(/[\n;]+/)) {
    const line = raw.trim().replace(/^[-*•]\s*/, '')
    if (!line) continue
    const d = parseLine(line)
    if (d) drafts.push(d)
    else skipped.push(line)
  }
  const out = blocksFromDrafts(drafts)
  if (skipped.length) out.notes.unshift(`No time found in: ${skipped.slice(0, 3).map((s) => `"${s}"`).join(', ')}${skipped.length > 3 ? ` (+${skipped.length - 3} more)` : ''}`)
  return out
}

/* ---------- optional: let Claude read the messy version ---------- */

const SYSTEM = `You turn a parent's description of a child's day into a schedule.
Return one block per activity, covering only what the parent described.
- start_minutes and end_minutes are minutes from midnight, 0 to 1440, in steps of 15.
- Blocks must not overlap and must be in order.
- icon is exactly one emoji a pre-literate child would recognise for that activity.
- color is a hex colour that suits the activity; give neighbouring blocks clearly different colours.
- label is a short parent-facing name (max 4 words).
If a time is vague ("after lunch"), infer a sensible one from the surrounding blocks.`

/**
 * Ask Claude to read free-form prose. The SDK is imported on demand so the
 * kid-facing display never downloads it.
 */
export async function parseDayWithClaude(text: string, apiKey: string): Promise<Parsed> {
  const [{ default: Anthropic }, { z }, { zodOutputFormat }] = await Promise.all([
    import('@anthropic-ai/sdk'),
    import('zod'),
    import('@anthropic-ai/sdk/helpers/zod'),
  ])

  const Schema = z.object({
    blocks: z.array(
      z.object({
        start_minutes: z.number(),
        end_minutes: z.number(),
        label: z.string(),
        icon: z.string(),
        color: z.string(),
      }),
    ),
    note: z.string(),
  })

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  const response = await client.messages.parse({
    model: 'claude-opus-5',
    max_tokens: 16000,
    system: SYSTEM,
    output_config: { effort: 'low', format: zodOutputFormat(Schema) },
    messages: [{ role: 'user', content: text }],
  })

  if (response.stop_reason === 'refusal') throw new Error('Claude declined this request')
  const parsed = response.parsed_output
  if (!parsed?.blocks?.length) throw new Error('Claude returned no blocks')

  const out = blocksFromDrafts(
    parsed.blocks.map((b) => ({
      start: b.start_minutes,
      end: b.end_minutes,
      label: b.label,
      icon: b.icon,
      color: /^#[0-9a-f]{6}$/i.test(b.color) ? b.color : undefined,
    })),
  )
  if (parsed.note) out.notes.push(parsed.note)
  return out
}

/* ---------- the key lives in this browser only ---------- */

const KEY = 'kidsclock.apiKey'
export const loadApiKey = () => {
  try { return localStorage.getItem(KEY) ?? '' } catch { return '' }
}
export const saveApiKey = (k: string) => {
  try { k ? localStorage.setItem(KEY, k) : localStorage.removeItem(KEY) } catch { /* ignore */ }
}
