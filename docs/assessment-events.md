# Latihan & tryout (assessment events)

Courses hold the curriculum. A **Latihan** (`QUICK_ASSESSMENT`) or **Tryout** (`TRYOUT`) runs one
published assessment of the course for one or more classes (cohorts) of that course.

| Type    | After closing                                |
| ------- | -------------------------------------------- |
| Latihan | Graded answers and explanations are revealed |
| Tryout  | Score and leaderboard only, no answer review |

Both show a combined leaderboard across all targeted classes.

## Targets and participants

- `AssessmentEventCohort` stores the targeted classes. An event created from a class targets that
  class; from the course, staff pick classes or "Semua kelas" (`allCohorts`), which stores every
  class granting course access (including the self-paced cohort) when the event is scheduled or
  opened. Classes can be added until the event closes (`addCohorts`), never removed.
- Learners take part through an active or completed, unexpired enrollment in a targeted class.
  Opening an event adds every eligible learner as an `AssessmentEventParticipant` with the class
  they take part through (a real class before the self-paced cohort). Learners who join a targeted
  class later become participants on their first start.
- Event attempts carry the participant's class in `AssessmentAttempt.cohortId` (null for the
  self-paced cohort, like chapter attempts), so class review queues include them.

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
`attemptsFinalizedAt` is set. Every step is idempotent. A learner starting a due scheduled event
opens it immediately, so a late cron run only delays the push. A manual close grades a few batches
right away and leaves the rest to the cron.

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

## Offline materials (mobile)

The course screen offers "Simpan offline" for every chapter the learner can open, and each open
chapter header shows its state: stored ("Offline"), downloading (percent bar) or a download button
with the missing size. `useCourseOfflineMedia` derives each chapter's media from the local bundle
(`lessonAssetIds`), and `MobileSyncProvider` runs the downloads in a session-wide store
(`src/sync/offline-downloads.ts`), so they continue when the learner leaves the screen.

## Mobile compatibility

Learner payloads keep `scope: "COHORT"` and `cohort` (the learner's class) for older app versions.
Scheduled events reach the mobile index only when the client sends `includeScheduledEvents`.
