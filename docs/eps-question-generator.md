# EPS-TOPIK question bank and set generator

Status: **revised with the founder on 2026-10-28** (section 10). The bank is standalone system data
managed from `/superadmin/bank`, and organization owners and admins generate an EPS-TOPIK set soal
from it into their own library ("Buat set EPS-TOPIK"). The generated set is an ordinary assessment
of the organization. Built: taxonomy (`packages/shared/src/eps-taxonomy.ts`), blueprint
(`packages/shared/src/eps-blueprint.ts`), shared system assets, the bank with its editor and review
queue, AI drafts with automated checks and pictures (`apps/web/src/server/bank/`), TTS jobs with the
VPS poller (`apps/web/scripts/tts-poller/README.md`), and the seeded selection engine
(`apps/web/src/server/bank/selection.ts`) with set creation (`apps/web/src/server/bank/packages.ts`).
Statistics flowing back to the bank are postponed. It builds on the EPS-TOPIK simulation
(`docs/eps-topik-simulation.md`). The exam format, the question-type taxonomy (R1–R13, L1–L12) and
the 40-question blueprint are in `docs/research/eps-topik-question-patterns.md`.

## 1. Product model

Hakgyo sells a machine that keeps improving, not static packages:

```text
Question bank (Hakgyo system data)  +  Blueprint (40 ordered slots)
            └──► Generator ──► Set soal, an ordinary assessment of the LPK ──► learners take it
```

- **Bank:** original questions owned by Hakgyo, each labelled with type (`eps:R1` … `eps:L12`),
  topic and difficulty.
- **Blueprint:** the recipe of one package (slot → type, difficulty mix, topic quota).
- **Generator:** fills every slot from the bank and saves the result as a set soal in the LPK.
- **Set soal:** a copy the LPK owns: its staff can edit it, place it in the curriculum and use it for
  Latihan or Tryout like any assessment. Bank edits only reach sets generated afterwards.
- **Practice by type** (latihan per tipe): random questions from the same bank, for drilling. Not
  used for readiness reports. For LPK learners first; direct sales to individual learners later.
- **Feedback loop (postponed):** answers traced back to the bank question through
  `sourceQuestionId`, so bad questions can be retired and difficulty measured.

Invariants:

1. Every generated set passes the blueprint when it is created (same order and composition as the
   real exam). What the LPK changes afterwards is its own choice.
2. Every set question remembers the bank question it was copied from (a record, not a dependency).

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

The bank has its own tables, owned by no organization. A generated set is an ordinary assessment, so
grading, events, mobile offline and reports need no new path.

```prisma
model BankQuestion {
  id String @id; type AssessmentQuestionType; prompt Json; explanation Json?
  tags     String[]        // eps:R2, level:sedang, topik:k3
  status   BankItemStatus  // DRAFT → REVIEW → LIVE, or RETIRED
  meta     Json?           // origin, model, media brief, audio script, automated check flags
  groupId  String?; position Int   // a shared passage, picture or dialogue, in order
  options  BankOption[]; ttsJobs TtsJob[]; copies AssessmentQuestion[]
}
model BankOption { id; questionId; content Json; isCorrect Boolean; position Int }
model BankGroup  { id; instructions Json?; stimulus Json?; questions BankQuestion[] }

model AssessmentQuestion      { sourceQuestionId String? }   // FK BankQuestion, SetNull
model AssessmentQuestionGroup { sourceGroupId String? }      // FK BankGroup, SetNull
model AssessmentGeneration {   // one per generated set: blueprint version, seed, picks
  assessmentId String @id; organizationId String; blueprintKey String; blueprintVersion String
  seed String; picks Json; createdByUserId String; createdAt DateTime
}
```

- Tags carry type, difficulty and topic: `eps:R2`, `level:sedang`, `topik:k3` (plus the optional
  `bab:<n>` from the simulation plan).
- **Sets are copies, not references.** Answers point at concrete question rows, every reader
  (grading, review, mobile bundle) reads questions from their own assessment, and option order is
  rebalanced on copy. `AssessmentGeneration.picks` records what filled each number and the option
  order of each copy.
- Editing a LIVE bank question moves it back to REVIEW; only drafts can be deleted, other questions
  are retired. Deleting or retiring never touches sets already generated.
- Usage per LPK needs no table: it is a query over copies with `sourceQuestionId` in that
  organization's assessments.

### 3.1 Shared system assets

Set media is not copied. Bank pictures and audio are assets of the Hakgyo system organization, which
is only their technical owner (nobody is a member of it for the bank), marked shared and referenced
by any organization's sets.

- `Asset.sharedAt DateTime?`: set when a superadmin uploads bank media, or when AI pictures and audio
  are made. A superadmin may upload to the system organization without membership, and a system asset
  that a set still links is never deleted.
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

### 4.1 Building one set

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
7. Write in one transaction: an ordinary assessment created by the acting owner or admin, with the
   blueprint's sections and score bands, copied questions with tags, `sourceQuestionId` and 2.5
   points, links to shared assets, and the `AssessmentGeneration` record.

When a type runs short the generator says so ("Bank L2 hanya punya 3 soal") and the set cannot be
saved until the bank has enough.

### 4.2 Reuse policy

Reuse is allowed. The generator prefers questions the LPK hasn't seen, but never refuses older
ones; the only hard rule is no duplicate inside one package. Variety grows with the bank.

### 4.3 Changing a set

The set belongs to the LPK: its staff edit, replace or remove questions in the ordinary editor, under
the ordinary rules (no edits while it is live). A "replace with another bank question" action can
come later; the selection engine already supports picking for one slot.

### 4.4 Who generates

- Organization owners and admins, from Bahan ajar > Tugas ("Buat set EPS-TOPIK").
- Later: teachers when an organization setting allows it (like `teacherCanCreateCourse`), and a
  quota per subscription.
- LPKs cannot pick a difficulty level yet (standard only) until calibration data exists.

## 5. Statistics and calibration (postponed)

Planned: when an event closes, recompute per bank question the correct rate, discrimination and
option rates from the copies (`sourceQuestionId`), using the staff item analysis
(`analyzeItems` in `@hakgyo/shared`). Flags: correct rate below 0.3 or above 0.9, discrimination below
0.2, distractors picked by under 5 %. Since sets are editable, an edited copy must stop counting.
Later, the generator targets an equal mean difficulty per set.

## 6. Bank production (superadmin)

Production runs in a superadmin area, not in LPK workspaces: the bank list and review queue on
`/superadmin/bank`, and a bank editor per question (`/superadmin/bank/questions/<id>`) built from the
same pieces as the assessment editor.

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
7. Swap, then `BankItemStats` at event close (built, then removed by the revision below).
8. Revision (section 10): the standalone bank, the superadmin bank editor, generation by owners and
   admins, removal of the bank-as-assessment and locked-package code, then dropping the old columns.

## 9. Open items

- Rights after an LPK stops subscribing: proposed read-only access to past packages and results,
  no new pemantapan.
- Whether today's UBT still uses a shared passage for two questions (being checked in the LPK
  interviews).

## 10. Revision of 2026-10-28

The first build stored the bank as an assessment of the Hakgyo system organization and generated
locked packages from superadmin. That needed workarounds: the superadmin joined the system
organization to use the editor, database triggers kept bank assessments out of courses and public
quizzes, bank columns sat on every question, and locked packages hid keys in every staff read. The
founder replaced it with the model above: a standalone bank, ordinary editable sets, generation by
the organization's owners and admins, and statistics later. The old columns (`Assessment.kind`,
`Assessment.contentLocked`, `AssessmentQuestion.bankStatus`, `AssessmentQuestion.bankMeta`,
`TtsJob.questionId`, `BankItemStats`) and the bank triggers are dropped in a follow-up migration
once code that no longer uses them is deployed.
