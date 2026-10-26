# EPS-TOPIK simulation: findings and design

Status: **design, awaiting approval**. Nothing in the schema or feature code has changed yet.

Goal: a Hakgyo Tryout that feels like the real EPS-TOPIK (UBT on a tablet) on web and mobile, works
offline on mobile, and reports results by section and by question type. The exam format, the
question-type taxonomy (R1–R13, L1–L12) and a 40-question blueprint are in
`docs/research/eps-topik-question-patterns.md` (Indonesian). This document maps the current
assessment stack, explains each gap and proposes general exam features with an "EPS-TOPIK preset"
on top. None of the logic is EPS-specific except the preset.

Format recap: 40 four-option questions, Reading 1–20 then Listening 21–40, 25 minutes each, 100
points (2.5 per question), sector floors 60 (manufacturing) and 45 (others). Listening audio plays
twice. The old CBT demo auto-advances listening about 7 s after the audio and locks answers once
chosen; that is **unconfirmed** for today's UBT, so both are settings, not hard-coded behaviour.

---

## 1. Current stack, end to end

### 1.1 Data model (`apps/web/prisma/schema.prisma`)

| Model                                    | Relevant fields                                                                                                                                                                         |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Assessment`                             | `instructions Json?`, `passingScore Int?` (percent), `maxAttempts`, `timeLimitMinutes Int?`, `shuffleQuestions`, `shuffleOptions`                                                       |
| `AssessmentQuestion`                     | `type` (`SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `WRITTEN`), `prompt Json` (BlockNote), `explanation Json?`, `points Int @default(1)`, `position Int` (`@@unique([assessmentId, position])`) |
| `AssessmentOption`                       | `content Json` (BlockNote), `isCorrect`, `position`                                                                                                                                     |
| `AssessmentAttempt`                      | `shuffleSeed`, `status`, `score Int?`, `maxScore Int?`, `startedAt`, `submittedAt`, `gradedAt`, `assessmentEventId?`, `cohortId?`                                                       |
| `AssessmentAnswer`                       | `content Json?` (written), `autoScore Int?`, `manualScore Int?`, `feedback`; selections in `AssessmentAnswerSelection`                                                                  |
| `AssessmentEvent`                        | `type` (`QUICK_ASSESSMENT` = Latihan, `TRYOUT`), `durationMinutes Int`, `shuffleQuestions Boolean @default(true)`, `opensAt`, `closesAt`, lifecycle timestamps                          |
| `AssessmentEventCohort` / `…Participant` | targets and participants; `invalidatedAt` on participants                                                                                                                               |
| `AssessmentEventAudit`                   | `SCHEDULED`, `OPENED`, `CLOSED`, `CANCELLED`, `COHORTS_ADDED`, `ATTEMPT_INVALIDATED`, `RESULT_ADJUSTED`                                                                                 |

There are no `Float` or `Decimal` columns anywhere in the schema.

### 1.2 Server (`apps/web/src/server/assessment/`)

- `order.ts`: deterministic seeded shuffle (`shuffleForAttempt`, `orderAssessmentQuestions`). The
  seed is `attempt.shuffleSeed`, set to a UUID at start.
- `timing.ts`: one deadline per attempt, `min(startedAt + minutes, event.closesAt)`, exclusive.
- `learner-view.ts`: `shapeLearnerAssessment` builds the learner payload for web and mobile. It
  orders questions, strips `isCorrect`/`explanation` until `shouldRevealAssessmentAnswers`
  (`result-policy.ts`) allows them, lets the event's `durationMinutes` override the time limit, and
  computes `attemptDeadline` for events.
- `learner-attempts.ts`: `startAttempt` (chapter attempts), `saveAnswers` (replace-per-question
  autosave, rejects when expired or the event is not `OPEN`, by **server time**), `submitAttempt`
  (grades even when expired and returns `expired`), `getMyAttempt`, `listMyAttempts`.
- `attempt.ts`: `gradeInProgressAttempt` (all-or-nothing per question, integer sums,
  `IN_REVIEW` when written questions exist), `isPassingScore` (percent), `autoSubmitEventAttempts`
  (grades in-progress attempts of a closed event from what the server has stored).
- `review.ts`: teacher grading of written answers (`manualScore` ≤ `points`, integer).
- `event-management.ts`, `event-lifecycle.ts`, `event-targets.ts`: create, schedule, open, close,
  cancel, targets and access. The cron grades leftovers after closing.
- `event-leaderboard.ts` / `event-ranking.ts`: best graded attempt per learner, ranked by score,
  completion time, submission time, user id; `percentage` is rounded.
- `authoring.ts`: question/option CRUD, `duplicateAssessment` (explicit field list). Questions are
  appended at `max(position) + 1`; **there is no reorder procedure**.
- `live-status.ts`: a scheduled or open event locks its assessment against edits.
- Routers: `routers/assessment.ts` (thin), `routers/assessment-event.ts` (1,271 lines; `startAttempt`,
  `adjustResult` and others hold logic inline), `routers/assessment-import.ts` (AI image import).

### 1.3 Teacher authoring (web)

- `components/assessment-editor.tsx` (≈3,000 lines) hosts settings ("Pengaturan tugas": nilai lulus,
  batas pengerjaan, batas waktu, acak soal, acak opsi), the question list ("Peta soal") and
  `QuestionEditor` (BlockNote prompt and options, points, explanation, autosaved). Points are
  validated as positive integers in the UI and in `inputs.ts`.
- Every assessment field is mirrored into the local content-db draft
  (`toAssessmentDraftPayload`, `lib/content-db/types.ts`), `duplicateAssessment` and
  `course/clone.ts`. **New columns must be added in all four places.**
- `components/assessment-event-create.tsx`: type, assessment, title, targets, start mode, duration
  presets, `closesAt`. There is no shuffle or exam setting and no edit after creation.
- MCP: `server/mcp/domain-actions.ts` exposes assessment CRUD and review. Schemas come from the tRPC
  zod inputs (`z.toJSONSchema`), so input changes flow to MCP automatically. There are no event tools.

### 1.4 Learner attempt on web

- Routes: `app/(learner)/learn/[courseId]/items/[courseItemId]/attempts/[attemptId]` renders
  `components/learner/assessment/assessment-attempt.tsx`; events go through
  `app/(learner)/learn/assessments/[eventId]`.
- One question at a time, free navigation (Sebelumnya/Berikutnya and the `QuestionNavigator` grid,
  whose `onSelect` can already refuse a move by returning `false`).
- Autosave through `assessment.saveAnswers`: dirty questions only, 3 s debounce, 30 s max wait,
  flushed on hide/unmount. At 0 s the timer auto-submits.
- Media is preloaded into Cache Storage (`lib/assessment-media-cache.ts`). `RichContent` remounts
  the BlockNote document per question (`key={JSON.stringify(blocks)}`), so audio state resets on
  navigation. The audio block (`editor/blocks/asset-media-block.tsx`) is a plain
  `<audio controls>`. React context reaches block renderers already (`asset-upload-context.tsx`,
  `pdf-book-context.tsx`), so an audio policy context is feasible.

### 1.5 Mobile attempt and offline sync

- Start is **online only**: `mobileSyncV2.startAssessment` / `startEventAssessment`, then the
  attempt detail (`assessment.getForCourseItem` with `attemptId`) is persisted so the attempt can
  resume offline.
- Screen: `apps/mobile/app/courses/[courseId]/items/[courseItemId]/attempts/[attemptId].tsx`. One
  question at a time, free navigation, question grid (`app/assessment-questions.tsx`). Drafts are
  kept in device storage (`hakgyo:attempt:v1:<userId>:<attemptId>`), **never sent during the attempt**.
- Timer: `AssessmentDeadline`, from `attemptDeadline` or `startedAt + timeLimitMinutes`. At 0 the
  inputs lock but **nothing auto-submits**; the learner taps "Kirim".
- Submit queues one outbox operation `ASSESSMENT_COMPLETED { attemptId, answers[] }` (no
  timestamps). `apply-operations.ts` replays it as `saveAnswers` + `submitAttempt`.
- Audio: `content-renderer/media.tsx` (`ContentAudio`/`AudioPlayer`, `expo-audio`), tap to load then
  auto-play once, unlimited replay, no callbacks.
- Options: vertical stack of full-width cards (`assessment-ui.tsx`).
- The course bundle (`server/mobile/course-bundle.ts`, `BundleAssessment` in
  `packages/shared/src/mobile-sync/types.ts`) never carries `isCorrect` or `explanation`. The
  bundle is only used for the pre-attempt view; the attempt uses the server's per-attempt payload.
  Answer keys never reach the device before results are revealed.

**Existing offline bug (affects every timed mobile attempt today).** Because answers reach the
server only at submit and `saveAnswers` checks the deadline with the server clock, a learner who
answers offline in time but syncs after the deadline gets `PRECONDITION_FAILED`; the operation is
retried and eventually dead-lettered. For events, the close-time cron grades the attempt with the
answers it has, which for mobile is none, so the learner scores 0. Section timers would make this
worse, so the design fixes it first (step 3 in section 6).

### 1.6 Scoring, review, results and analytics

- Leaderboard and staff results (`components/assessment-event-manager.tsx`, `EventResults`) show
  rank, status and score; staff can invalidate or adjust (integer) a result.
- `server/analytics/performance.ts` works at attempt level (score/maxScore). There is **no
  per-question, per-type or per-item statistic** for assessments; the only per-question stat is the
  public quiz `correctRate`. There is no CSV export for assessments or events.
- In-app guides: teacher `pengajar/03-…-kurikulum-bahan-ajar.md`, `06-…-review-penilaian.md`,
  `07-…-latihan-tryout.md`, `12-…-analitik.md`; learner `murid/06-…-mengerjakan-tugas.md`,
  `07-…-latihan-tryout.md`.
- Seeds: one tiny assessment in `seed.ts`; Tryout events only in `seed-analytics.ts`.

### 1.7 What already works for EPS

Four-option single choice (`MAX_ASSESSMENT_OPTIONS = 4`, ①–④), image and audio in prompts and
options, media preloading on both clients, one timer, Tryout across classes with a leaderboard and
no answer review, option shuffle, explanations (scripts), bulk authoring through MCP and image
import, and starter-course cloning.

---

## 2. Gaps and root causes

Line numbers were checked on 2026-10-26.

| #   | Gap                                                 | Root cause                                                                                                                                                                                                                                                                                                                            |
| --- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Tryouts always shuffle questions                    | `AssessmentEvent.shuffleQuestions @default(true)` (`schema.prisma:1327`); `createAssessmentEvent` never sets it (`event-management.ts:242-255`); `shapeLearnerAssessment` prefers it (`learner-view.ts:149-153`, `event.shuffleQuestions ?? assessment.shuffleQuestions`). Reading and listening get mixed and numbering 1–40 breaks. |
| 2   | No sections                                         | Questions are one flat list ordered by `position`. Timing is one deadline per attempt (`timing.ts`); scores are one total per attempt; instructions exist only at assessment level.                                                                                                                                                   |
| 3   | Audio has no play limit, autoplay or auto-advance   | Web renders `<audio controls>` (`asset-media-block.tsx:155-160`); mobile `AudioPlayer` allows unlimited replay (`media.tsx:148-218`). Neither has an `onEnded` hook or any knowledge of the attempt.                                                                                                                                  |
| 4   | Free navigation, answers always changeable          | Both attempt screens keep a free `current` index and a jump grid; `saveAnswers` replaces answers unconditionally. The server has no idea where the learner is.                                                                                                                                                                        |
| 5   | Integer points, one pass mark                       | `points Int`, `score/maxScore Int`, `autoScore/manualScore Int`, zod `.int()` in `inputs.ts`, `assessment-import.ts`, event `adjustResult`, UI validation. `passingScore` is a single percent.                                                                                                                                        |
| 6   | No question-type tags, no per-type or item analysis | `AssessmentQuestion` has no metadata besides `type` and `points`. No report reads `AssessmentAnswer` per question.                                                                                                                                                                                                                    |
| 7a  | Picture options stack vertically                    | Options always render as a vertical card list on both clients.                                                                                                                                                                                                                                                                        |
| 7b  | No shared passage or audio                          | A stimulus can only live inside one question's prompt.                                                                                                                                                                                                                                                                                |
| 7c  | Cloning hands LPKs the answer keys                  | `course/clone.ts` copies questions with `isCorrect` into an editable draft of the target organization.                                                                                                                                                                                                                                |
| 8   | Offline mobile attempts lose late-synced answers    | Section 1.5. Not in the research list, found while mapping sync.                                                                                                                                                                                                                                                                      |
| 9   | Old mobile builds would ignore new exam rules       | A build that does not know about sections would show a sectioned tryout as one free-navigation list with one timer. The start procedures do not know what the client supports.                                                                                                                                                        |

---

## 3. Design principles

1. **General features, EPS preset on top.** Sections, ordering, audio policy, navigation and lock
   rules, fractional points, score bands and tags are settings any timed exam can use. "Format
   EPS-TOPIK" just fills them in.
2. **One rules engine for web, mobile and server.** A pure module in `@hakgyo/shared`
   (`assessment-runtime`) reduces an attempt's progress log to its state (current section and
   question, section deadlines, locked answers, audio plays) and validates each new entry. Web and
   mobile drive their UI from it; the server re-runs it on every write. This is how "web and mobile
   behave the same" holds by construction, and how rules are enforced for offline attempts.
3. **The device is trusted for time only within bounds** (section 5.3). Mobile offline is the
   hard case; web is the same model with a tighter bound.
4. **Additive migrations**, with the one widening type change for fractional points called out in
   section 4.4. The app is pre-production, so backfills are trivial, but each step still follows
   `docs/backend-changes.md` (migration applied before the code that needs it).
5. **Thin routers.** New procedures delegate to services in `src/server/assessment/`. The inline
   logic in `routers/assessment-event.ts` (`startAttempt`) moves to a service when we touch it.

---

## 4. Data model changes

All new columns are nullable or have defaults; all new tables are new. Existing assessments keep
behaving exactly as today (no sections = one implicit section with the assessment's settings).

### 4.1 Event order follows the assessment (gap 1)

```prisma
model AssessmentEvent {
  /// null = follow the assessment (and its sections). Set only to override.
  shuffleQuestions Boolean?  // was Boolean @default(true)
}
```

Migration: drop the default, make the column nullable, set existing rows to `NULL`. Old code reads
`event.shuffleQuestions ?? assessment.shuffleQuestions` already, so it falls through to the
assessment setting without a code change. The event sheet gets an optional "Acak urutan soal"
override (hidden for sectioned assessments, where shuffling is a section setting).

### 4.2 Sections (gap 2) and navigation, lock and audio rules (gaps 3, 4)

```prisma
enum AssessmentSectionNavigation {
  FREE          // jump anywhere, change answers (today's behaviour)
  FORWARD_ONLY  // next only; earlier questions of the section can't be reopened
  PACED         // the system moves on: after the audio + answer window, or a per-question time
}

model AssessmentSection {
  id                    String   @id @default(cuid())
  assessmentId          String
  position              Int
  title                 String                 // "Membaca", "Mendengar"
  instructions          Json?                  // shown on the section intro screen
  timeLimitSeconds      Int?                   // null = no own timer (attempt timer only)
  navigation            AssessmentSectionNavigation @default(FREE)
  lockAnswers           Boolean  @default(false) // first choice is final
  allowEarlyFinish      Boolean  @default(true)  // "Selesai bagian ini" before the timer ends
  shuffleQuestions      Boolean  @default(false) // within the section, groups kept together
  audioMaxPlays         Int?                   // null = unlimited; counts whole playlists
  audioAutoplay         Boolean  @default(false) // play automatically until maxPlays is used
  audioRepeatGapSeconds Int      @default(2)
  pacedAnswerSeconds    Int?                   // PACED: answer window after the last play (EPS demo: 7)
  pacedQuestionSeconds  Int?                   // PACED: window for a question without audio
  createdAt / updatedAt
  assessment Assessment @relation(..., onDelete: Cascade)
  questions  AssessmentQuestion[]
  @@unique([assessmentId, position])
}

model AssessmentQuestion {
  sectionId String?   // null only while the assessment has no sections
  groupId   String?   // section 4.5
  tags      String[]  @default([])  // section 4.6
}
```

Rules:

- An assessment either has no sections (today) or every question belongs to one. Question
  `position` stays globally unique; display order is section `position`, then question `position`.
  Authoring gains a reorder procedure (`assessment.moveQuestion`) because none exists today.
- **Attempt time.** With timed sections the attempt deadline is the sum of section limits plus a
  short intro allowance per section (60 s); `timeLimitMinutes` is ignored and the editor shows the
  total. An event on a sectioned assessment derives `durationMinutes` from that total (the field is
  shown read-only), and `closesAt` still caps everything.
- **Section flow.** Sections run in order. Section _n+1_ starts when the learner taps "Mulai" on
  its intro screen, or automatically after the intro allowance, so its clock never waits for long.
  A section ends when its timer runs out or the learner finishes it early (if allowed); it can't be
  reopened. The section intro tap is also the user gesture that unlocks audio autoplay on browsers.
- **Shuffle** applies inside a section (and the event override, if set, also only inside sections).

Attempt state:

```prisma
model AssessmentAttemptSection {
  attemptId  String
  sectionId  String
  startedAt  DateTime
  deadlineAt DateTime?   // startedAt + limit, capped by the attempt deadline
  endedAt    DateTime?
  endReason  AssessmentSectionEndReason?  // FINISHED | TIME_UP | SUBMITTED
  score      Float?      // filled at grading
  maxScore   Float?
  @@id([attemptId, sectionId])
}

/// Append-only progress log, replayed by the shared rules engine.
model AssessmentAttemptLog {
  attemptId  String
  seq        Int                   // per attempt, assigned by the client, idempotency key
  kind       AssessmentLogKind     // SECTION_STARTED | QUESTION_SHOWN | ANSWERED | AUDIO_PLAYED | SECTION_ENDED
  sectionId  String?
  questionId String?
  optionIds  String[]  @default([])
  clientAt   DateTime              // device time, corrected by the offset measured at start
  receivedAt DateTime  @default(now())
  source     AssessmentLogSource   // WEB | MOBILE
  @@id([attemptId, seq])
}

model AssessmentAnswer  { answeredAt DateTime? }  // last accepted ANSWERED entry
model AssessmentAttempt {
  runtimeVersion Int?   // rules-engine version the attempt started with
  submittedVia   AssessmentSubmissionSource?  // LEARNER | AUTO_CLOSE | DEVICE_LATE
}
```

An EPS attempt writes roughly 40 answers + 40 question views + 20 audio entries + 4 section
entries ≈ 100 rows. The log also gives time-per-question for item analysis and an audit trail when
a teacher questions a result. Attempts on assessments without rules don't need the log, but write it
too so the code path is the same.

### 4.3 Score bands (gap 5, second half)

```prisma
model Assessment {
  /// Named thresholds in percent, e.g. [{ "label": "Manufaktur", "minPercent": 60 }, { "label": "Sektor lain", "minPercent": 45 }].
  scoreBands Json?
}
```

Validated by a shared zod schema (max 5 bands). `passingScore` keeps its meaning (course-item
completion). Results show which bands a score reaches; the EPS preset adds the note that real
selection is by rank above the floor.

### 4.4 Fractional points (gap 5)

Recommendation: widen `points`, `score`, `maxScore`, `autoScore`, `manualScore` (and the new section
scores) from `Int` to `Float` (`DOUBLE PRECISION`), allow at most two decimals in every zod input,
and round every sum through one `roundScore()` helper in `@hakgyo/shared`.

- Why `Float` and not `Decimal`: Prisma `Decimal` arrives as a `Decimal.js` object, which superjson
  does not serialize without registration and which would change the mobile contract from `number`
  to an object. `Float` stays `number` in TypeScript everywhere, so the type-level contract is
  unchanged; only the integer validations go.
- Coexistence: `int → double precision` is a widening `ALTER COLUMN … TYPE`. Existing values stay
  integral, the deployed code keeps reading and writing them, and until the new code ships nobody
  can write 2.5. This is the one non-additive DDL in the plan; it is safe because no consumer depends
  on integrality, and the tables are small (pre-production). The rehearsal on a Neon branch still
  applies.
- Display: Indonesian formatting (`2,5`) through a shared `formatScore()` on both clients.
- Rejected alternative: keep integer points and add a "score scale" (40 raw points shown as 100).
  It covers EPS but not unequal fractional weights, and every screen would have to remember to scale.

### 4.5 Question groups and shared stimulus (gap 7b)

```prisma
model AssessmentQuestionGroup {
  id           String  @id @default(cuid())
  assessmentId String
  sectionId    String?
  position     Int
  instructions Json?   // "[1~4] 다음 그림을 보고 맞는 단어나 문장을 고르십시오."
  stimulus     Json?   // shared passage, picture or audio, shown above each question of the group
}
```

Questions of a group stay together when a section is shuffled. A group's stimulus audio counts
against the play limit once per group, not per question.

### 4.6 Question tags (gap 6)

`AssessmentQuestion.tags String[]` (GIN index), free strings, so any organization can tag by skill,
chapter or difficulty. Presets ship a vocabulary in `@hakgyo/shared` with Indonesian labels, e.g.
`eps:R2` → "Rambu K3", `eps:L1` → "Bunyi ke tulisan", plus `level:mudah|sedang|sulit` and an
optional `bab:<n>` for the NEW 표준교재 chapter. Tags copy with clones and duplicates like any other
column, and they're consistent across packages, so a learner's "lemah di rambu K3" can be reported
over several tryouts. A tag table would only be needed for renaming tags across an organization,
which is not needed now.

### 4.7 Package licensing (gap 7c), out of scope

Selling original packages without exposing keys needs a separate design (a shared read-only
"licensed" assessment that LPK courses place instead of cloning, with keys never leaving Hakgyo's
organization). It doesn't block the simulation, so it is listed as a follow-up only.

---

## 5. Runtime behaviour

### 5.1 Shared rules engine (`packages/shared/src/assessment-runtime/`)

```ts
type RuntimePlan = { sections: PlanSection[]; deadlineAt: string | null };   // from the learner payload
type LogEntry = { seq: number; kind: …; sectionId?; questionId?; optionIds?; clientAt: string };
function reduceAttempt(plan, entries): AttemptState;          // current section/question, answers, plays, deadlines
function acceptEntry(plan, state, entry, bounds): { ok: true; state } | { ok: false; reason };
```

- Web and mobile build the plan from the learner payload (which now includes sections and their
  rules) and append entries locally before sending them. The UI only offers moves the engine
  accepts, so both clients behave the same.
- The server re-runs `acceptEntry` for every received entry in order, under
  `lockInProgressAttempt`. Rejected entries are not stored; the response returns the server's
  state, and the client resets to it. `saveAnswers` (old web tabs, old mobile builds) is converted
  into `ANSWERED` entries stamped with server time, so it can't bypass rules.
- `RUNTIME_VERSION` is a constant in the module. Rules that need a newer engine than a client
  reports are refused at start (section 5.5).

Rules enforced by `acceptEntry`:

| Rule                     | Check                                                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Section order            | `SECTION_STARTED` only for the next section, after the previous one ended or timed out                                              |
| Section time             | entries of a section need `clientAt < deadlineAt` (exclusive, like today)                                                           |
| `FORWARD_ONLY` / `PACED` | `QUESTION_SHOWN`/`ANSWERED` only for the current question or a later one of the current section                                     |
| `lockAnswers`            | an `ANSWERED` for a question that already has a non-empty answer is rejected                                                        |
| `PACED` windows          | `ANSWERED` after the question's window closed (last play end + `pacedAnswerSeconds`, or shown + `pacedQuestionSeconds`) is rejected |
| `audioMaxPlays`          | `AUDIO_PLAYED` beyond the limit for that question or group is rejected                                                              |
| Ended section            | nothing after `SECTION_ENDED` for that section                                                                                      |

### 5.2 Writes from each client

- **Web:** a new `assessment.recordProgress({ attemptId, entries })` replaces `saveAnswers` for the
  attempt screen. Section starts and ends flush immediately (they move the clock); answers keep the
  current 3 s debounce / 30 s max wait; audio plays and question views ride along with the next
  flush. Vercel calls stay about the same as today plus two per section.
- **Mobile:** a new outbox kind `ASSESSMENT_PROGRESS { attemptId, entries }` (a new kind needs no
  `OPERATION_VERSION` bump, per `docs/mobile-sync.md`). It is queued with the fixed id
  `assessment-progress:<attemptId>`, so each write replaces the pending one with the full unsent tail,
  and a checkpoint runs whenever the device is online. `ASSESSMENT_COMPLETED` gains an optional
  `entries` field (additive) so the final submit carries any tail. The server therefore usually has
  every answer before the event closes, which fixes most of gap 8 by itself.
- Both clients persist the log locally (web: `sessionStorage` plus the server; mobile: the existing
  attempt draft key, bumped to `v2`), so a reload or app kill resumes in the same section and
  question with the same plays used.

### 5.3 Time and trust

| Case           | `clientAt` accepted when                                                                                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web            | `receivedAt − clientAt ≤ 45 s` (covers the 30 s autosave max wait) and `clientAt ≤ receivedAt + 5 s`; otherwise the entry is stamped `receivedAt`                                |
| Mobile online  | same as web                                                                                                                                                                      |
| Mobile offline | `clientAt` is corrected with the offset measured at start (the start response returns `serverNow`); it must be monotone per attempt, after `startedAt` and ≤ `receivedAt + 60 s` |

Section deadlines are computed from the accepted `SECTION_STARTED` times, never from the device
alone. Offline, a learner who winds the device clock back can extend their time; we can't prevent
that without a trusted clock. Two mitigations: entries whose corrected time disagrees with the
monotone order are rejected, and attempts whose log arrived more than 5 minutes after their claimed
time are marked "dikirim dari perangkat offline" in staff results so a teacher can invalidate them.
For a mock exam that is the right trade-off.

### 5.4 Late offline submissions (gap 8)

- Event closing keeps grading in-progress attempts from what the server has (`submittedVia =
AUTO_CLOSE`).
- An `ASSESSMENT_PROGRESS`/`ASSESSMENT_COMPLETED` that arrives later for such an attempt is
  accepted if its entries are valid under section 5.3 **and** it arrives within
  `OFFLINE_SUBMISSION_GRACE` (24 h) of the close. The server replays the entries, regrades,
  sets `submittedVia = DEVICE_LATE` and writes an `AssessmentEventAudit` entry (new action
  `LATE_DEVICE_SUBMISSION`). Attempts already adjusted or invalidated by staff are not regraded.
- Chapter attempts accept valid late entries without a grace limit (no leaderboard depends on them).
- After the grace the operation fails with `PRECONDITION_FAILED` as today, and the app keeps the
  answers in its dead-letter list.

### 5.5 Old mobile builds (gap 9)

`startAssessment` / `startEventAssessment` accept a new optional `runtimeVersion`. If the assessment
uses any rule (sections with timers, non-`FREE` navigation, locks, audio limits) and the client
reports nothing or an older version, the start fails with `PRECONDITION_FAILED` "Perbarui aplikasi
untuk mengerjakan tryout ini." Assessments without rules keep working on every build.

### 5.6 Audio player (both clients)

When a section sets `audioMaxPlays` or `audioAutoplay`, audio inside the attempt switches to a
controlled player, provided through an `AssessmentAudioPolicy` context on web (read by
`asset-media-block.tsx`) and a `renderers` override of `NativeContentRenderer` on mobile.

- The **playlist** of a question is its group stimulus audio (if any), then the prompt's audio
  blocks, then each option's audio in displayed order (L4 "options read aloud").
- One **play** is the whole playlist. It counts when playback starts and is logged as
  `AUDIO_PLAYED`, so a reload doesn't give a free replay.
- Autoplay starts when the question is shown and repeats until `audioMaxPlays` is used, with
  `audioRepeatGapSeconds` between plays. Without autoplay the learner taps play, up to the limit.
- Limited audio has no seek and no pause, and a counter shows "Diputar 1 dari 2".
- `PACED`: after the last play the answer window counts down (`pacedAnswerSeconds`), then the
  question advances. A question without audio uses `pacedQuestionSeconds`.
- Web autoplay: the section intro tap unlocks audio, and one shared `HTMLAudioElement` is reused for
  the whole section (iOS Safari only allows programmatic playback on an element that was unlocked by
  a gesture). If playback is still blocked, the player shows a "Putar" button and the play counts
  only once it starts.
- Mobile: `expo-audio` with `playsInSilentMode`. Media is already preloaded on both clients.

### 5.7 Picture options (gap 7a)

A shared `isImageOnlyContent(content)` helper; when all options of a question are image-only, both
clients render a 2×2 grid (with ①–④ badges) instead of the vertical list. No schema change.

### 5.8 Reports (gap 6)

- **Learner result:** total, score per section, bands reached ("Lolos batas Manufaktur (60)"), and a
  per-tag summary ("Rambu K3: 1 dari 2 benar"). The tag summary shows no answer keys, so it is shown
  for Tryouts too once the score is visible.
- **Staff, per event:** section averages, per-tag class accuracy, and an item analysis table per
  question: percent correct (p), discrimination (upper − lower 27 %), option distribution, average
  time on the question (from the log), and flags for p < 0.3, p > 0.9, D < 0.2 and distractors
  chosen by fewer than 5 %. Plus a CSV export of results with section scores. Computed on request
  from `AssessmentAnswer` and the log (an event has at most a few hundred attempts).
- **Organization analytics** (`analitik/performa`): per-tag accuracy over time, later.

### 5.9 EPS-TOPIK preset

"Terapkan format EPS-TOPIK" in the assessment settings (and an MCP action) sets:

| Setting      | Membaca | Mendengar                                           |
| ------------ | ------- | --------------------------------------------------- |
| Time limit   | 25 min  | 25 min                                              |
| Navigation   | `FREE`  | `PACED` (setting; the UBT behaviour is unconfirmed) |
| Lock answers | off     | off (setting; the CBT demo locked)                  |
| Audio        | none    | autoplay, 2 plays, 2 s gap, 7 s answer window       |
| Shuffle      | off     | off                                                 |

Plus 2.5 points per question, score bands 60 (Manufaktur) and 45 (Sektor lain), the `eps:` tag
vocabulary, and a blueprint check in the editor that counts tags against the 40-question blueprint in
the research report. Every value stays editable afterwards.

### 5.10 Unchanged and out of scope

- Public quizzes keep flattening the questions (no sections, no rules).
- Copyright: seeds and fixtures use only original questions written for Hakgyo. The seed gets a
  short original EPS-format sample (a few reading and listening items, text-only or with
  Hakgyo-made assets), never HRDK material.

---

## 6. Order of work

Each step is one PR against `main`, with its migration applied (`db:migrate`) before merge, the web
typecheck and lint, the mobile typecheck when the tRPC contract changes, a 390 px check for UI, and
the in-app guide updated for anything users see.

| Step | PR                                                                                                                                                                                                                              | Schema                                                            | Clients     |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------- |
| 1    | **Event order follows the assessment.** Nullable `shuffleQuestions`, optional override in the event sheet. Includes the research report and this document.                                                                      | 4.1                                                               | web         |
| 2    | **Fractional points and score bands.** Widen the score columns, relax validations (editor, review, adjust, AI import, MCP), `roundScore`/`formatScore`, bands in settings and results.                                          | 4.3, 4.4                                                          | web, mobile |
| 3    | **Progress log and offline-safe mobile attempts.** Shared rules engine (no rules yet, only time), `recordProgress`, `ASSESSMENT_PROGRESS`, `serverNow` at start, late device submissions, mobile auto-submit at 0. Fixes gap 8. | log, `answeredAt`, `runtimeVersion`, `submittedVia`, audit action | web, mobile |
| 4    | **Sections: authoring.** Section CRUD, assign and reorder questions (`moveQuestion`), section instructions and time limits; draft payload, duplicate, clone, MCP.                                                               | 4.2 tables and `sectionId`                                        | web         |
| 5    | **Sections: taking them.** Section intro screens, per-section timers, early finish, section scores on both clients; `AssessmentAttemptSection`; start gate for old builds.                                                      | —                                                                 | web, mobile |
| 6    | **Navigation and locks.** `FORWARD_ONLY`, `lockAnswers` in the engine and both UIs.                                                                                                                                             | —                                                                 | web, mobile |
| 7    | **Audio policy and paced sections.** Controlled player on both clients, play counting, autoplay, `PACED`.                                                                                                                       | —                                                                 | web, mobile |
| 8    | **Tags and reports.** Tag input with preset suggestions, learner per-tag summary, staff item analysis and CSV.                                                                                                                  | 4.6                                                               | web, mobile |
| 9    | **Picture grid and question groups.** 2×2 image options; groups with instructions and shared stimulus.                                                                                                                          | 4.5                                                               | web, mobile |
| 10   | **EPS-TOPIK preset.** Preset action, tag vocabulary, blueprint check, original seed sample, guides.                                                                                                                             | —                                                                 | web, mobile |

Steps 1 and 2 are independent and small. Step 3 must come before 5–7 because it carries the
enforcement path. Step 8 can move earlier if per-type reports matter sooner than the exam feel. The
mobile changes in steps 3, 5, 6 and 7 can ship as one OTA update after step 7 if we would rather not
publish four times.

## 7. Open questions

1. Does today's UBT still lock answers and auto-advance listening? (Research report, section 7.)
   The preset defaults to a paced listening section without locks; confirm with an LPK.
2. Should a section timer pause while the app is closed, for example after a crash? The design
   says no: the clock keeps running, like the real exam.
3. Is the 24 h offline grace after close right for LPK tryouts, or should results be final sooner?
