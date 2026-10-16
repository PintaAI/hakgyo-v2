# Guide videos (`tools/promo-video/guide-videos/`)

Short 16:9 intros for the in-app guide (`apps/web/src/components/user-docs/<audiens>/NN-[Icon]-<slug>.md`),
one project per guide page: `guide-videos/<audiens>-<slug>/`. The recorder helpers are in `guide-videos/lib/rec.mjs`.
These rules come from making the first 18; each one fixes a problem that cost real time.

## Order of work for one video

1. **Probe before writing the recorder.** `bun guide-videos/lib/probe.mjs <kind> /tmp/probes/x.mjs` dumps the
   visible controls of the pages the video will show. Labels differ from the guide often, CSS uppercases text, and
   settings open as dialogs rather than pages.
2. **Storyboard and voice.** Narration in the guide's words ("murid", "kelas", "kurikulum", "tugas"); "Anda" for
   teachers, "kamu" for students. Keep each line long enough for its actions (see "late by" below).
3. **`bun pv.mjs record <p>`.** It runs on the PC (its own dev server on the checked-out branch) or here when the
   PC is off. Read every `late by …` line: the clip will be sped up (the video then shows a "1.5×" badge).
   Fix by typing less (`delay`), waiting less, or lengthening the line, then record again.
4. **`bun pv.mjs prep <p>`.** Adds the recorded page-load cuts to the storyboard by itself, then camera + stills.
   Look at every sheet.
5. **`bun pv.mjs lint <p>`.** Fix every ✗. Each ⚠ is either fixed or named in the report (an English label in the
   app, a guide label the app calls something else).
6. **`GPU=1 bash guide-videos/lib/finish.sh <name>`**, then `bun pv.mjs lint <p>` again: it now also checks the
   file against the brief (H.264/AAC 1920×1080, under 25 MB, 45–90 s, -14 LUFS, a 1280×720 poster).

## Writing `record.mjs`

- **Find controls with `s.find("Label")`**: any role, any case, whitespace-tolerant; a RegExp for alternatives
  (`s.find(/^(Murid|Siswa)$/)`), `{ role: "menuitem" }` or `{ within: dialog }` to narrow it. Exact Playwright
  locators broke on uppercase text, on headings that looked like buttons and on labels that differ by branch.
- **Check the starting state with `s.require(locator, "why")` before `s.roll()`.** A rerun found "Kerjakan ulang"
  where the narration said "Mulai tugas", and a used flashcard set had 4 cards instead of 5.
- **One student account per video: `const kind = await g.learner("<slug>")`** in an off-camera stage. It signs up
  `contoh.panduan.<slug>@hakgyo.test` and joins the free class through a one-time invite. Sharing one student
  between videos leaked attempts, progress and notifications from one video into the next.
- **Wrap what can't be undone in `s.irreversible("label", fn)`** (publish, grade, pay, close an event): `--dry`
  skips it. `--dry` still performs every other action, so dry-run data needs test names and cleanup.
- **Log data with `g.created("what", "where")`.** It lands in `guide-videos/CLEANUP.md`. Never delete data you did
  not create, and ask before any cleanup.
- Use `s.nav` / `s.cut` around every page load, so the wait is cut out instead of shown.
- When a stage fails, the error lists what on screen is closest to the label it looked for (with "CSS uppercase",
  "inside a dialog" or an `aria-label`), and `/tmp/promo-video-debug/<project>-<stage>-FAILED.txt` lists
  everything visible. Read those before guessing a new selector.

## Safe limits (enforced by the tools)

- One heavy `pv` command at a time (`record`, `camera`, `check`, `prep`, `render`): a second one waits for the
  first. Parallel recordings and renders ran the VPS out of memory twice.
- Work that falls back to the VPS waits for 1.5 GB of free memory (2 GB for a render); `--force` skips the wait.
- Oversized renders are shrunk on the PC (`MAX_MB`), never re-encoded here.
- A stage that forgets to close its browser no longer hangs until the 15-minute stage timeout.
- On the PC, a job that starts a long-lived process must detach it fully (`setsid -f … > log 2>&1 < /dev/null`),
  or the worker stays busy after the job ends.
