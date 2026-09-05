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

## Put it on the web (free)

The build is a folder of static files, so any static host works. This repo ships a
GitHub Pages deploy: `.github/workflows/deploy.yml` builds on every push to `main`
and publishes `dist/`. Asset paths are relative (`base: './'` in `vite.config.ts`),
so it works at a domain root or under a project subpath like `/kidsclock/`.

One-time setup:

1. The repo must be **public** for Pages on a free account —
   *Settings → General → Danger Zone → Change visibility*.
2. *Settings → Pages → Build and deployment → Source: **GitHub Actions***.
3. Merge this branch into `main`. The workflow runs and the URL appears under
   *Actions → Deploy to GitHub Pages*, at `https://<user>.github.io/kidsclock/`.

Every later push to `main` redeploys. To host it elsewhere instead, `npm run build`
and drop `dist/` on Netlify, Cloudflare Pages, Vercel or any web server — no
environment variables, no backend, nothing to configure.

## The two screens

**Editor** (parent) — block list with 15-minute time pickers, color swatches, an
emoji picker and a label; add / delete / reorder; overlapping edits are rejected
and the offending row is highlighted. Switch, duplicate, rename, create and delete
plans. Export the plan as JSON to the clipboard and import JSON back as a new plan.
A live preview of the selected face sits next to the editor.

**Display** (kid) — black, fullscreen, no words. Reads the real clock every 30
seconds. Dev controls hide behind the small dot in the top-right corner; `Esc`
closes that panel, `Esc` again returns to the editor.

## Write the day in words

The editor has a **Write the day** box. One activity per line, in any of these shapes:

```
7:00 wake up
7:30 breakfast
9:00-12:00 school
12 lunch
1pm nap
bath 19:30
20:00 sleep
```

**Build blocks** parses it locally — no key, no network, no cost — picking an icon
and colour per activity from the words. It always creates a *new* plan, so nothing
you already have is overwritten, and it reports what it had to adjust: lines with no
time in them, blocks trimmed because they overlapped, and inferred ends longer than
three hours. Rules worth knowing: an end nobody wrote runs to the next time written;
the last line gets an hour, unless it is sleep, which runs to midnight.

### The optional Claude path

**Ask Claude** handles prose the parser cannot read ("she naps after lunch for about
an hour"). It needs your own Anthropic API key, and there is nowhere secret to put it
in a static site:

- `.env` / `VITE_*` values are **compiled into the published bundle** — on a public
  site they are readable by anyone. They are not secrets.
- GitHub Actions secrets are safe during a build but not once injected into frontend code.

So the key is typed into the app and kept in that browser's `localStorage` only. It is
never committed and never sent anywhere but Anthropic — but anyone using that device
can read it, so do not add it on the kid's tablet. Everything else in the app works
without it. The SDK is imported on demand, so the display screen never downloads it.

If you ever want the AI path without a key on the device, the answer is a small
serverless proxy (Cloudflare Worker, Netlify/Vercel function) holding the key
server-side — that is a real backend, deliberately out of scope here.

Whatever comes back from Claude is snapped to 15 minutes, de-overlapped and clamped
by the same local code that handles typed input — the model is never trusted to
produce a valid plan on its own.

## The week

Each weekday is assigned a plan in the **Week** strip at the top of the editor
(seeded Mon–Fri → *Weekday*, Sat/Sun → *Weekend*). The display screen then shows
**today's** plan by itself — no switching, and it rolls over at midnight on its own.
A day set to *none* falls back to whichever plan is open in the editor. Deleting a
plan clears any day pointing at it.

To put a real school timetable in, give the school day its own plan (duplicate
*Weekday*, rename it, assign it to that weekday) and replace the single `School`
block with the actual periods — circle time, snack, outside, music. They are just
blocks; nothing special is needed.

Worth knowing before you do: more blocks make the ring faces busier. A day with six
school periods plus twelve home blocks is eighteen wedges, and faces A/B/D get thin
at 240px while E (focus card) is unaffected — it only ever shows one thing.

## Controls (on both screens)

- **Face** — one of the variants, or *Compare all faces* in a grid.
- **Day** (display screen) — *Today* follows the real weekday; pick a weekday to
  preview what that day will look like.
- **Size** — 240×240 (round dev board), 336×336 (Fitbit Versa 3) or fullscreen
  tablet. A chosen watch size is rendered at exactly that many CSS pixels; the
  compare grid wraps and scrolls rather than shrinking, so what you see is the
  real legibility at that size.
- **Time** — a scrubber that overrides "now" for any minute of the day. *go live*
  hands control back to the real clock.
- **colorblind check** — a deuteranopia `feColorMatrix` over the face.
- **patterns** — a distinct texture per block, so blocks stay distinguishable when
  the colors collapse.
- **light face** — draws the face on a light background instead of near-black: hands,
  ticks and hour numbers flip to dark ink, gaps become light grey, and *dim past*
  fades spent time toward white rather than blacking it out. The editor is light
  either way; this toggle is only about the face itself, so you can prop both up on
  the device and see which one the kid reads faster. Dark is the default — colours
  pop hardest against black and the device disappears on a shelf at night.
- **dim past** — shades the part of the day already spent, on every face that has a
  time axis. It is deliberately gentle (52% on dark, 50% on light): done time should
  read as *done*, not as *gone* — the child can still see what already happened, which
  is half of what makes the clock feel like theirs. Details: the ring faces black out the elapsed arc, C blacks out the strip above
  the now line, F drops past beads to 30% opacity. E has a single block filling the
  screen, so there is nothing to dim. Face D is this treatment permanently on, so
  the toggle changes nothing there — it is A plus dim-past, kept as its own preset.
- **hour numbers** — off by default, because it is the one thing that puts text on
  the kid's face. On the ring faces (A, D, G) it draws 0 / 6 / 12 / 18 outside the
  ring and shrinks the ring to make room; on B the inner ring gets 0/3/6/9 in the
  middle and the outer ring 12/15/18/21; on C the timeline is labelled 0 → 24 down
  the side. E and F have no time axis to label, so the toggle does nothing there.

## The faces

| | | |
|---|---|---|
| **A** 24h ring | midnight at the top, single hand, colored arcs around the full circle, emoji on each arc |
| **B** 12h double ring | inner ring 00:00–12:00, outer ring 12:00–24:00, hand covers the live ring |
| **C** Vertical timeline | morning at the top, night at the bottom, a "now" line across |
| **D** Depleting ring | elapsed time shaded back without needing the toggle, so the rest of the day is what stands out |
| **E** Focus card | screen filled with the current block's color, huge emoji, progress ring for how much of the block is left, "next up" chip at the bottom |
| **F** Bead row | one dot per block, the current one enlarged and glowing, a pip marking now |
| **G** 24h ring, noon up | face A turned 180° so noon is at the top and the waking day fills the upper half |

## Data model

```ts
type Block = { id: string; start: number; end: number; color: string; icon: string; label: string }
type Plan  = { id: string; name: string; blocks: Block[] }
type WeekMap = Record<number, string | null>   // Date.getDay() index -> plan id
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
src/dayText.ts  written-day parser, the optional Claude call, and the API key in localStorage
src/faces.tsx   geometry helpers, patterns, the six faces, the face registry
src/ui.tsx      face stage (single + compare), size list, control bar, colorblind filter
src/Editor.tsx  parent screen
src/Display.tsx kid screen
src/App.tsx     state, 30-second clock, screen toggle, persistence
```

Plus `.github/workflows/deploy.yml` for the GitHub Pages deploy.

## Adding another variant

Two edits, both small:

1. In `src/types.ts`, widen the key union: `export type FaceKey = 'A' | … | 'G' | 'H'`.
2. In `src/faces.tsx`, write the face and register it:

```tsx
export function FaceH({ plan, now, size, patterns }: FaceProps) {
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
{ key: 'H', name: 'My variant', Comp: FaceH },
```

That is all — the dropdown, the compare grid, the size selector, the scrubber, the
colorblind filter and the patterns toggle all pick it up from the registry.

Faces A, D and G are one `RingFace` with different arguments — the cheapest kind of
variant is a new set of arguments to something that already works.

Useful pieces already in `faces.tsx`: `segments(plan)` (blocks plus gaps covering
the whole day), `pol(r, minutes)` and `ringPath(ri, ro, m0, m1)` for circular
layouts, `<Shape>` (flat color plus the per-block pattern), `<Emo>` (emoji sized to
fit, hidden when it would be too small to read), `<Hand>` and `SWEEP` for the one
allowed animation, and `blockAt` / `nextBlock` from `plans.ts`.

## House rules the faces follow

- Zero text on any face. Color, icon and position only.
- No animation beyond the hand sweep (a single 800 ms transition on the hand, the
  now-line and the progress ring). Nothing blinks, nothing asks for attention.
- Dark face background by default, so the device disappears on a shelf at night —
  with a *light face* toggle when you want to compare.
