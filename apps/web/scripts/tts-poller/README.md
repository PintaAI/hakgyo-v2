# Question bank TTS poller

Speaks question bank audio with VoxCPM2 on the GPU PC (`gpu-worker`, Tailscale only). See
`docs/eps-question-generator.md` section 6.

```text
Hakgyo (Vercel)  ◀── claim / uploads / complete / fail ──  poll.ts on the VPS (every 5 min)
                                                                  │ gpu-run (workspace "hakgyo-tts")
                                                                  ▼
                                                   PC: run.sh → voxcpm_tts.py → mp3
```

- Vercel cannot reach the PC, so the VPS pulls jobs with `TTS_WORKER_SECRET` (same value in Vercel
  and on the VPS).
- When the PC is off, `poll.ts` exits quietly and jobs keep waiting. After two hours the hourly
  GitHub workflow `.github/workflows/tts-fallback.yml` has OpenAI speak them (WAV). Staff can also
  press "Buat dengan cloud sekarang" on `/superadmin/bank`.
- The two voices (`M`, `F`) are designed from the descriptions in `src/lib/tts-clips.ts` the first
  time and kept as `voices/voice-*.wav` in the worker workspace, so every question uses the same
  voices. No real person is cloned.

## Files

| File             | Runs on | What it does                                                          |
| ---------------- | ------- | --------------------------------------------------------------------- |
| `poll.ts`        | VPS     | claims jobs, runs the worker, uploads the mp3 files, completes jobs   |
| `poll-lib.ts`    | VPS     | pure helpers (tested in `poll-lib.test.ts`)                           |
| `run.sh`         | PC      | installs VoxCPM2 once, speaks `jobs.json`, encodes mp3, packs results |
| `voxcpm_tts.py`  | PC      | VoxCPM2 with the two designed voices                                  |

## Setup (founder, on the VPS)

These commands are not run automatically. Run them as the user that has `gpu-run` working
(`gpu-run status` must show the worker).

1. Set `TTS_WORKER_SECRET` in Vercel (Production) and redeploy:

   ```bash
   openssl rand -hex 32   # use the output as the value
   ```

2. Store the same value for the poller:

   ```bash
   mkdir -p ~/.config/hakgyo
   cat > ~/.config/hakgyo/tts-poller.env <<'ENV'
   HAKGYO_URL=https://hakgyo-v2.vercel.app
   TTS_WORKER_SECRET=<the value from step 1>
   ENV
   chmod 600 ~/.config/hakgyo/tts-poller.env
   ```

3. Try one run by hand (with the PC on and a job queued from `/superadmin/bank`):

   ```bash
   cd /root/projects/hakgyo-v2/apps/web
   set -a && . ~/.config/hakgyo/tts-poller.env && set +a
   bun scripts/tts-poller/poll.ts
   ```

   The first run installs VoxCPM2 on the PC and designs the two voices (several minutes).

4. Run it every 5 minutes with a systemd timer (replace `dev` with your user):

   ```bash
   sudo tee /etc/systemd/system/hakgyo-tts-poller.service >/dev/null <<'UNIT'
   [Unit]
   Description=Hakgyo question bank TTS poller
   After=network-online.target tailscaled.service

   [Service]
   Type=oneshot
   User=dev
   WorkingDirectory=/root/projects/hakgyo-v2/apps/web
   EnvironmentFile=/home/dev/.config/hakgyo/tts-poller.env
   ExecStart=/usr/local/bin/bun scripts/tts-poller/poll.ts
   TimeoutStartSec=45min
   UNIT

   sudo tee /etc/systemd/system/hakgyo-tts-poller.timer >/dev/null <<'UNIT'
   [Unit]
   Description=Run the Hakgyo TTS poller every 5 minutes

   [Timer]
   OnBootSec=2min
   OnUnitActiveSec=5min

   [Install]
   WantedBy=timers.target
   UNIT

   sudo systemctl daemon-reload
   sudo systemctl enable --now hakgyo-tts-poller.timer
   journalctl -u hakgyo-tts-poller.service -f   # watch a run
   ```

   Check that the paths match: `which bun`, the checkout location, and the env file location.

## Manual end-to-end check

1. On `/superadmin/bank`, draft an L4 question with AI (it has a script), then press
   "Buat audio (PC)". The row shows "Audio menunggu PC".
2. With the PC on, wait for the timer (or run `poll.ts` by hand). The row shows "Audio sudah dibuat
   (PC)", and the question in the editor has the prompt clip and four option clips.
3. Listen to every clip: natural Korean, numbers spoken correctly, and 연음 (liaison).
4. With the PC off, queue another question and wait more than two hours. The hourly fallback
   speaks it with OpenAI, and the row shows "(cloud)".
