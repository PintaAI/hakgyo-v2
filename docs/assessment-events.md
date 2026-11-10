# Latihan & tryout (assessment events)

Courses hold the curriculum. A **Latihan** (`QUICK_ASSESSMENT`) or **Tryout** (`TRYOUT`) runs one
assessment for one or more classes (cohorts) of a course: one published in the course, or one from
the organization's library (the "Bank tugas").

| Type    | After closing                                |
| ------- | -------------------------------------------- |
| Latihan | Graded answers and explanations are revealed |
| Tryout  | Score and leaderboard only, no answer review |

Both show a combined leaderboard across all targeted classes.

## The assessment: course or library

`AssessmentEvent.assessmentId` is the assessment the event runs. `courseItemId` is the course
placement it was picked from, or null for a library assessment:

- **From the course** ("Tugas di kurikulum", `assessmentEvent.listAssessmentItems`): a published
  item of the course. Learners also see it in the chapter list, and its questions (without answers)
  are in the course bundle on their phones before the event opens. Its attempts carry the item and
  share its attempt numbering with chapter attempts.
- **From the library** ("Bank tugas", `assessmentEvent.listLibraryAssessments`): any assessment of
  the organization with questions. Learners never see it before the event opens: it is in no
  chapter list and no bundle, and its questions reach the learner only when they start
  (`mobileSyncV2.startEventAssessment`, `assessment.getForAttempt`). Its attempts have no
  `courseItemId`, number per event, and lock on the event when starting. `placedInCourse` warns
  staff when the picked assessment is also shown in this course.

Code that needs the course of an attempt takes its item's, or its event's for a library event
(`attemptCourseId`, `assessmentContext`; review scopes and register filters match both). Learners
open such attempts at `/learn/assessments/{eventId}/attempts/{attemptId}` on the web and
`/event-attempts/[attemptId]` in the app. App builds that do not send `includeLibraryEvents` to
`mobileSyncV2.getIndex` get neither library events nor their attempts, because they read the course
item unguarded. Deleting an assessment deletes the library events running it with their attempts;
deleting a course deletes its events' attempts too.

## Targets and participants

- `AssessmentEventCohort` stores the targeted classes. An event created from a class targets that
  class; from the course, staff pick classes or "Semua kelas" (`allCohorts`), which stores every
  class granting course access (including the Kelas Mandiri) when the event is scheduled or
  opened. Classes can be added until the event closes (`addCohorts`), never removed.
- Learners take part through an active or completed, unexpired enrollment in a targeted class.
  Opening an event adds every eligible learner as an `AssessmentEventParticipant` with the class
  they take part through (a scheduled class before the Kelas Mandiri). Learners who join a targeted
  class later become participants on their first start.
- Event attempts carry the participant's class in `AssessmentAttempt.cohortId` (null for the
  Kelas Mandiri, like chapter attempts), so class review queues include them.

## Access

`src/server/assessment/event-targets.ts` (`resolveEventAccess`):

- Course managers (`course.manage`) manage every event of the course.
- Class staff with `assessment.review` manage events that only target classes they review, and can
  review (view, adjust, invalidate) their own classes' participants on any event.
- "Semua kelas" events require course management.
- Every change (open, schedule, close, cancel, delete, add classes) is authorized again inside its
  transaction against the targets read under the event row lock
  (`src/server/assessment/event-management.ts`), so a class someone else adds concurrently is part
  of the check.

## Lifecycle

```
DRAFT ──schedule──▶ SCHEDULED ──(opensAt)──▶ OPEN ──(closesAt / close)──▶ CLOSED
DRAFT / SCHEDULED ──open now──▶ OPEN
DRAFT / SCHEDULED / OPEN ──cancel──▶ CANCELLED
```

`src/server/assessment/event-lifecycle.ts` implements each transition. The cron route
`/api/cron/assessment-events` (GitHub Actions `assessment-events.yml`, every 5 minutes, with
`CRON_SECRET`) opens due scheduled events, sends "opened" pushes that are still pending, closes
events past
`closesAt` (with `closedAt = closesAt`) and grades attempts left in progress, 50 at a time, until
`attemptsFinalizedAt` is set. Every step is idempotent. Attempts graded this way award no XP: only
a learner's own submit records an `ASSESSMENT_SUBMITTED` activity, and event attempts never record
`ASSESSMENT_PASSED`. A learner starting a due scheduled event
opens it immediately, so a late cron run only delays the push. A manual close grades a few batches
right away and leaves the rest to the cron. Attempts graded this way are `submittedVia = AUTO_CLOSE`.
For a Tryout, learners can still submit, and offline devices can still sync answers given before
the deadline, for 24 hours after closing (`OFFLINE_SUBMISSION_GRACE_MS`). A Latihan gets no grace,
because it reveals its answers as soon as it closes. A late device submission regrades an
`AUTO_CLOSE` attempt as `DEVICE_LATE` (see "Assessment progress log" in `docs/mobile-sync.md`), so
the leaderboard can still change during that window.

The "opened" push is sent once per event through `notifyEventOpenedOnce`: the opening request, a
learner's start and the cron claim it via `openNotificationSentAt` (respecting `notifyOnOpen`); a
failed send releases the claim and the next cron run retries it, before any grading.

A scheduled or open event locks its assessment against edits (`live-status.ts`).

## Media preload

Questions show one at a time, so their images and audio are downloaded before the learner needs
them. `collectContentAssetIds` / `assessmentContentAssetIds` in `@hakgyo/shared` find `assetId`
props of custom media blocks, `hakgyo-asset:<id>` URLs of BlockNote file blocks and media inside
JSON strings (culture sections).

- `assessmentEvent.getForLearner` returns `media` (asset ids with sizes) once the learner can start or continue the
  event, never before it opens.
- Web: `src/lib/assessment-media-cache.ts` stores downloads in Cache Storage (memory where it is
  unavailable) keyed by asset id; every media block reads the local copy first. Downloads are
  registered synchronously and started in a layout effect, so URL lookups made while a download
  runs wait for the local copy instead of taking a network URL. The event page and the attempt
  page download ahead and show progress. Downloads use `fetch`, so the R2 bucket CORS
  must allow GET from the app origins.
- Mobile: the event and attempt screens call `prefetchAssessmentMedia`; open events are also
  downloaded in the background on Wi-Fi, and lesson prefetch includes assessment media. The course
  bundle lists question media in `content.assets`, so sizes are known.
- Both clients show a progress bar with bytes (`formatByteSize` in `@hakgyo/shared`), files when
  sizes are unknown, and a retry for failed files.

## Starting on mobile

Starting needs a connection: the server records the start time, checks the attempt limit and the
event window and opens a due scheduled event (`mobileSyncV2.startEventAssessment`). The app makes
the attempt's shuffle seed and sends it, so the preview shows the attempt's own order. For an event from the course, the questions themselves, without answers, are already on
the device in the course bundle, so the event screen shows the attempt's first screen from the
bundle the moment the learner taps "Mulai" (`AttemptStartingPreview`); a library event shows only
the starting status until the start returns the questions: the first section's intro,
or the first question when the assessment does not shuffle questions (shuffled options are left
out). The learner event detail does not carry the event's own shuffle setting, so an event set to
"Acak" on an unshuffled assessment swaps that first question once the attempt opens. Nothing can be answered until the start returns; then the attempt screen
replaces it with a fade. A failed start returns to the event detail with the error. A course tugas
starts the same way, from its own intro screen. What the server still has to order (question text
when questions shuffle, option text when options shuffle) shows as grey placeholders in its final
place.

The event screen uses the course tugas intro's layout (`HakgyoHero` with the question count,
`AssessmentFacts` chips including the opening and closing time, the first question as
`QuestionPreview`, the latest attempt as `AssessmentOverview`), with the leaderboard in the same
card style below.

## Offline materials (mobile)

The course screen offers "Simpan offline" for every chapter the learner can open, and each open
chapter header shows its state: stored ("Offline"), downloading (percent bar) or a download button
with the missing size. `useCourseOfflineMedia` derives each chapter's media from the local bundle
(`lessonAssetIds`), and `MobileSyncProvider` runs the downloads in a session-wide store
(`src/sync/offline-downloads.ts`), so they continue when the learner leaves the screen.

## Mobile compatibility

Learner payloads keep `scope: "COHORT"` and `cohort` (the learner's class) for older app versions.
Scheduled events reach the mobile index only when the client sends `includeScheduledEvents`.
