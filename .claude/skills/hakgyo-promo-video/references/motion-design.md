# Motion design: how things should move and what to check

The craft layer that sits under every page (`editorial.html`, `compose.html`, `caption.html`). `motion-techniques.md` is the
catalogue of effects; this file is the judgment: timings, curves, holds, cuts, and the checks to run on a finished render.

## Contents

- Provenance and how far to trust the numbers
- Think in beats before animating
- Durations and curves
- Entrances, exits and cuts
- Words, counters and typing
- Cursor, click and camera on a screen recording
- Nothing is ever dead, and the ending
- Where our look overrides these rules
- Gates to check on a render
- What the engine has and what it lacks

## Provenance and how far to trust the numbers

The timings below were taken from the public skill *motionmaxxing* by Tejas Makwana (github.com/Tejashmakwana/motionmaxxing,
Apache-2.0), which measured short launch films frame by frame. Everything here is restated in our own words; no code or assets
were copied. Its bundled GSAP is under GreenSock's own "No Charge" licence, not open source, so we never import it. Its own
README says the statistics were decoded by a model from clips of 3-7 seconds, so use them as starting points and trust a look at
the render over a number. Our walkthroughs run minutes, not seconds, and a numbered label above a title is part of our approved
editorial look (see the override section).

## Think in beats before animating

Give every beat one job and name what the viewer buys from it: a claim, a turn, a proof, or a close.

- **Hook** states the claim while already moving on frame 0. A first frame that is empty or still reads as a slide.
- **Turn** flips the problem. Carry one object across the cut so the eye does not restart.
- **Proof** shows one real fragment of the app, magnified, doing the thing. One case from trigger to result beats a tour of
  features. Use real labels, real names and real sentences from the app; "Project Alpha" and lorem prove nothing was gathered.
- **Close** is short. The brand or call to action lands and the film ends while still moving.

Plan the seams as well as the beats: the last frame of one beat should hand its direction or object to the next.

## Durations and curves

Use these when nothing else decides. Frames are at 30 fps (1 frame = 0.033 s).

| Move | Typical | Edge cases |
| --- | --- | --- |
| Translate or scale entrance | 12 frames (0.4 s) | quick 6, relaxed 24 |
| Opacity | 6 frames (0.2 s) | a near-cut is 2-3 |
| Blur in or out | 7 frames (0.23 s) | |
| Exit (translate) | 13-14 frames | scale exit 10 |
| Closing beat entrances | halve them to about 6 | a hero mark or button can run 18-30 |

Curve rules:

- **Landing decelerates, leaving accelerates.** Entrances use a firm ease-out, exits an ease-in, and an exit should still be
  at full speed when it leaves the frame. Not every exit has to accelerate (a shrink to centre or a blur-out may not).
- **A symmetric S-curve is for opacity and blur only.** Moves with it feel lazy.
- **Overshoot is rare, small and late.** About one move in ten, peak around 1.08 and after two thirds of the duration. One
  visible spring per film at most, and none for technical or tutorial pieces. This matches the "no overshoot" rule of the editorial
  look; keep it that way unless the user asks for a playful piece.
- **Things arrive by moving, not by fading.** Add an offset, a scale or a blur that decays, and use opacity only as a 4-6 frame
  helper. A pure opacity fade is the default of generated video and it shows.
- **A hard one-frame cut reads as state, not animation.** Use it for a row appearing in a list, a status changing, a word being
  replaced.

Named curves worth having in a page, by shape (percent of the travel done at 10 / 25 / 50 % of the time):

| Name | Shape | Use |
| --- | --- | --- |
| snap | about 50 / 86 / 95 | hero entrance, closing mark; most travel in the first 4 frames, then a long tail |
| firm out | 26 / 60 / 85 | the workhorse for text and panels |
| soft out | 9 / 35 / 73 | medium moves |
| linear | 9 / 24 / 50 | drifts, fades, counters |
| ease in | 2 / 7 / 23 | gentle acceleration |
| hard in | 0 / 2 / 8 | accelerating into a cut |

## Entrances, exits and cuts

- **Stagger siblings by 1-3 frames with uneven gaps** (for example 3, 2, 2, 2, 2) and make each move about twice as long as the
  gap, so the tails overlap. Even timer delays read as a loading list. Whole words are slower (2-5 frames, up to 8-12 when led by
  the voice). A closing stack widens to about 8 frames.
- **Directional smear** on a fast move: a short motion blur along the travel axis, strongest on the first frame of an entrance
  and the last frame of an exit, gone within three frames. It is what makes a move look filmed rather than tweened.
- **Cuts are the edit.** Cut on motion, not on rest. Good joins: a carried object (the button that was the dot), the effect of
  scene A becoming the content of scene B, a blur-matched cut, and a hard replacement of one word. A wipe should start inside A
  and finish inside B. If the ground changes theme, hide the flip behind a flat dip.
- **Avoid stock transitions between every scene.** One or two designed joins and hard cuts elsewhere feels edited; a different
  wipe each time feels like a template.

## Words, counters and typing

- **Act out the meaning on the word.** If the line says "cepat", that word is the fast one; if it says "satu", it lands alone.
  Do not animate every word the same.
- **Build a headline from whole words**, not letters. Words land at speech rhythm; the accent colour appears on arrival and
  settles to the ink colour. Never type a headline letter by letter; typing is for prompts and inputs, where a caret belongs.
- **Typing rhythm** is bursts of one to three characters per frame for a prompt and one character per two to four frames for
  composed text, with a longer beat after spaces. Seed it, so the same text always types the same way.
- **A count-up** changes one value per frame, steps larger early and smaller late, lands exactly on the target, and never eases
  the digits. Use tabular numerals so the width does not jitter. A number the viewer is meant to read holds still for about a second.

## Cursor, click and camera on a screen recording

- **Frame one object and magnify it.** The thing the viewer must read has text of at least 4 % of the frame height and the
  fragment fills at least 55 % of the width (or is cropped by the edge). Magnify with the camera, not by resizing type. Never
  show two readable objects in one frame unless one is at least twice the area of the other.
- **The cursor** is one design per film, drawn with its tip as the origin. It enters oversized and shrinks to scale, travels on
  a curve rather than a straight line, parks for 2 frames at an obvious button and 3-5 at a switch, and finishes any camera
  zoom before the press. The target reacts about one frame after the cursor, and the film cuts just before the release.
- **A press** compresses the target a few percent and releases; no ripple needed. State changes caused by a click (a toggle, a
  cascade of rows) happen one to two frames after it.
- **Camera moves** live on one group, so a card, its panels and its cursor scale together. Pull-backs work as a one-frame snap
  (scale to roughly 0.6-0.75 of the previous value) followed by a decelerating tail of 9-18 frames. Pushes and pulls are about
  18 frames. Whips take 7-8 frames with a smear.
- **Background UI** is defocused with blur, not opacity: about 4 px keeps copy readable, 7-15 px for non-hero panels, capped
  near 11 px when a headline sits above it.

## Nothing is ever dead, and the ending

- **No dead frame.** If something holds for more than 3 frames, keep one thing alive on it: a drift of 1-3 px a frame, a
  0.5-1 % scale creep, a caret, a counter tick, light moving on the ground. Only the payoff the viewer must read may be perfectly
  still, and for under about a second.
- **A designed breath** (0.6-1.5 s) before a payoff or after a matched cut is fine and may be quiet with one living thing on it.
- **End mid-motion** or on a short resolved hold. A closing hold of 0.6-1.4 s is normal, anything longer reads as a frozen
  video. The final shot (from the last cut to the end) should not exceed a quarter of the film.
- **Film-level rhythm.** For a whole film the mean frame-to-frame change measured on human-made films is calm, around 6.8 on a
  0-255 luma scale (typical range 4.4-9.8). Treat a value far above it as "is it too busy to read?" and far below it as "does
  anything live between the beats?". It is a question, never a pass or fail.

## Where our look overrides these rules

The source skill bans a numbered label above a headline, uppercase tracked text, kickers, left-anchored deck layouts and a
progress bar, because it targets brand launch films. Our approved editorial look (`01 · Bagikan` plus a short title, revealed
through a mask) uses exactly the first of these, so a page-chrome lint written for that skill would flag our own film. Take its
timing and curve rules, not its layout bans. Also keep:

- the calm monochrome palette, with colour only from the app UI;
- moves that settle without bounce;
- no novelty props: confetti, stamps, neon, slot counters, camera shake.

## Gates to check on a render

Run these on every finished file and quote the numbers in the report.

| Gate | Check | Tool |
| --- | --- | --- |
| Render exists | decodes, is not blank, picture moves, duration matches the plan, audio present and not silent | `ffprobe`, `ffmpeg -af ebur128` |
| No empty frame | no run of more than 3 consecutive flat frames (a short dip inside a transition is fine) | contact sheet and stills; `pvs still` |
| End hold | picture unchanged at the end is at most 1.4 s | not checked by `pv lint`; look at the last second of stills |
| Proof readable | the key text is at least 4 % of the frame height and the fragment at least 55 % of the width | by eye on stills |
| One hero per frame | only one primary object unless one is much larger | by eye on a contact sheet |
| Loudness | about -14 LUFS, true peak under -1 dBTP | `pv lint` (once rendered) |
| Seek safety | frame N is identical whether jumped to or played to | render a still at N twice, once after seeking from a later frame |

A passing gate is not good taste; it only rules out a class of mistakes. Look at the sheet yourself and describe what you saw.

## What the engine has and what it lacks

Checked against `demo/motion.js` and `demo/editorial.html` on 2026-10-12.

| Idea | State |
| --- | --- |
| Deterministic noise, springs (`M.spring`), smoothstep | present in `motion.js` |
| Seek-safe pages (`window.seek(t, frame)`), motion blur by multi-capture | present (`motionBlur` in `project.json`) |
| Per-beat poses with a one-second ease (editorial) | present; a single generic curve for every move |
| Named, measured curves with per-role default frame counts | missing |
| Directional smear on entrances and exits | missing (only whole-frame motion blur) |
| Drawn cursor with curved travel and a press | missing; the cursor seen today is the one baked into the screen recording |
| One-frame camera snap with a tail | missing |
| Automatic check of empty frames and the end hold on the render | missing; do it by eye |

If the user asks for more polish, these are the next engine changes, in this order: named curves with default frame counts,
then directional smear, then the camera snap, then a render checker that reports the gates above.
