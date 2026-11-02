# EPS-TOPIK demo set

An original 40-question EPS-TOPIK set (blueprint `eps-topik@2025.1`) with keys, Indonesian
explanations, pictures and audio, ready to inject into an organization for demos and public quizzes.
`eps-demo-set.json` is the result; its media live on R2 under `eps-demo-set/v1/`.

Run from `apps/web` with the environment loaded (`set -a; . ./.env; set +a`):

1. `content.ts`: the authored questions (key first; `layout.ts` moves keys to balanced positions).
   `templates.ts` holds the HTML of the rendered pictures (documents, chart, sign, dates, prices).
2. `bun scripts/eps-demo-set/verify-content.ts [--blind]`: blueprint, topic, key and explanation
   checks; `--blind` lets another model answer every question without the key.
3. `bun scripts/eps-demo-set/media.ts [--only q23,q37] [--force]`: makes changed media only (OpenAI
   pictures in the bank style, Chromium-rendered templates, OpenAI TTS checked with `whisper-local`),
   uploads them and records them in `media-manifest.json`. `AUDIO_MIN_SCORE` and `AUDIO_TAKES` tune
   the retake loop.
4. `bun scripts/eps-demo-set/build.ts`, then `bun scripts/eps-demo-set/verify-set.ts`: writes and
   checks `eps-demo-set.json` (media placeholders, R2 files, transcripts).
5. `bun scripts/eps-demo-set/inject.ts --organization <slug> [--replace] [--dry-run]`: creates the
   assessment. Media stay shared Hakgyo system assets linked with `AssessmentAsset`, like generated
   sets. `--replace` swaps an unused set of the same title (its public quiz goes with it).

Never put HRDK material or the taxonomy's style examples into `content.ts`.
