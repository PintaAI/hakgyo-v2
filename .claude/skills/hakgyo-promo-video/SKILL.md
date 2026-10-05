---
name: hakgyo-promo-video
description: Make Hakgyo marketing and product videos end to end. Researches the real app flows, writes a storyboard and an Indonesian ElevenLabs voiceover, screen-records the real app with Playwright, adds motion graphics, and renders a finished MP4 (a ~6 minute 16:9 product demo, or a 9:16 TikTok/Reels/Shorts promo). Use whenever the user asks for a promo video, demo video, product walkthrough, tutorial or explainer video, reel, TikTok, screen recording with voiceover, motion graphics, or wants to edit, retime, re-render or fix an existing Hakgyo video, even if they never name the tools or say "skill".
---

# Hakgyo promo video

The code lives in `tools/promo-video/` (standalone: not a workspace, never part of lint, typecheck,
build or CI). Its `README.md` is the command reference. This skill is the part the README cannot
hold: how to decide things, and what went wrong before.

Two projects share that folder:

- `demo/`: horizontal 1080p walkthrough. Storyboard in `demo/storyboard.json`, screen recordings
  in `demo/clips/`, voiceover in `demo/vo/`.
- `reel/`: vertical 1080x1920 promo built from the landing page design, on a 128 BPM beat grid.

## Decide first (ask only what the answer changes)

- **Format and length.** A walkthrough or tutorial is `demo/` and has no length cap unless the user
  sets one. A TikTok/Reels/Shorts clip is `reel/` (30 s unless told otherwise).
- **Audience.** Hakgyo's paying customer is the institution or individual who runs Korean classes,
  not the learner. Copy speaks to them: their problem, their workflow, their students.
- **Language and terms.** Indonesian, common English loanwords kept. In speech and on screen:
  "kurikulum" for a course, "group belajar" or "kelas" for a cohort, "Tugas" for assessments,
  "kosakata" for vocabulary. Match what the UI says.
- **New recordings or reuse?** Recording drives the shared dev server and creates real demo data
  (accounts, an organization, a payment). If only wording or timing changes, edit the storyboard and
  re-render; do not re-record.
- **Voice.** The free ElevenLabs plan only allows premade voices over the API (default Jessica) and
  10,000 characters a month. A native Indonesian library voice needs a paid plan.

## Workflow

Do the steps in order; each one removes a class of rework from the next.

1. **Check the state.** `git status`; `bun pv.mjs status` in `tools/promo-video` (disk, GPU worker,
   projects); fetched assets present (`bun run setup` if not).
2. **Research the real flows from the code, read-only.** Routes, exact Indonesian UI labels, seed
   data, rules in `docs/`. Use one Explore agent at most. The script must describe what the product
   actually does: for example the landing page says the WhatsApp integration is still being prepared,
   so do not promise it.
3. **Scaffold, then write the storyboard first.** `bun pv.mjs new <name> --like=<project>`; edit
   `<name>/storyboard.py` (never the JSON). Schema and scene types are in
   `references/storyboard-and-recording.md`. Keep lines short (about 14 characters a second).
4. **Record** with `bun pv.mjs record <name> --dry` first for new selectors, then without `--dry`.
   Stages use `demo/lib/stage.mjs`; name marks after the on-screen moment.
5. **`bun pv.mjs prep <name>`** (storyboard, camera, voiceover, labelled contact sheets in
   `<name>/stills/sheet-NN.jpg`). Look at every sheet before rendering; fix and re-run `check`.
6. **`bun pv.mjs render <name>`** (GPU worker when up, video downloaded; audio normalised to -14 LUFS),
   then `bun pv.mjs backup <file>` and delete the local copy once the backup is confirmed.
7. **Verify and report** (see below).

## Rules that came from real mistakes

- **On-screen text mirrors the voiceover.** Every headline, caption and card must say what the voice
  says at that moment. After any script change, audit every scene, including headlines left over from
  earlier copy. Terms the voice introduces (for example "PBT") appear on screen with a short
  explanation. Never drop or swap something the user named: when "Claude" was replaced by "fitur AI"
  to fit a sentence, the user had to ask for it back.
- **The camera is calm.** The first auto camera followed the cursor and the user called it aggressive
  and jittery. Use held framings of at least 3 seconds, slow eased moves, at most 1.25x zoom. A steady
  wide shot beats a tight frame that crops the field being used.
- **Never trust an estimate you did not measure.** Quote time left from real progress, and say so
  when something restarts the clock. A render lost at 80% had to restart from zero and the user was
  rightly annoyed by the earlier "15 minutes left".
- **Long jobs run detached from the session.** Start them with `setsid nohup ... > log 2>&1 < /dev/null
& disown`. A render started through a session's background tool died twice when the session ended.
  Renders are chunked and resumable, so a restart loses only the chunks in progress.
- **Wait on a PID, not a pattern.** `pgrep -f "text"` matches your own waiting command and exits
  early or never; capture the PID and loop on `kill -0`.
- **Do not guess at timing; measure.** The assumption that video seeking was the slow part was wrong:
  the screenshot step was. Profile (`demo/perf/profile.mjs`) before optimizing.
- **Delete by explicit names.** A wildcard `rm` is blocked by a safety check; list what you created
  and remove those paths.

## This VPS is resource limited

It has 4 cores, 7 GB of RAM and a nearly full disk. Run at most one agent at a time, and do heavy
work (typecheck, renders, test suites) one thing at a time, because parallel work has crashed the
machine and killed every running task. A full local render takes about 55 minutes for 6:21. If the
private GPU worker is available (`gpu-run status` answers), a render takes about 9 minutes; the
command is in the README. Keep the finished video on that machine instead of downloading it (the
user sits there, and a 200 MB transfer once crawled at 350 KB/s): copy it to the worker's `/output`,
and verify in place with `demo/perf/verify-render.sh`, which returns only a report and two contact
sheets. If the `gpu-run` client dies with "The operation timed out" the job usually keeps running
on the worker; read its log through the job API and do not restart it. Keep the CPU-only Chrome default: GPU rasterization made the large
screen-recording scenes about 4x slower. Check free disk before a render, and delete frame folders
and old renders you created once the final file exists.

## Voiceover and quota

Check the quota before generating, without printing the key:

```bash
K=$(grep '^ELEVENLABS_API_KEY=' apps/web/.env | cut -d= -f2- | tr -d "\"'")
curl -s -H "xi-api-key: $K" https://api.elevenlabs.io/v1/user/subscription
```

A 6 minute narration is about 4,500 characters. Lines are cached by their text, so editing a line only
re-generates that line, and re-running is free. Do not edit the voice settings or model casually: that
changes every cache key and regenerates everything.

## Verify before you report

You cannot listen to the result, so verify what you can and say plainly what you could not.

- Render stills at a spread of timestamps, assemble a contact sheet and look at it yourself. Do not
  paste screenshots into the reply to the user; describe what you checked in text.
- `python3 demo/perf/review-timeline.py` after any script change: it lists silences over 1.2 s and
  fast or slow clip segments. A silence over about 2 s means a clip needs more screen time than its
  narration; fill it with narration that describes the action rather than leaving dead air.
- `ffprobe` for duration, resolution and that an audio stream exists. `ffmpeg -af ebur128` for
  loudness; the target is about -14 LUFS.
- Tell the user what to check by ear: pronunciation of "Hakgyo" and any acronym, music level under
  the voice, whether each line lands on its scene.

## Report

Give an outline with timestamps (from `timeline.json`), where the file is, and every side effect:
demo data created in the dev database (emails, organization), ElevenLabs characters used, dev server
restarts, files left behind. Offer cleanup of the demo data rather than doing it silently, and do not
commit or open a PR unless asked.

## References

- `references/storyboard-and-recording.md`: storyboard schema, graphic types, how to add a recording
  stage or a motion graphic, the reel's timing model.
- `references/troubleshooting.md`: selectors that bit before, stale servers, render and worker pitfalls.

## Projects, Gemini voice and long tutorials

- The engine takes `--project <dir>`; a second project (`kurikulum`) lives next to `demo`. See `tools/promo-video/README.md`
  ("Projects") for the stage order, the new scene types (`anatomy`, `list`, `compare`), `cuts`, `callouts` and the Gemini
  voice provider (`project.json`, `GEMINI_API_KEY`, style in the `speech_metadata` annotation).
- Never run cleanup against the shared development database without the user's go-ahead; the auto-mode classifier blocks it
  and the user chose to leave old demo resources in place.
- Render long videos with `scripts/render-remote.sh`; check `tailscale status` first, because the PC may be offline and
  the VPS disk is too small to render locally.

