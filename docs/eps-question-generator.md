# EPS-TOPIK question bank and package generator

Status: **design agreed with the founder (2026-10-27), in progress**. Steps 1–5 are done: taxonomy
(`packages/shared/src/eps-taxonomy.ts`) and blueprint (`packages/shared/src/eps-blueprint.ts`), shared
system assets for assessments, the bank and its review queue (`/superadmin/bank`), AI drafts with
automated checks and pictures (`apps/web/src/server/bank/`), and TTS jobs with the VPS poller
(`apps/web/scripts/tts-poller/README.md`). It builds on the EPS-TOPIK
simulation (`docs/eps-topik-simulation.md`) and needs its tags (step 8) and question groups (step 9)
first. The exam format, the question-type taxonomy (R1–R13, L1–L12) and the 40-question blueprint
are in `docs/research/eps-topik-question-patterns.md`.

## 1. Product model

Hakgyo sells a machine that keeps improving, not static packages:

```text
Question bank (Hakgyo)  +  Blueprint (40 ordered slots)
            └──► Generator ──► Package (pemantapan) in an LPK ──► learners take it
                                                          │
            ◄──── per-question statistics flow back ──────┘
```

- **Bank:** original questions owned by Hakgyo, each labelled with type (`eps:R1` … `eps:L12`),
  topic and difficulty.
- **Blueprint:** the recipe of one package (slot → type, difficulty mix, topic quota).
- **Generator:** fills every slot from the bank and saves the result as a package.
- **Package:** a fixed set the LPK uses for one pemantapan round, shared by all its classes so
  rankings across classes are fair. Its scores feed the readiness report.
- **Practice by type** (latihan per tipe): random questions from the same bank, for drilling. Not
  used for readiness reports. For LPK learners first; direct sales to individual learners later.
- **Feedback loop:** when an event closes, answers are traced back to the bank question they came
  from. Bad questions are retired, difficulty labels are replaced by measured values, and packages
  become more equivalent over time.

Three invariants:

1. Every package passes the blueprint (same order and composition as the real exam).
2. A package that learners have taken never changes.
3. Every package question remembers its bank question.

"Unlimited" means unlimited combinations; unique questions are bounded by the bank, which keeps
growing. Packages may reuse questions (see 4.2).

## 2. Taxonomy and blueprint (code, not tables)

- A taxonomy file in `@hakgyo/shared` describes the 25 types once: code, Indonesian name, Korean
  instruction, required media, distractor rules, difficulty criteria and 2–3 **original** examples
  (never HRDK items; HRDK material is KOGL Type 3, no derivatives). The same file is the "reference
  card" given to the AI writer (section 6).
- Blueprints are versioned data in `@hakgyo/shared` (for example `eps-topik@2025.1`): ordered slots
  per section, target difficulty per slot (about 7 easy, 8 medium, 5 hard per section), a topic
  quota (40–50 % work, K3 and institutions) and alternative slots for variation (for example slots
  19–20: two R11 questions, or one R12 shared-passage group in about one package out of three).
- The editor's blueprint check (EPS simulation step 10) reads the same blueprint.

All 25 types are `SINGLE_CHOICE` questions; they differ only in content and media. The capabilities
they need come from the EPS simulation plan: tags, the 2×2 picture grid, question groups and the
audio policy.

## 3. Data model

Existing assessment tables are reused: the bank is an assessment in the Hakgyo system
organization, a package is an assessment in the LPK. Grading, events, mobile offline and reports
keep working without a new path.

```prisma
enum AssessmentKind { STANDARD  BANK  GENERATED }
enum BankItemStatus { DRAFT  REVIEW  LIVE  RETIRED }

model Assessment {
  kind          AssessmentKind @default(STANDARD)
  contentLocked Boolean        @default(false)
}

model AssessmentQuestion {
  sourceQuestionId String?          // the bank question this copy came from
  bankStatus       BankItemStatus?  // bank questions only
  @@index([sourceQuestionId])
}

model AssessmentQuestionGroup {
  sourceGroupId String?
}

model AssessmentGeneration {         // one per generated package
  assessmentId     String  @id
  organizationId   String
  blueprintKey     String           // "eps-topik"
  blueprintVersion String           // "2025.1"
  seed             String
  picks            Json             // slot → bank question or group, plus the swap history
  createdByUserId  String
  createdAt        DateTime @default(now())
}

model BankItemStats {                // derived, recomputable from answers
  questionId     String  @id        // bank question
  attempts       Int
  correctRate    Float
  discrimination Float?
  optionRates    Json
  computedAt     DateTime
}
```

- Tags carry type, difficulty and topic: `eps:R2`, `level:sedang`, `topik:k3` (plus the optional
  `bab:<n>` from the simulation plan).
- **Packages are copies, not references.** Answers point at concrete question rows
  (`onDelete: Restrict`), every reader (grading, review, mobile bundle) reads questions from their
  own assessment, swaps are manual, and option order is rebalanced on copy. The seed in
  `AssessmentGeneration` is an audit record, not a substitute for the copy.
- **Bank questions are never deleted**, only `RETIRED`, so `sourceQuestionId` and statistics stay
  valid. The generator only picks `LIVE` questions.
- **`contentLocked` must hide answer keys server-side.** LPK staff can use, schedule and swap
  questions in a locked package, but every authoring read and export must refuse or strip
  `isCorrect` and explanations for locked content. This replaces the "licensed assessment" idea in
  section 4.7 of the simulation design.
- Usage per LPK needs no table: it is a query over copies with `sourceQuestionId` in that
  organization's `GENERATED` assessments.
- New columns must be mirrored where the simulation design says (draft payload, duplicate, clone,
  content-db).

### 3.1 Shared system assets

Package media is not copied. Assets of the Hakgyo system organization can be marked shared and
referenced by any organization.

- `Asset.sharedAt DateTime?`: set only by Hakgyo (superadmin or bank authoring).
- Link tables get `assetOrganizationId` (the asset owner); the composite foreign key moves to
  `(assetId, assetOrganizationId)`. Services allow `assetOrganizationId ≠ organizationId` only when
  the asset is shared. Start with `AssessmentAsset`; `MaterialAsset`, vocabulary audio and images
  can follow the same pattern (a future "Pustaka media Hakgyo" for teachers).
- Migration in three steps so running code keeps working: add the column and backfill it from
  `organizationId` (new rows default to the same value), ship the code that writes it and accepts
  shared assets, then move the foreign key and make the column required. Existing data keeps
  `assetOrganizationId = organizationId` and behaves exactly as today, including assessments placed
  in course curricula. Starter courses already cloned keep their copied files.
- Code touch points: attaching assets (`assessment/authoring.ts`, `content/material-references.ts`)
  accepts own or shared assets; `findDownloadableAssets` in `routers/storage.ts` lets any signed-in
  user download a shared asset (media carry no answer keys); deletion never removes a shared asset
  that is still referenced; the mobile bundle needs no change.
- Shared assets are immutable: replacing one means uploading a new asset.

## 4. Generator

### 4.1 Building one package

Input: LPK, blueprint version, seed, options.

1. Collect candidates per slot: `LIVE` bank items with the slot's type tag. A group (shared
   passage or audio) is one item that fills consecutive slots.
2. Exclude only duplicates inside the same package and items too similar to one already picked
   (same template or key vocabulary).
3. Score candidates: prefer items this LPK has used least or longest ago, items with low global
   exposure, and items whose difficulty matches the slot target.
4. Weighted random pick with the seed (the same seed and bank give the same package).
5. Check the whole package: difficulty mix, topic quota, no three same-topic questions in a row, no
   answer leaking into another question. Repair locally by swapping the worst slot, with a bounded
   number of attempts.
6. Rebalance answer positions on copy (about 5 per option per section).
7. Write in one transaction: the assessment with sections and groups, copied questions with tags,
   `sourceQuestionId` and 2.5 points, links to shared assets, and the `AssessmentGeneration` record.

When a type runs short the generator says so ("Bank L2 hanya punya 3 soal"), and staff can accept
reuse.

### 4.2 Reuse policy

Reuse is allowed. The generator prefers questions the LPK hasn't seen, but never refuses older
ones; the only hard rule is no duplicate inside one package. Variety grows with the bank.

### 4.3 Swapping a question

"Ganti soal no. 14" reruns steps 1–6 for that slot only, with the same type and the closest
difficulty. Swaps are allowed until the first attempt; after that the package is frozen and a
change means a new package.

### 4.4 Who generates

- Pilot: the Hakgyo team, from superadmin, for each LPK.
- Product: LPK owners and admins, and teachers when an organization setting allows it (like
  `teacherCanCreateCourse`), within the subscription quota.
- LPKs cannot pick a difficulty level yet (standard only) until calibration data exists.

## 5. Statistics and calibration

When an event closes, recompute `BankItemStats` for the bank questions it used: join answers →
package question → `sourceQuestionId`. No cron. The computation can share code with the staff item
analysis in the simulation plan (section 5.8). Flags: correct rate below 0.3 or above 0.9,
discrimination below 0.2, distractors picked by under 5 %. A weak question in a group flags the
whole group. Later, the generator targets an equal mean difficulty per package so scores are
comparable across packages and LPKs.

## 6. Bank production (superadmin)

Production runs in a superadmin area, not in LPK workspaces.

```text
Maintainer form: type · count · keywords · level · book chapter / grammar point
  → reference card for the type (taxonomy file)
  → AI drafts (structured output) → automated checks → bank: DRAFT
  → media: images · document templates · TTS
  → review by the founder → LIVE
```

- **AI drafts** follow the pattern of `server/ai/assessment-extraction.ts`: `loadAiSdk()` from
  `server/ai/sdk.ts`, zod structured output, about five questions per call to stay within function
  limits. Output: prompt, four options, key, Indonesian explanation, a media brief, and tags. Never
  put HRDK items in prompts. Pick the model after a 20-question trial with two models.
- **Automated checks** before review: schema and one key, similar option lengths, key position
  spread, similarity against the bank (`pg_trgm` is installed), vocabulary within the keywords and
  level, and a second model that answers each question blind; a mismatch or two plausible answers
  flags the question.
- **Review:** the founder reviews the Korean (particles, numbers, naturalness) and every image
  before a question goes `LIVE`.
- **Production lanes:** text-only types (R4, R6, R8–R11, L4, L5, L8, L9 scripts) need only AI;
  template types (R5 documents, R7 charts, L6 prices and dates, L1 minimal pairs) get images from
  scripts with AI-written fictional data; illustrated types (R1, R2, R13, L2, L3, L7) use the
  existing OpenAI image call in `server/ai/course-thumbnail.ts` in edit mode with character and
  style reference sheets, so the four pictures of an L2/L3 item stay consistent. Illustrations are
  the bottleneck (about 29 per package); reusable parts live as shared assets.
- **TTS:**
  - Primary: VoxCPM2 (Apache-2.0 weights, Korean) on the founder's PC through `gpu-worker`
    (`/root/projects/gpu-worker`, Docker, RTX 4080 Super, reachable only over Tailscale). The
    existing integration is `/root/projects/hakgyo-video/render/tts.py` and `hv voicelab`.
  - Two fixed designed voices (adult male and female, standard Seoul), created with VoxCPM2 voice
    design, so no real person's voice is cloned.
  - Vercel cannot reach the PC, so a poller on the VPS (always on, inside the tailnet) fetches
    pending TTS jobs from an internal endpoint guarded by a secret about every 5 minutes, runs them
    on the worker, uploads to R2 and marks them done. Questions wait in `DRAFT` while the PC is off.
  - Fallback: OpenAI TTS through the existing AI SDK (`generateSpeech`, `@ai-sdk/openai`
    `gpt-4o-mini-tts` with style instructions), used when a job waits about 2 hours or when staff
    press "Buat dengan cloud sekarang" (runs on the server, works even when the VPS is down).
    ElevenLabs (key already in `env.js`, can clone our designed voices) is an optional later
    fallback if voice differences bother users.
  - One provider per question (prompt, dialogue and option clips). Each asset records provider and
    voice; fallback audio can be regenerated with VoxCPM2 later.
  - Show "Audio dibuat dengan suara AI" on the pemantapan info screen (required for OpenAI voices,
    true for all).
  - Test Korean numbers and liaison (연음) on every provider before use.

## 7. Capacity

| Target               | Bank size           | Largest racks          |
| -------------------- | ------------------- | ---------------------- |
| Pilot, 3 packages    | about 120 questions | R8: 18, L2: 12, L4: 12 |
| Product, 10 packages | about 400 questions | R8: 60, L2: 40, L4: 40 |

## 8. Order of work

After EPS simulation steps 8 (tags) and 9 (groups):

1. Taxonomy and blueprint data in `@hakgyo/shared`; the editor blueprint check uses it.
2. Shared system assets (section 3.1), starting with `AssessmentAsset`.
3. Bank kind and status, superadmin bank area, review queue.
4. AI draft service, automated checks, image generation.
5. TTS jobs, the VPS poller with `gpu-worker`, the OpenAI fallback.
6. `sourceQuestionId`, `AssessmentGeneration`, the pure selection engine with seeded tests, package
   creation with preview and `contentLocked`.
7. Swap, then `BankItemStats` at event close.

## 9. Open items

- Rights after an LPK stops subscribing: proposed read-only access to past packages and results,
  no new pemantapan.
- Whether today's UBT still uses a shared passage for two questions (being checked in the LPK
  interviews).
