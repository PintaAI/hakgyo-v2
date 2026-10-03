# Hakgyo promo video tools

Code that produces Hakgyo's marketing videos:

- `demo/`: a ~6 minute 1080p product walkthrough with Indonesian voiceover. It combines
  Playwright screen recordings of the real app with motion graphics.
- `reel/`: a vertical 9:16 promo reel built from the landing page design.

Everything here is **standalone**. It is not a workspace package, so it does not take part in
`bun install`, `turbo`, lint, typecheck, build or CI, and it never touches `bun.lock` at the
repository root.

## Isolation

- `workspaces` in the root `package.json` is `apps/*` and `packages/*`; `tools/` is outside it.
- It has its own `package.json` and `bun.lock`. The only dependency is `playwright-core`.
- It reads from the repository, and never writes to it: the logo (`apps/mobile/assets`), app
  screenshots (`apps/web/public/images/landing`), the Geist font and Lucide icons (installed
  packages), and `ELEVENLABS_API_KEY` from `apps/web/.env`. The key is read only when a
  voiceover line has to be generated and is never copied.
- Recording drives the **shared development server** through its UI (`DEMO_BASE_URL`, default
  `https://jennie-linux.tail2268a1.ts.net`), so it creates demo data there (accounts, an
  organization, a course, a payment). No code or schema is changed.
- Not committed (see `.gitignore`): recordings (`demo/clips`), voiceover audio (`vo/`), renders,
  fonts and generated icons, and anything holding cookies or invite tokens
  (`demo/state.json`, `demo/auth-*.json`).

## Requirements

Bun, Google Chrome, ffmpeg, Python 3 with `numpy` and `scipy`. An NVIDIA GPU is optional (NVENC
encoding). On Windows use `py` in place of `python3`.

```bash
cd tools/promo-video
bun install
bun run setup        # fonts, icons, logo, screenshots; needs `bun install` in the repo root
```

## Demo pipeline

`demo/storyboard.json` is the single source: chapters, and one entry per beat with its voiceover
text and its visual (a motion graphic, or a range of a recording between two named marks).

1. **Record** the screens, one stage at a time, in this order:
   `org, course, price, cohort, payments, invite, learner, verify, paid, joins, catalog`
   (`bun demo/record.mjs <stage>`). Each stage writes `demo/clips/NN-name.mp4` plus a `.json`
   with timed marks. Stages share state through `demo/state.json`; start with a fresh one.
2. **Camera**: `bun run demo:camera 01-org 02-course ...` writes `clips/*.cam.json`. The camera
   holds a framing for at least 3 seconds and only moves when the work moves to another part of
   the screen, with slow eased moves and at most 1.25x zoom.
3. **Voiceover**: `bun run demo:voiceover` (ElevenLabs, model `eleven_v4`, language `id`). Lines
   are cached in `demo/vo/` by a hash of their text, so only edited lines use quota. On the free
   plan only the premade voices work over the API; the default is Jessica.
4. **Build**: `bun run demo:build` (or `demo:build:nvenc`) renders the video in resumable
   20-second chunks, builds the soundtrack and writes `demo/hakgyo-demo.mp4`.

Scenes stretch to the length of the voiceover, so editing a line never needs retiming. After any
change to the storyboard, voiceover or clips, delete `demo/parts/` before building, because
finished chunks are reused.

`bun run demo:stills 12.5,90` renders single frames to `demo/stills/` for a quick look.

## Projects

The engine in `demo/` (`compose.html`, `render.mjs`, `make.mjs`, `camera.py`, `voiceover.py`, `audio.py`) works on a
project folder passed as `--project <dir>` (default `demo`). A project holds its own `storyboard.json`, `project.json`
(voice settings), `clips/`, `vo/`, `vo_timing.json` and a recorder.

- `demo`: the ~6 minute product walkthrough (ElevenLabs voice).
- `kurikulum`: a ~12 minute tutorial on building a kurikulum (course), with the Gemini voice "Leda".
  Record one stage at a time, in this order (`bun kurikulum/record.mjs <stage> [--dry]`):
  `create, settings, structure, materi, kosakata, tugas, pdf, library, publish, learner`.
  Then `python3 demo/camera.py --project kurikulum 01-create ... 10-learner`,
  `python3 demo/voiceover.py --project kurikulum`, and `bash scripts/render-remote.sh kurikulum`.

Storyboard additions used by `kurikulum`: scene types `anatomy`, `list`, `compare`; `intro`/`outro`/`chapter` read their
texts from the storyboard; a clip can list `cuts` (pairs of marks to skip, for example while waiting for an AI reply) and
`callouts` (a pill shown when a spoken word is reached).

Voice providers are chosen in `project.json`: `elevenlabs`, or `gemini` (Interactions API, model
`gemini-3.8-flash-tts`, key `GEMINI_API_KEY`). Gemini returns no timestamps, so word timing comes from a Whisper
transcript aligned to the script (needs `OPENAI_API_KEY`). The style prompt must go in the `speech_metadata`
annotation; text in `text` is read aloud verbatim.

Recording notes: the learner stage cannot be repeated on the same course (progress persists), and the learner lesson
pages stall the screen recorder, so that clip only shows the course page. Recordings never delete library items; old
demo resources stay in the shared development database.

`scripts/render-remote.sh <project>` stages only what a render needs (no cookies or state) and renders on the GPU worker,
leaving the video in its `/output` folder.

## Why CPU rendering

Each frame is a Chrome page screenshot piped into ffmpeg (11,443 frames). Measured on a 16 thread
PC with an RTX 4080 SUPER running the worker in Docker/WSL2, one page, per frame:

| Scene                    | Share of frames | Chrome on CPU | Chrome on GPU |
| ------------------------ | --------------- | ------------- | ------------- |
| Desktop screen recording | 55%             | 111 ms        | 513 ms        |
| Phone screen recording   | 11%             | 105 ms        | 113 ms        |
| Graphics only            | 34%             | ~76 ms        | ~58 ms        |

GPU rasterization is slower for the large cropped video scenes, so across the whole video it would
be about 3.2x slower. Using it only for graphics scenes saves about 6%, which is not worth the extra
complexity. So the defaults are: Chrome on the CPU (`--gpu` is opt-in), parallel pages
(`--jobs`), and NVENC (`--encoder nvenc`) only for the final encode. A full render takes about
8 minutes on that PC and about 55 minutes on a 4 core VPS. Replacing the `<video>` elements with
pre-extracted frames has not been tried.

`demo/perf/` has the profiling script and the Chrome flag probe used for these numbers.

## Rendering on another machine

Copy this whole folder, including the ignored `demo/clips`, `demo/vo`, `demo/vo_timing.json` and
`demo/assets` (run `bun install` there instead of `bun run setup`), then `bun run demo:build`.
Set `CHROME_PATH` if Chrome is not found. If a render stops, run the same command again and it
resumes from the finished chunks.

### Keeping the video on the render machine

A finished video is 200+ MB and a remote link can be slow (one download crawled at 350 KB/s), while
the person who wants the file is usually sitting at the render machine. So do not pull it back. With the
private GPU worker, leave out `--out`, copy the result to the worker's `output` folder, and verify it in
place; only a tiny report and two contact sheets travel back:

```bash
gpu-run --dir tools/promo-video --workspace hakgyo-promo -- \
  'bun install && rm -rf demo/parts && bun demo/make.mjs --jobs 8 --encoder nvenc && cp demo/hakgyo-demo.mp4 /output/'
gpu-run --dir tools/promo-video --workspace hakgyo-promo \
  --out demo/verify/report.txt --out demo/verify/sheet-even.jpg --out demo/verify/sheet-times.jpg -- \
  'bash demo/perf/verify-render.sh hakgyo-demo.mp4 30 120 300'
```

`/output` is the `output` folder next to the worker's `docker-compose.yml` on that machine. The
workspace also keeps the file, so it can be copied later with
`docker cp gpu-worker:/data/workspaces/hakgyo-promo/demo/hakgyo-demo.mp4 <destination>`.

## Reel

```bash
python3 reel/voiceover.py                   # writes reel/vo_timing.js
bun reel/render.mjs                         # frames in reel/frames, cues in reel/cues.json
python3 reel/audio.py                       # reel/soundtrack.wav
D=$(python3 -c "import json;print(json.load(open('reel/cues.json'))['duration'])")
ffmpeg -framerate 30 -i reel/frames/%04d.jpg -i reel/soundtrack.wav -c:v libx264 -preset slow \
  -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -t $D -movflags +faststart reel/hakgyo-reel.mp4
```
