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

## Lifecycle

```
DRAFT ──schedule──▶ SCHEDULED ──(opensAt)──▶ OPEN ──(closesAt / close)──▶ CLOSED
DRAFT / SCHEDULED ──open now──▶ OPEN
DRAFT / SCHEDULED / OPEN ──cancel──▶ CANCELLED
```

`src/server/assessment/event-lifecycle.ts` implements each transition. The cron route
`/api/cron/assessment-events` (GitHub Actions `assessment-events.yml`, every 5 minutes, with
`CRON_SECRET`) opens due scheduled events (pushing "dibuka" when `notifyOnOpen`), closes events past
`closesAt` (with `closedAt = closesAt`) and grades attempts left in progress, 50 at a time, until
`attemptsFinalizedAt` is set. Every step is idempotent. A learner starting a due scheduled event
opens it immediately, so a late cron run only delays the push. A manual close grades a few batches
right away and leaves the rest to the cron.

A scheduled or open event locks its assessment against edits (`live-status.ts`).

## Media preload

Questions show one at a time, so their images and audio are downloaded before the learner needs
them (`collectContentAssetIds` / `assessmentContentAssetIds` in `@hakgyo/shared`):

- `assessmentEvent.getForLearner` returns `mediaAssetIds` once the learner can start or continue the
  event, never before it opens.
- Web: `src/lib/assessment-media-cache.ts` stores downloads in Cache Storage (memory where it is
  unavailable) keyed by asset id; every media block reads the local copy first. The event page and
  the attempt page download ahead and show progress. Downloads use `fetch`, so the R2 bucket CORS
  must allow GET from the app origins.
- Mobile: the event and attempt screens call `prefetchAssessmentMedia`; open events are also
  downloaded in the background on Wi-Fi, and lesson prefetch includes assessment media.

## Mobile compatibility

Learner payloads keep `scope: "COHORT"` and `cohort` (the learner's class) for older app versions.
Scheduled events reach the mobile index only when the client sends `includeScheduledEvents`.
