# Motion techniques catalogue

What the engine can animate, where each technique already lives, and how to lift it into another
video. Paths are relative to `tools/promo-video/demo/`. The live reference is the `showreel` project
(`showreel.html`, rendered as `showreel/hakgyo-showreel.mp4`): 20 techniques and 9 transitions,
each labelled on screen. Show it to the user when they ask what is possible.

## Contents

- Rules every technique follows
- The 20 techniques (scene id in `showreel.html`)
- Transitions
- Camera, blur, grain, HUD
- Music and sound
- Lifting a technique into compose.html or short.html
- compose.html scenes added for the skill explainer

## Rules every technique follows

- **Pure function of time.** A builder returns `update(lt, t, frame)`; every value is computed from
  `lt` (seconds into the scene). No `requestAnimationFrame`, no state carried between frames, no
  `Math.random()`: use `hash(i, seed)` and `noise2(x, y, seed)` so any frame renders on its own and
  every motion-blur sample agrees. Canvases are cleared and redrawn on every seek.
- **Springs, not eases, for arrivals.** `M.spring(s, { freq, damping })` from `motion.js`: freq 1-3 Hz,
  damping 0.45 (bouncy) to 0.75 (one soft overshoot). Stagger with a delay per item (`k * 0.05-0.12`)
  or per position (`(col + row) * 0.09` for a diagonal wave).
- **Measure layout with `box(el, root)`**, never `getBoundingClientRect`: the camera shake and
  in-flight springs transform the elements, `box` reads the untransformed layout.
- **Land on the beat.** Scene lengths are whole beats (`beats: 8` at 120 BPM = 4 s); hits go on
  `k * BEAT`. Vary scene lengths (2-6 s); `pv lint` flags uniform shots.
- **Sound with the picture.** Register effects in the builder: `S.fx(lt, "pop" | "tick" | "swipe" |
  "whoosh" | "impact" | "boom" | "shimmer", gain)`, and camera knocks with `S.hit(lt, gain)`.

## The 20 techniques

| # | id | Technique | How it is built |
| - | -- | --------- | --------------- |
| 1 | `stroke` | Stroke draw + liquid fill | SVG `<text>` with `stroke-dasharray`/`dashoffset` (Chrome dashes glyph outlines); a second filled copy clipped by a `clipPath` whose top edge is a moving sine wave. Guide lines draw with `dashable()`/`drawn()`. Fade the stroke out after the fill: NotoKR glyphs have overlapping contours that show as boxes. |
| 2 | `kinetic` | Kinetic typography | One word per beat, `scale(2.3 → 1)` on a stiff spring with a little rotation and skew; the scene background inverts on odd beats; ends by springing the words into a two-line phrase and drawing a squiggle under the last word. |
| 3 | `reveal` | Block reveal + hand-drawn marks | A colour bar grows from the left (`scaleX`, origin left), the text appears, the bar leaves to the right (origin right). Marks: a jittered ellipse (`hash` noise on the radius, 1.12 turns) and a bezier underline, both dash-drawn. |
| 4 | `scramble` | Text scramble | Fixed-width spans; before each character's lock time it shows a glyph from a Latin + jamo pool picked by `hash(frame, ...)`, in the accent colour. |
| 5 | `jamo` | Jamo assembly | Jamo fly in from hashed directions with rotation, show their romanisation, then spring into slots inside the syllable block, then cross-fade into the real syllable (`학`, `교`) with a pop. |
| 6 | `particles` | Particles → logo → explode | Text drawn to an offscreen canvas, pixels sampled every 6 px (≈3,800 points). Each point starts on a spinning tilted disk and springs to its target with a delay from `hash` and its x; the explosion pushes points outward with `ex² ` plus gravity. Points are batched by colour bucket and drawn with `lighter` compositing. |
| 7 | `flow` | Flow field | 1,100 lines integrated through `noise2` (step 7 px, up to 70 steps, the field drifts with `lt`), one `stroke()` per colour. |
| 8 | `morph` | Shape morph + echoes | Every shape is 220 points (polar functions, a parametric heart); morphs interpolate point to point on an under-damped spring (so it overshoots), rotate 36° per step, and three lagged outlines trail it. Start every shape at the top and run clockwise, or the points cross. |
| 9 | `goo` | Gooey metaballs | Circles inside an SVG group with the `#goo` filter (Gaussian blur, then an alpha threshold in `feColorMatrix`): circles that come close melt together. A `userSpaceOnUse` gradient colours the whole group. |
| 10 | `carousel` | 3D carousel | `perspective` stage, a `preserve-3d` ring, cards `rotateY(k·45°) translateZ(R)`; the ring steps on springs; brightness from `cos(angle)`; `-webkit-box-reflect` for the floor reflection. |
| 11 | `zspace` | Z-space fly-through | Items at `translate3d(x, y, z)` in a `preserve-3d` world; the camera moves by adding to every z; fog = opacity from depth; items fade before they reach the lens (`near`) so huge foreground words never cover the HUD. |
| 12 | `data` | Data viz | Odometer (digit columns 0-9 ×4 translated with `outExpo`, extra turns per digit), donut (`strokeDashoffset`), bars on staggered springs, a line drawn with a dot riding `getPointAtLength`. Mark sample numbers "DATA CONTOH". |
| 13 | `bento` | Bento + stagger + flip wave | Tiles spring in from hashed offsets and rotations; a diagonal wave flips them (`rotateY`, front and back faces with `backface-visibility: hidden`) and back. |
| 14 | `path` | Motion path | `getPointAtLength` for position, two nearby points for the tangent angle; the dashed trail is revealed through an SVG mask that is itself dash-drawn. |
| 15 | `bounce` | Squash & stretch | Parabolic hop per beat; squash (wide, short, origin at the bottom) in the last 7% around contact, stretch with speed in the air; the shadow scales with height. |
| 16 | `glitch` | Glitch | 14 clipped copies (`clip-path: inset`) shifted by `hash(frame)` during bursts, RGB split with coloured `text-shadow`, scanlines with a repeating gradient. |
| 17 | `radial` | Radial repeat | Rings of glyphs, dots and petals counter-rotating; each step springs on two beats and every beat kicks the radius (`exp(-u·8)·cos(u·18)`). |
| 18 | `iso` | Isometric build | Canvas prisms (top, left, right faces in three shades), painted back to front by `i + j`, heights on springs in a diagonal wave; a waving flag (sine edge) and a chip on top. |
| 19 | `ui` | UI micro-interactions | A cursor eases between targets just before each moment; toggle knob on a spring, checkbox fill + dash-drawn tick, button press + ripple, stacked toasts over a dimmed screen, like burst (radial dots), progress bar with a counter. |
| 20 | `outro` | Suck-in, shockwave, slam | Labels orbit, get pulled to the centre with `inExpo`; on the boom: expanding rings, `S.hit` (camera shake), logo `scale(3 → 1)` on a spring, then the wordmark and lines. |

## Transitions

Set per scene with `enter`; the incoming layer plays over the outgoing one for `TW[enter]` seconds
(`enterFx` and `exitFx` in `showreel.html`).

| enter | Look |
| ----- | ---- |
| `cut` | Hard cut. |
| `flashcut` | Hard cut with a white flash fading over 0.22 s and a camera knock. |
| `iris` | `clip-path: circle()` opening from the centre; the old scene dims and shrinks a little. |
| `wipe` | Diagonal `clip-path: polygon()` sweeping left to right. |
| `blinds` | `mask-image: repeating-linear-gradient()` bars widening. |
| `push` | New scene slides in from the right while the old one slides out left. |
| `zoom` | Old scene scales up and fades; new one scales from 0.82. |
| `liquid` | SVG `feTurbulence` + `feDisplacementMap` filter on the new layer; displacement falls from 420 to 0. |
| `glitch` | The two scenes alternate per frame (by `hash`) with RGB-split drop shadows. |

Shorts use their own set (`carry`, `whip`, `fade`, `cut`; see SKILL.md "Motion in shorts").

## Camera, blur, grain, HUD

- **Camera shake:** `M.shake(t, HITS, { amp, rot, decay, freq })` on a wrapper around all layers,
  with `scale(1.03)` so the edges never show.
- **Motion blur:** `"motionBlur": N` in `project.json` (the showreel uses 4). Anything that moves on
  every frame (drifting background glows, grain is excluded because it is seeded by frame) makes
  every frame cost N captures. The user prefers the quality over render time.
- **Grain:** a 480×270 canvas of seeded noise, `mix-blend-mode: overlay`, opacity 0.05-0.07.
- **HUD (showreel):** running timecode, beat dots, scene label (index, title, one-line explanation),
  segmented progress bar, and a "TRANSISI · …" pill during transitions.

## Music and sound

`audio.py` reads `project.json` `"audio"`:
`{ "style": "drive", "bpm": 120, "drumsFrom": 3, "music": 0.55, "drums": 0.5, "sfx": 0.75 }`.
`drive` is four-on-the-floor (kick every beat, clap on 2 and 4, off-beat open hats, 16th hats, an
eighth-note bass) over Am7-Fmaj7-Cmaj7-G; `drumsFrom` is the bar where the drums come in. Without
`style` the calm 96 BPM bed is used. Segments with `"file": null` (no voiceover) are skipped, so a
music-only video works. The showreel measured -13.4 LUFS, true peak -1.4 dBTP.

## Lifting a technique into compose.html or short.html

1. Copy the builder body into a new `builders.<name> = (shot, root) => update` in the target page.
2. Replace `S.fx(lt, …)` with `sfx(it.start + lt, …)`, and `S.hit` with an entry in that page's hit
   list (short.html: `HITS`).
3. Times in the showreel are seconds into the scene. In compose/short pages, tie them to the voice
   instead: `it.voAt + wordAt(it.id, /word/)`, so the move lands on the spoken word.
4. Keep the `hash`, `noise2`, `box`, `dashable` and `drawn` helpers with it (they are small; copy
   them if the target page lacks them). `motion.js` is already loaded by all three pages.
5. Run `bun run setup` if the builder names new Lucide icons, then render stills at the scene.

## compose.html scenes added for the skill explainer

`skill-explainer/` (a 2:51 explainer of this skill) added three 16:9 scene types and one clip option:

| `v.type` | Use | Fields |
| -------- | --- | ------ |
| `pipeline` | Up to 8 steps in two rows of cards joined by a line; each card lands on its word, the newest is dark, earlier ones get a check | `kicker`, `title`, `items: [[icon, title, detail, wordRegex]]` |
| `carrydemo` | Fade against carry in two small phones that keep switching scenes; the carry card flies on a spring with a ghost trail | `kicker`, `title`, `image` |
| `terminal` | A terminal that types a command, then prints output lines on spoken words | `kicker`, `title`, `command`, `lines: [[text, wordRegex, extraDelay?, "ok" \| "warn"?]]` |

`v.screenAspect` on a phone clip (`9 / 16`) widens the phone so a finished 9:16 short plays in it
uncropped.
