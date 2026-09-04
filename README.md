# Color Clock — prototyping bench

A local web app for designing a kids' "color clock": a watch/clock face that shows
the day as colored blocks instead of numbers, so a pre-literate child can see what
is happening now and what is next.

No backend, no auth, no database. Everything lives in `localStorage`, and every
face is inline SVG drawn into a `100 × 100` viewBox, so it scales to any size.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

That is the whole setup. `npm run build` produces a static `dist/` if you want one.

## The two screens

**Editor** (parent) — block list with 15-minute time pickers, color swatches, an
emoji picker and a label; add / delete / reorder; overlapping edits are rejected
and the offending row is highlighted. Switch, duplicate, rename, create and delete
plans. Export the plan as JSON to the clipboard and import JSON back as a new plan.
A live preview of the selected face sits next to the editor.

**Display** (kid) — black, fullscreen, no words. Reads the real clock every 30
seconds. Dev controls hide behind the small dot in the top-right corner; `Esc`
closes that panel, `Esc` again returns to the editor.

## Controls (on both screens)

- **Face** — one of the six variants, or *Compare all six* in a grid.
- **Size** — 240×240 (round dev board), 336×336 (Fitbit Versa 3) or fullscreen
  tablet. A chosen watch size is rendered at exactly that many CSS pixels; the
  compare grid wraps and scrolls rather than shrinking, so what you see is the
  real legibility at that size.
- **Time** — a scrubber that overrides "now" for any minute of the day. *go live*
  hands control back to the real clock.
- **colorblind check** — a deuteranopia `feColorMatrix` over the face.
- **patterns** — a distinct texture per block, so blocks stay distinguishable when
  the colors collapse.

## The six faces

| | | |
|---|---|---|
| **A** 24h ring | single hand, colored arcs around the full circle, emoji on each arc |
| **B** 12h double ring | inner ring 00:00–12:00, outer ring 12:00–24:00, hand covers the live ring |
| **C** Vertical timeline | morning at the top, night at the bottom, a "now" line across |
| **D** Depleting ring | elapsed time dimmed to near-black, only the rest of the day is bright |
| **E** Focus card | screen filled with the current block's color, huge emoji, progress ring for how much of the block is left, "next up" chip at the bottom |
| **F** Bead row | one dot per block, the current one enlarged and glowing, a pip marking now |

## Data model

```ts
type Block = { id: string; start: number; end: number; color: string; icon: string; label: string }
type Plan  = { id: string; name: string; blocks: Block[] }
```

`start` / `end` are minutes from midnight (0–1440, in 15-minute steps). Blocks may
not overlap; uncovered time renders as a neutral gray gap (the seeded *Weekend*
plan has one, between free play and the park). `label` is parent-facing only — it
never appears on the kid display. Three plans ship as seeds: *Weekday*, *Weekend*,
*Travel day*.

## Files

```
src/types.ts    types shared by everything (Block, Plan, FaceProps, Prefs)
src/plans.ts    seeds, palette, emoji set, time helpers, overlap rules, storage, JSON import/export
src/faces.tsx   geometry helpers, patterns, the six faces, the face registry
src/ui.tsx      face stage (single + compare), size list, control bar, colorblind filter
src/Editor.tsx  parent screen
src/Display.tsx kid screen
src/App.tsx     state, 30-second clock, screen toggle, persistence
```

## Adding a seventh variant

Two edits, both small:

1. In `src/types.ts`, widen the key union: `export type FaceKey = 'A' | … | 'F' | 'G'`.
2. In `src/faces.tsx`, write the face and register it:

```tsx
export function FaceG({ plan, now, size, patterns }: FaceProps) {
  const { pat, defs } = useGfx(patterns)          // per-instance patterns + glow
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img">
      {defs}
      <Bg />
      {segments(plan).map((s, i) => (            // blocks *and* the grey gaps between them
        <Shape key={i} rect={{ x: 0, y: s.start / 14.4, w: 100, h: (s.end - s.start) / 14.4 }}
          color={s.block?.color ?? GAP_COLOR} index={s.index} patterns={patterns} pat={pat} />
      ))}
    </svg>
  )
}

// …then add to the registry at the bottom of the file:
{ key: 'G', name: 'My variant', Comp: FaceG },
```

That is all — the dropdown, the compare grid, the size selector, the scrubber, the
colorblind filter and the patterns toggle all pick it up from the registry.

Useful pieces already in `faces.tsx`: `segments(plan)` (blocks plus gaps covering
the whole day), `pol(r, minutes)` and `ringPath(ri, ro, m0, m1)` for circular
layouts, `<Shape>` (flat color plus the per-block pattern), `<Emo>` (emoji sized to
fit, hidden when it would be too small to read), `<Hand>` and `SWEEP` for the one
allowed animation, and `blockAt` / `nextBlock` from `plans.ts`.

## House rules the faces follow

- Zero text on any face. Color, icon and position only.
- No animation beyond the hand sweep (a single 800 ms transition on the hand, the
  now-line and the progress ring). Nothing blinks, nothing asks for attention.
- Dark background everywhere, so the device disappears on a shelf at night.
