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
- The GPU worker's `/output` once looked fine but was a 125 MB VM disk (`df -h /output`), because the
  bind mount pointed at a drive Docker Desktop could not see. The Windows folder stayed empty and a
  229 MB copy failed with "No space left on device". Check `df -h /output` and the mount source in
  `/proc/self/mountinfo` before relying on it, and remove any partial file the failed copy left.
