# Storyboard, graphics and recording

Paths are relative to `tools/promo-video/demo/`.

## Contents

- Storyboard schema
- How time works
- Adding a motion graphic
- Adding a recording stage
- Reel timing model

## Storyboard schema

`storyboard.json` has `chapters` (`{ n, title }`) and `segments`. A segment is
`{ id, v, vo }`: a unique `id`, the visual `v`, and the voiceover text `vo`. Every segment needs
voiceover, because the voice sets the length of its scene.

| `v.type`  | Use                                                 | Extra fields                                                                     |
| --------- | --------------------------------------------------- | -------------------------------------------------------------------------------- |
| `intro`   | Logo slam and the four steps                        | none                                                                             |
| `concept` | Organisasi, kurikulum, group belajar, murid diagram | none                                                                             |
| `chapter` | Dark chapter card                                   | `n` (matches `chapters[].n`)                                                     |
| `clip`    | Part of a screen recording                          | `clip`, `from`, `to`, optional `device: "phone"`, `maxRate`, `maxZoom`, `method` |
| `price`   | Default price versus class price diagram            | none                                                                             |
| `joins`   | The five ways to join                               | `focus` (0 = overview, 1 = method one detail)                                    |
| `payflow` | Payment status diagram                              | none                                                                             |
| `outro`   | Recap, logo, "Hubungi kami"                         | none                                                                             |

For `clip`: `clip` is a file in `clips/` without the extension (`02-course`). `from` and `to` are a
number of seconds, a mark name written by the recorder, or `"end"`. `device: "phone"` shows the clip
in a phone frame with a step list beside it. `maxRate` caps the fast-forward speed (default 2.5) and
`maxZoom` caps camera zoom (default 1.25). `method` shows a blue "Cara N" tag. `callouts` is a list of `{ word, text, icon }` (desktop clips only): a short dark label bottom right that pops in when the voice says the word matching the regex `word`, and stays until the next callout. Use it for small on-screen values the calm camera cannot enlarge (a price, a status). Time it to when the value is visible on screen, not only when it is spoken: a price callout fired while the field still showed `0`. Icon names are Lucide names; `bun run setup` picks them up from the storyboard.

Consecutive segments that point at the same clip share one continuous layer, so cutting one long
recording into several lines of narration does not restart the video.

## How time works

`compose.html` builds the timeline from `vo_timing.json` (clip lengths and word times). Each
segment lasts 0.3 s lead + voice + 0.55 s tail; chapter cards last at least 3 s, the outro adds 3.2 s,
and the graphic scenes add 0.6 s. A clip segment plays the span `from..to` at whatever rate fits its
duration, between 0.6x and `maxRate`; a speed badge shows above 1.35x. So a long mouse journey with a
short line is sped up, and a short action under a long line is slowed. If a clip looks rushed, write
a longer line, raise `maxRate`, or trim `from..to`.

Graphics reveal items on the word that names them, using the ElevenLabs word timestamps:
`wordAt(id, /regex/)` returns seconds into that segment's speech.

## Adding a motion graphic

1. Add a `builders.<name> = (shot, root) => update` in `compose.html`. It creates DOM in `root`,
   registers sounds with `sfx(time, "pop" | "tick" | "whoosh" | "swipe" | "impact" | "boom" |
"shimmer", gain)`, and returns `(t) => ...` that positions everything for time `t`.
2. Use the helpers already there: `pop` (spring-in), `wordsReveal` and `revealWords` (masked words),
   `E` (easings), `P(t, start, dur)` (0..1 progress), `icon(name, color, strokeWidth)`.
3. Icons are Lucide names written as quoted strings in the HTML. Add the name and run
   `bun run setup`: it rescans the HTML and regenerates `assets/icons.js`.
4. Reference the new `v.type` from a segment. Render stills at the new scene before a full render.

## Adding a recording stage

Stages live in `record.mjs` as async functions on the `stages` object. Skeleton:

```js
async myStage() {
  const { browser, page, saveAuth } = await session("owner");   // "learner" for a second account
  const a = actor(page);                       // pause, moveTo, click, type, scroll: human-paced
  await page.goto(`${BASE}/workspace/${state.orgSlug}/dashboard`, { waitUntil: "networkidle" });
  const rec = dry ? null : await record(page); // phone: pass { width: 390, height: 844, scale: 3 }
  const mark = (n) => rec?.mark(n);            // name the on-screen moment
  mark("start");
  await a.click(page.getByRole("button", { name: "Simpan" }));
  await shot(page, "1-saved");                 // debug screenshot in $TMPDIR/promo-video-debug
  await rec?.stop("12-my-stage");              // writes clips/12-my-stage.mp4 and .json (marks)
  await saveAuth();
  await browser.close();
}
```

`session` keeps one login per kind in `auth-<kind>.json`; `state` (`state.json`) carries ids between
stages (organization slug, course id, invite path, payment id). Run a new stage with `--dry` until
the selectors work: it executes everything without recording. Use human pacing (`a.type` types
character by character); it also makes the video readable.

Demo data is fake and must stay fake: the static QRIS image encodes a made-up merchant and the
transfer receipts are drawn images. Never put real payment details in a recording.

After recording a clip, run `bun run demo:camera <clip>` for its camera track. Phone clips need none.

## Reel timing model

`reel/reel.html` is authored on a 64 beat grid at 128 BPM: `b(n)` converts a design beat to seconds
and `d(n)` a beat duration that is never stretched. The voiceover lines (`reel/voiceover.py`) are
`(start beat, hold beat, text, anchors)`. When a line runs past its hold, the scene holds for whole
beats (`HOLDS`), and the music sections move with it, so cuts stay on the beat. Anchors `(beat, word)`
hold a card until the word that names it is spoken. The video is as long as the voice needs; the
original 30 s target was dropped by the user.
