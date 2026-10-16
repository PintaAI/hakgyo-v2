---
name: hakgyo-promo-video
description: Make Hakgyo marketing and product videos end to end. Researches the real app flows, writes a storyboard and an Indonesian voiceover, screen-records the real app with Playwright, composes scenes in the pv-studio timeline editor (or its `pvs` CLI), adds motion graphics and dynamic captions, and renders a finished MP4 (a 9:16 TikTok/Reels/Shorts explainer, a 16:9 product walkthrough, or captions and graphics over a raw talking-head video). Use whenever the user asks for a promo video, demo video, product walkthrough, tutorial or explainer video, reel, TikTok, screen recording with voiceover, motion graphics, captions on a raw video, or wants to edit, retime, re-render or fix an existing Hakgyo video, even if they never name the tools or say "skill".
---

# Hakgyo promo video

Two pieces, both standalone (never part of lint, typecheck, build or CI):

- **`tools/promo-video/`** (untracked): the engine and the `pv` CLI. Its `README.md` is the command reference.
- **`/root/projects/pv-studio`** (own git repo, not pushed): a dashboard and timeline editor served on the tailnet
  (`https://jennie-linux.tail2268a1.ts.net:4310`, editor at `#/edit/<project>`) and the `pvs` CLI
  (`bun /root/projects/pv-studio/bin/pvs.ts help`). Both edit the same `storyboard.json` through one op layer, with undo,
  and each shows the other's edits live.

This skill is the part the README cannot hold: how to decide things, and what went wrong before.

## Pages and projects

A project is a folder in `tools/promo-video/` whose `project.json` picks an engine page (`demo/*.html`):

| `page` | For |
| --- | --- |
| `editorial.html` | The default look for 9:16 shorts (see below). Scenes `statement`, `window`, `phone`, `card`, `end`. |
| `compose.html` | Long 16:9 explainers: chapters, callouts, `list` scenes, phone clips with `side`/`step`, `cuts`. |
| `caption.html` | Overlay on a raw talking-head video: word-by-word captions and graphic cards from `captions.json`. |

Every page implements `window.ready`, `window.seek(t, frame)` and `window.TIMELINE`; that contract is what `render.mjs`
and the editor preview both use. The reference project is `contoh-tryout` (a 30 s editorial short with recordings and voice;
open it first). Earlier projects were removed from the VPS after their videos went to R2 (`hakgyo-*` in superadmin media):
the 2026-10-11 cleanup of `kurikulum`, `landing`, `undang`, the old shorts, `skill-explainer`, `showreel`, `reel/` and the pages
`short.html`, `showreel.html`, `quiznight.html` (their recipes are in `/root/archive/promo-legacy-2026-10-11.tar.gz`), and later
`pr41-demo`, `pr41-kelas-events`, `short-03`, `short-04` and `raw-ingin` (no recipe archive; rebuild from this skill).

## Decide first (ask only what the answer changes)

- **Format and length.** A walkthrough or tutorial is 16:9 `compose.html` with no length cap unless the user sets one. A
  TikTok/Reels/Shorts piece is 9:16 `editorial.html`, 45-60 s unless told otherwise. A raw video the user supplies is
  `caption.html`.
- **Audience.** Hakgyo's paying customer is the institution or individual who runs Korean classes, not the learner. Copy
  speaks to them: their problem, their workflow, their students.
- **Language and terms.** Indonesian, common English loanwords kept. In speech and on screen: "kurikulum" for a course,
  "group belajar" or "kelas" for a cohort, "Tugas" for assessments, "kosakata" for vocabulary. Match what the UI says.
- **New recordings or reuse?** Recording drives the shared dev server and creates real demo data (accounts, an
  organization, a payment). If only wording or timing changes, edit the storyboard and re-render; do not re-record.
- **Voice.** Shorts use Gemini "Leda" (`project.json` `voice`; word times from Whisper, needs `OPENAI_API_KEY`). ElevenLabs
  is still supported (free plan: premade voices only, 10,000 characters a month).

## Workflow

Do the steps in order; each one removes a class of rework from the next.

1. **Check the state.** `git status`; `bun pv.mjs status` in `tools/promo-video` (or the dashboard: disk, GPU worker,
   per-project stages); fetched assets present (`bun run setup` if not).
2. **Research the real flows from the code, read-only.** Routes, exact Indonesian UI labels, seed data, rules in `docs/`.
   Use one Explore agent at most. The script must describe what the product actually does.
3. **Scaffold.** `bun pv.mjs new <name>` creates a 9:16 editorial project whose source is `storyboard.json` (a project made
   with `--like=<p>` still starts from `storyboard.py`; run `pvs adopt <name>` to switch it to JSON).
4. **Record** with `bun pv.mjs record <name> --dry` first for new selectors, then without `--dry`. Stages use
   `demo/lib/stage.mjs`; name marks after the on-screen moment. Then `bun pv.mjs camera <name>`.
5. **Compose the storyboard** in the editor or with `pvs` (next section). Keep lines short (about 14-17 characters a
   second). Look at the preview or `pvs still <p> <t...>` (frames land in `<p>/.pv/stills/`) before spending TTS quota.
6. **`bun pv.mjs voice <name>`** once the lines are final. It only generates new or edited lines (cached by text); the
   editor shows the character count and asks first. Render stays disabled until every line has audio.
7. **`bun pv.mjs check <name>`** (stills and labelled contact sheets), look at every sheet, fix, repeat.
8. **`bun pv.mjs render <name>`** (GPU worker when up, video downloaded; audio normalised to -14 LUFS), then
   `bun pv.mjs lint <name>` (rhythm, scene changes, loudness and true peak). Fix its warnings or say why one stays.
9. **Backup, then delete.** `bun pv.mjs backup <file>` uploads to R2. Then `bun pv.mjs media has <file>` must print `OK` (same
   name and exact size; it exits 1 otherwise), and only then delete the local mp4. `bun pv.mjs media ls` lists everything in R2.
10. **Verify and report** (below).

## Editing storyboards (pv-studio and `pvs`)

- **`storyboard.json` is the source** of an adopted project (`"source": "json"` in `project.json`); `pv story` then skips
  `storyboard.py` so edits are never overwritten. A project not yet adopted is view-only in the editor; `pvs adopt <p>`
  moves its script to `storyboard.legacy.py`. Ask before adopting a real project.
- **Drive it from the terminal** with `pvs`: `show`, `add` (kinds `statement`, `window`, `phone`, `card --image assets/x.webp`,
  `end`, `clip` for compose, or any `--v '{...}'`; clips, marks and images are validated), `mv`, `dup`, `rm`, `rename`, `vo`,
  `set`, `hold`, `trim`, `cut`, `zoom`, `focus`, `callout`, `undo`, `redo`, `history`, `voice` (which lines need audio and their cost), `timeline`, `still`.
  Add `--json` for machine output. `pvs timeline`/`still` open the real page in Chrome with estimated durations for lines
  that have no audio yet, so layout can be judged before the voice exists.
- **Editor facts:** the preview is the real engine page in an iframe; timeline tracks are Scene, Suara, Layar, Efek; drag a
  scene block to reorder, drag its right edge for `v.hold`; the clip panel trims and cuts on both pages, and on
  `editorial.html` sets zoom and focus keys by dragging on the filmstrip and drawing boxes on the frame; on `compose.html` it
  edits `maxRate`, `maxZoom`, `device` and callouts. Every edit reloads the preview (2-4 s). History lives in
  `<p>/.pv/history`.
- **Gotchas:** a `statement` scene needs `lineWords` (one regex per line, matching the voice word that triggers it);
  the op layer generates and keeps them. The editorial `end` card is never hidden afterwards, so `end` must stay last. A new
  or edited `vo` has no audio until `pv voice`. Focus and zoom lists must stay sorted by time (the editor does this). On
  `compose.html` a callout's `word` regex must match a word of that scene's voice line and its `icon` must exist in
  `demo/assets/icons.js` (new Lucide names: put them in a storyboard, run `bun run setup`), or the page throws.
- **Server:** restart with `/root/projects/pv-studio/restart.sh` after changing `server.ts` or `lib/`. It is exposed to the
  tailnet only (`tailscale serve --bg --https=4310 http://127.0.0.1:4310`); if the page is unreachable, check
  `systemctl is-active tailscaled` before blaming the app.
- Long commands (`record`, `voice`, `check`, `render`, ...) write `<p>/.pv/status.json` and `last.log`; the dashboard shows them.

## Default look for shorts: editorial (`demo/editorial.html`)

The user approved this look (short-02c) after rejecting a game-show page as "cringe, not professional, cheap". Start every
new short from it (`contoh-tryout` is the model):

- The landing page's monochrome palette on an off-white stage. Colour comes only from the app UI.
- One numbered label and one short title per beat (`01 · Bagikan`), revealed through a mask.
- The real recording is the hero, in a clean window or phone frame with a soft shadow.
- A focus ring slides over the element the voice names, keyed to the clip clock (recording marks), not to spoken words.
- Eased moves with no overshoot. No camera shake, confetti, stamps, bulbs, neon or slot counters.
- A calm voice and quiet music without drums.
- Shorts render 6 captures per moving frame (`"motionBlur": N`, default 6 for portrait); stills and `check` are never blurred.
  The user prefers the quality over render time.

Being creative means composition and motion, not novelty props. Check stills against this bar before a full render. Keep
all content in the safe area (x 60-940, y 250-1440 of 1080x1920) that TikTok, Reels and Shorts leave uncovered; the editor
has a "zona aman" toggle and `pv check <p> --safe` tints it.

## Promotional teaser: problem, then answer (`demo/teaser.html`)

"Teaser" means a promo, not a feature tour: a hook question, the problem (the tools a class runs on
today, piling up), Hakgyo pulling them into one window, then product moments, and a CTA. Something
visible must change about every 3 s, so each product beat is one short line (about 2 s of voice) over
a 4-6 s slice of a recording with a zoom key. The same page and storyboard render 16:9 and 9:16
(`"size": [1080, 1920]` switches the layout). Projects: `teaser-hakgyo` (landing hero) and
`teaser-hakgyo-vertical`. Clips can be copied from the guide videos instead of recorded again. Music on
a public page must be licensed for commercial use: put the file in the project and set
`"audio": {"track": "..."}`. Never rip music from YouTube.

## Captions on a raw talking-head video (`caption.html`, `pv caption`)

`bun pv.mjs caption init <name> <video.mp4> [--ko]` does the mechanical part: transcodes to all-intra H.264 (`-g 1`, so every seek
is frame accurate), keeps the original audio, calls Whisper once for word times, and writes `captions.src.json` and `captions.json`.
Then shape it with `caption show` (words with their index), `chunks`, `keywords`, `title`, `equals`, `korean add`, `example add` and
`set`; each command rebuilds `captions.json`, and the editor preview follows. Render with `bun pv.mjs render <name>`: `make.mjs` muxes
the original audio back with a two-pass loudnorm (`project.json` `audio.source`).

- Whisper mishears or drops Korean and mistranslates a mixed-language clip, so list Korean phrases and their times by hand and tell
  the user to check them (they cannot be verified by listening).
- The video must be portrait; check frames with `pvs still <name> <seconds...>` (the editor also previews it).
- `captions.json` is staged by `scripts/render-remote.sh` already.

## Rules that came from real mistakes

- **On-screen text mirrors the voiceover.** Every headline, caption and card must say what the voice says at that moment.
  After any script change, audit every scene, including headlines left over from earlier copy. Terms the voice introduces
  (for example "PBT") appear on screen with a short explanation. Never drop or swap something the user named.
- **The camera is calm.** Use held framings of at least 3 seconds, slow eased moves, at most 1.25x zoom. A steady wide shot
  beats a tight frame that crops the field being used.
- **Never trust an estimate you did not measure.** Quote time left from real progress, and say so when something restarts
  the clock.
- **Long jobs run detached from the session.** Start them with `setsid nohup ... > log 2>&1 < /dev/null & disown`. Renders
  are chunked and resumable. Check the log tail for real completion: a stale log gives a false "done".
- **Wait on a PID, not a pattern, and never `pkill -f`/`pgrep -f` a text that is in your own command line.** It matches the
  calling shell and kills it (exit 144). Match `/proc/<pid>/cmdline` exactly, or use `restart.sh`.
- **Do not guess at timing; measure.** Profile (`demo/perf/profile.mjs`) before optimizing.
- **`tools/` is untracked, so git can delete it.** A fast-forward of `main` once deleted engine files. Recover from the T3
  checkpoint refs (`git for-each-ref refs/t3`) or the GPU worker's job workspaces, and check `bun pv.mjs status` after
  branch switches.
- **Deleting.** The auto-mode classifier blocks wildcard and bulk `rm -rf`. Delete by explicit names, only what you created
  or what the user listed; if it is blocked, stop and let the user decide instead of working around it. Verify R2 holds the
  video (size match) before removing a local copy. The dashboard's trash button moves a project to `.trash/` unless
  "permanen" is ticked.
- **Never run cleanup against the shared development database** without the user's go-ahead; report demo data instead.

## This VPS is resource limited

It has 4 cores, 7 GB of RAM and a nearly full disk. When the PC worker is up, `pv.mjs` already sends
`record`, `camera`, `check` and the heavy half of `prep` there (its own Chrome and Next dev server on
`localhost:3000`, same database) and falls back to this machine when it is not. Run at most one agent at a time, and do heavy work (typecheck, renders,
test suites) one thing at a time, because parallel work has crashed the machine and killed every running task. A full local
render takes tens of minutes; with the private GPU worker (`gpu-run status` answers) a short renders in minutes and a long
video in about 9. Keep long finished videos on that machine instead of downloading them (a 200 MB transfer once crawled at
350 KB/s): copy to the worker's `/output` and verify with `demo/perf/verify-render.sh`. If `gpu-run` dies with "The operation
timed out" the job usually keeps running; read its log through the job API and do not restart it. Keep the CPU-only Chrome
default: GPU rasterization made large screen-recording scenes about 4x slower. Before a large transfer, or when one seems slow, run `gpu-run speedtest` (add `--internet` to compare each side's own
line) and quote its numbers instead of guessing. Check free disk before a render, delete frame folders and old renders you
created once the final file exists, and check `tailscale status` first, because the PC may be offline.

## Voiceover and quota

Gemini: quota is characters; a 50 s short is about 700. Check ElevenLabs quota, without printing the key:

```bash
K=$(grep '^ELEVENLABS_API_KEY=' apps/web/.env | cut -d= -f2- | tr -d "\"'")
curl -s -H "xi-api-key: $K" https://api.elevenlabs.io/v1/user/subscription
```

Lines are cached by their spoken text, so editing a line only regenerates that line and re-running is free. Do not edit the
voice settings, model or `pronounce` table casually: that changes cache keys and regenerates everything.

## Verify before you report

You cannot listen to the result, so verify what you can and say plainly what you could not.

- Render stills at a spread of timestamps (`pv check`, `pvs still`), assemble a contact sheet and look at it yourself with
  the image reader. Describe what you checked in text.
- `python3 demo/perf/review-timeline.py` after any script change: it lists silences over 1.2 s and fast or slow clip
  segments. A silence over about 2 s means a clip needs more screen time than its narration.
- `ffprobe` for duration, resolution and that an audio stream exists. `ffmpeg -af ebur128` for loudness (about -14 LUFS).
- Tell the user what to check by ear: pronunciation of "Hakgyo" and any acronym or Korean phrase, music level under the voice,
  whether each line lands on its scene.

## Report

Give an outline with timestamps (from `timeline.json`), where the file is, and every side effect: demo data created in the dev
database (emails, organization), TTS characters and Whisper calls used, dev server restarts, files left behind. Offer cleanup
of the demo data rather than doing it silently, and do not commit or open a PR unless asked.

## References

- `references/storyboard-and-recording.md`: storyboard schema (editorial and compose), how time works, how to add a recording
  stage or a motion graphic.
- `references/troubleshooting.md`: selectors that bit before, stale servers, render and worker pitfalls.
- `references/guide-videos.md`: the user-guide intro videos (`guide-videos/`): order of work, recorder helpers
  (`s.find`, `s.require`, `g.learner`, `s.irreversible`, `g.created`), `pv lint` and the safe limits. Read it before
  making or fixing a guide video.
- `references/motion-techniques.md`: the catalogue of motion techniques and transitions (the `showreel.html` page that held
  them was archived; the descriptions are recipes to lift into the live pages).
