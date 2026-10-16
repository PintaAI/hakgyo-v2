# Troubleshooting

Each entry is a failure that cost time before.

## Recording selectors

- `getByRole("button", { name: "Buat akun" })` matched two elements (the mode toggle and the submit
  button). Scope it: `page.locator("form").getByRole("button", ...)`.
- Switches render a visible `<span role="switch">` plus a hidden `<button>` with the same
  `aria-label`. Target `[role="switch"][aria-label="..."]`, not `getByLabel`.
- Date fields are popover calendars, not inputs: `fill()` fails. Open the field, click the day, then
  close the popover by clicking text inside the dialog.
- Dialog submit buttons share names with the button that opened them. Scope to
  `page.getByRole("dialog")`.
- "Link sekali pakai" is on by default and locks the maximum uses to 1. Turn it off for a class link.
- A brand new account lands in the learner area ("Belum ada course"), not onboarding, because every
  new account is enrolled in Hangeul Mastery. The founder path is the user menu, "Buat organization".
- A new group belajar is `Persiapan` (draft). It must be set to `Dibuka` before invites, checkout or
  the catalog work. Price is not in the create dialog; it is in Pengaturan.
- Playwright `waitForURL` after sign-up: the destination depends on the account, so wait for a URL
  pattern, not a fixed page.

## Servers and data

- Payment screens crash with `Cannot read properties of undefined (reading 'findUnique')` when the dev
  server was started before `bun run --cwd apps/web db:generate`. Regenerate and restart the dev server,
  which is shared: tell the user first.
- After pulling main, `bun install` may be needed (a new dependency broke the typecheck once).
- Recording creates accounts, an organization, a published course and an approved payment in the
  shared dev database. Report them. Deleting a partial course is possible through the app's own
  `course.delete` while signed in as the owner; do not delete anything else.

## Voiceover

- Library voices return `402 paid_plan_required` on the free plan. Use premade voices.
- A voice speaks slower than a fast edit. Do not speed the audio up to fit a scene; lengthen the scene
  (the timeline already does) or shorten the line.
- Changing the model, voice or voice settings changes every cache key and regenerates all lines.

## Rendering

- Empty or missing `vo_timing.json`/clips make `compose.html` throw during `init`; the render prints
  `pageerror` and then `window.seek is not a function`. Read the first error, not the last.
- The same recording used by two separate shots needs two `<video>` elements; the compositor already
  does this, and it waits for a presented frame (`requestVideoFrameCallback`) after each seek.
  Removing that wait gives blank frames at scene changes.
- A render that "finished" with the client still running may only be downloading the result. Check the
  worker job status and the file size before assuming a hang. The downloader uses `curl` for this reason.
- `parts/` holds finished 20 second chunks and is reused. After any change to the storyboard,
  voiceover, clips or `compose.html`, delete it or you will get a mix of old and new frames.
- On Windows use `py` for Python; the build script tries `python`, `python3` and `py`.
- Chrome inside the Docker worker renders with SwiftShader (CPU). That is the fast path for this
  video; `--gpu` is slower on the screen-recording scenes.
- `gpu-run` printing "The operation timed out" and exiting does not mean the job failed: a busy
  worker (the PC is also in use for other things) can miss the log poll. Check `gpu-run jobs`, read
  the log with `curl` on `/jobs/<id>/log`, and leave the job alone. A render that took 3 minutes per
  chunk once took 8 because the PC was in use; quote estimates from measured chunks.
- Slow transfers between the VPS and the worker come from the path between them, not from either
  internet line. On 2026-10-15 `gpu-run speedtest --internet` measured about 130 ms latency, 25-40
  Mbit/s to the PC and 47-65 Mbit/s back, while the PC's own line did about 80 Mbit/s each way and
  the VPS's was gigabit. The link speed also swung by 2x between runs. Parallel streams (several
  blobs at once, ranged downloads) did not help, so do not rewrite `gpu-run` for them; keep large
  files on the PC instead.
- The GPU worker's `/output` once looked fine but was a 125 MB VM disk (`df -h /output`), because the
  bind mount pointed at a drive Docker Desktop could not see. The Windows folder stayed empty and a
  229 MB copy failed with "No space left on device". Check `df -h /output` and the mount source in
  `/proc/self/mountinfo` before relying on it, and remove any partial file the failed copy left.
- On the VPS (4 cores, 7.9 GB) the shared Next dev server alone can hold ~3.6 GB. A recording's Chrome plus a
  local libx264 re-encode on top of it ran out of memory on 2026-10-15: the disk read ~500 MB/s, the system sat at 95%
  CPU, a recording hung and Gemini TTS timed out. Record and render one at a time, and check `vmstat 1` when everything
  suddenly gets slow. For a size limit, set `MAX_MB` on `scripts/render-remote.sh` (or `pv.mjs render`): an
  oversized render is re-encoded on the worker with NVENC, which takes seconds there instead of half an hour here.
- A gpu-worker job counts as finished only when every process holding its output pipe exits. A job that
  started the PC dev server in the background (`( ... & )` with the redirect inside) kept the worker busy
  after its script ended and blocked the queue until cancelled. Start long-lived processes with
  `setsid -f ... > log 2>&1 < /dev/null`, and use `pkill -f "[n]ame"` so the pattern cannot match the
  job's own shell.
