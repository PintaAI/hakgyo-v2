# Vocabulary recall API

Server implementation only; no mobile or web UI is included. Use this API from a vocabulary screen, a material's embedded vocabulary block, or a future review queue. The authenticated learner's evidence follows the library entry across course placements and devices.

## Memory policy (version 1)

The test is `TYPE_TERM`: show the vocabulary definition and ask the learner to type its term. The server issues a challenge and grades the answer against a private snapshot of the term. Clients never submit `correct`, a score, a remembered flag, a streak, or a timestamp.

| Event | Result | Earliest next test |
| --- | --- | --- |
| First consecutive correct answer | Learning, pass streak 1 | 10 minutes |
| Second consecutive correct answer | Learning, pass streak 2 | 24 hours |
| Third consecutive correct answer | Individual entry becomes remembered | 24 hours |
| Correct answer while remembered | Keeps original remembered date; clears failure streak | 24 hours |
| Wrong answer | Resets pass streak, increments failure streak | 10 minutes |
| Second consecutive wrong answer | Removes remembered mark | 10 minutes |

After losing the mark, three consecutive spaced passes are required again. A correct answer between failures clears the failure streak. A single failure keeps an already remembered entry marked, but brings its next review forward. Streak counters are capped at their thresholds.

No time-based automatic forgetting is implemented: becoming overdue alone does not revoke a mark. Expiration, abandonment, unauthorized requests, and network errors are not failed recall attempts. A submitted empty/whitespace-only answer is a failed attempt. Challenges expire after 10 minutes. Timing uses the server clock, including the spacing check at submission.

Answers use Unicode NFKC normalization, trim/collapse whitespace, and lowercase comparison. Grading is otherwise exact: no substring matches, typo tolerance, synonyms, punctuation removal, or AI grading. Authors should keep a single expected term in `VocabularyEntry.term`; alternative spellings separated by slashes are not interpreted as alternative answers. Both prompt and answer use the current definition/term, not examples or metadata.

This establishes server-verified recall evidence, not a guarantee of unaided human memory. Existing study APIs intentionally expose words and definitions, so the protocol cannot prevent looking up answers or using automation.

## Authentication and scope

All procedures are protected tRPC procedures under `learning` at `/api/trpc`. Use the existing mobile tRPC client and Better Auth cookie forwarding (`authClient.getCookie()`). Use SuperJSON so date fields remain `Date` values. Input never includes `userId`; the router takes it from the authenticated actor.

```ts
type Scope = {
  sourceCourseItemId: string;
  vocabularySetId: string;
};
```

`sourceCourseItemId` must be an accessible vocabulary placement of that set, or an accessible material containing a `vocabularyReference` block pointing to it. As with `getVocabularyPractice`, the set must also have a published vocabulary placement in the same module and organization. The service authorizes that placement too, including enrollment and sequential-access rules. A completion requirement without an embedded reference does not itself authorize an embedded practice entry point: use the set's course item instead.

Submissions recheck current source and placement access, even when replaying an already submitted challenge. A challenge belongs to one learner, word, and source placement. Other learners cannot submit it. Deleting its word, learner, or source placement deletes the challenge through foreign keys.

## Procedures

### `learning.getVocabularyMemory` — query

Input: `Scope`.

```ts
type EntryMemory = {
  entryId: string;
  remembered: boolean;
  rememberedAt: Date | null;
  passStreak: number;
  failStreak: number;
  nextReviewAt: Date | null;
};
type Evidence = {
  items: EntryMemory[]; // All current entries, ordered by createdAt then id.
  remembered: boolean; // Nonempty set AND every current entry remembered.
};
// Output:
// Evidence & { policy: typeof vocabularyRecallPolicy; serverTime: Date }
```

An unseen entry has zero streaks and null dates. A null `nextReviewAt` means it can be tested now. A remembered entry can still be tested when due. Never infer a whole set is remembered from a local session's subset of words. Empty sets do not qualify.

The policy object contains `version`, `passesRequired`, `failuresToForget`, `retryDelayMs`, `reviewDelayMs`, and `challengeLifetimeMs`. Display the returned scheduling information; do not duplicate policy calculations in clients.

### `learning.startVocabularyRecall` — mutation

Input: `Scope & { entryId: string }`.

```ts
// Output:
{
  challengeId: string;
  entryId: string;
  kind: "TYPE_TERM";
  prompt: string; // Definition only.
  expiresAt: Date;
  serverTime: Date;
}
```

Repeated starts in the same context return the same unexpired, unsubmitted challenge. Starting from another authorized context expires the previous outstanding challenge for that learner/word. This prevents several devices or entry points from creating independent attempts for the same review interval. Starting does not increment streaks or mark the entry remembered. The response contains no expected answer, content hash, or database challenge row.

### `learning.submitVocabularyRecall` — mutation

Input: `{ challengeId: string; answer: string }`, with a maximum answer length of 500 characters. Blank answers are accepted as failed attempts.

Output: `Evidence & { correct: boolean; applied: boolean }`.

The first valid submission is graded and consumed atomically with the entry's memory transition and any completion revocations. This procedure is the public operation that earns/removes the individual word's remembered mark; there is deliberately no client-controlled `markRemembered(true)` mutation.

Replay returns the original correctness with `applied: false`, plus **current** set evidence. It does not regrade a different answer or increment counters. Replay remains possible after expiration if the challenge was already submitted and the learner still has access. If a previous response was lost, resend the same challenge ID and answer. Refresh status after network recovery; an older response may precede more recent activity on another device.

Concurrent starts, submissions, and manual content completion are serialized per learner using a PostgreSQL transaction advisory lock. This also covers separate words in the same set and material completion racing with a failed recall. A rejected/rolled-back submission leaves the challenge unconsumed.

## Completing sets and materials

`learning.markContentProgress({ courseItemId, status: "COMPLETED" })` still finalizes a course placement and awards the existing idempotent completion activity. After every word is remembered, the caller can invoke it for the vocabulary placement (use `practiceCourseItemId` from `getVocabularyPractice` for an embedded flow). Successful recall does not automatically complete every placement or award XP.

The server now rejects vocabulary completion unless every current entry has valid remembered evidence. Material vocabulary requirements also use that evidence directly, honoring `ALL`/`ANY` alongside the existing assessment thresholds; a completed vocabulary placement is no longer the evidence source. Materials without requirements retain their existing manual-completion behavior.

On loss of set mastery, recall submission downgrades that learner's completed vocabulary placements to `IN_PROGRESS` and clears `completedAt`. Completed dependent materials are reevaluated and downgraded only if their full `ALL`/`ANY` policy fails. A satisfied alternative requirement preserves `ANY` completion. Downgrades and recall evidence commit in the same transaction. Recompletion uses the original activity idempotency key, so relearning does not farm completion rewards. Historical XP and achievements are not clawed back.

`getCourseItem` and `getCourseOutline` validate evidence before displaying cached completion, including sequential module unlocking. Legacy manual completion flags are not grandfathered into remembered evidence. Material and vocabulary completion may therefore appear in progress after rollout. The additive migration does not erase historical flags or rewards.

Changing a term or definition invalidates its prior evidence by content hash and rejects outstanding challenges for the old content. Changes to examples, assets, or metadata preserve memory. Adding an entry makes the set incomplete until that entry qualifies. These changes are reflected by evidence/status and learner completion reads even if a historical `ContentProgress` row remains completed. Consumers must not use raw progress rows as vocabulary mastery evidence. Deleting an entry cascades its memory and challenges; remaining entries determine the set state, and a now-empty set is incomplete.

## Mobile consumption example

The existing `@hakgyo/api` contract automatically exports the router's inferred input/output types; no second DTO needs to be maintained.

```ts
import type { RouterInputs, RouterOutputs } from "@hakgyo/api";

type RecallInput = RouterInputs["learning"]["startVocabularyRecall"];
type RecallResult = RouterOutputs["learning"]["submitVocabularyRecall"];

// `client` is the existing authenticated tRPC client.
const scope = { sourceCourseItemId, vocabularySetId };
const status = await client.learning.getVocabularyMemory.query(scope);
const due = status.items.find(
  (item) => !item.nextReviewAt || item.nextReviewAt <= status.serverTime,
);
if (due) {
  const input: RecallInput = { ...scope, entryId: due.entryId };
  const challenge = await client.learning.startVocabularyRecall.mutate(input);
  // Present challenge.prompt and collect typed input. Keep challengeId for retries.
  const answer = await collectTypedAnswer(challenge.prompt);
  const result: RecallResult = await client.learning.submitVocabularyRecall.mutate({
    challengeId: challenge.challengeId,
    answer,
  });
  // Update every returned entry's memory; result.remembered is the whole-set state.
  if (result.remembered) {
    await client.learning.markContentProgress.mutate({
      courseItemId: practiceCourseItemId,
      status: "COMPLETED",
    });
  }
}
```

Invalidate/refetch `getVocabularyMemory`, `getCourseItem`, `getCourseOutline`, and relevant gamification queries after completion/submission. For an embedded flow, keep the material's source ID for authorization and the vocabulary placement's `practiceCourseItemId` for completing that placement. Material completion remains a separate action. An offline practice session cannot award remembered status: challenge issuance and answer submission require the server. Do not replay a queue of local pass/fail booleans.

## Server reuse

```ts
import { createVocabularyRecallService } from "~/server/vocabulary/recall-service";
import { requireCourseItemAccess } from "~/server/authorization";
import { db } from "~/server/db";

const recall = createVocabularyRecallService(db, requireCourseItemAccess);
const challenge = await recall.start(authenticatedUserId, {
  sourceCourseItemId,
  vocabularySetId,
  entryId,
});
const result = await recall.submit(authenticatedUserId, {
  challengeId: challenge.challengeId,
  answer,
});
```

`getStatus`, `start`, and `submit` are the reusable authorized service boundary. Pass a trusted authenticated principal and the real authorization function; do not expose the factory's dependencies as client inputs. `start`/`submit` own their transactions and must receive a root Prisma client.

`getVocabularyEvidence`, `isVocabularySetRemembered`, and `meetsMaterialRequirements` in `server/vocabulary/evidence.ts` are internal read helpers; they do not authorize users. Call them only after authorizing the containing resource. Any future content-completion writer must take `lockLearnerProgress` in its transaction and validate evidence within that transaction. Never write `VocabularyMemory` directly from a UI action or a self-reported assessment result. Future test formats should extend the issuance/grading boundary, not bypass it.

## Errors

| Code | Meaning / consumer action |
| --- | --- |
| `UNAUTHORIZED` | Authenticate before calling protected procedures. |
| `FORBIDDEN` | Course access is unavailable (including sequential locks); refresh enrollment/outline. |
| `NOT_FOUND` | Unknown/inaccessible source, unrelated set or word, unpublished placement, or a challenge not owned by the actor. |
| `PRECONDITION_FAILED` | Word not due, unsubmitted challenge expired, content changed, or completion requirements unmet. Refresh status; use `nextReviewAt`, or issue a new challenge when eligible. |
| `BAD_REQUEST` | Invalid input, including answers over 500 characters. |

Wrong answers are successful responses with `correct: false`, not transport errors. A timeout or server error has an uncertain outcome: retry the same challenge before starting another test.

## Deployment and verification

Apply `apps/web/prisma/migrations/20260906010000_add_vocabulary_recall/migration.sql` through the normal migration flow **before serving the updated API**, then regenerate Prisma. The new tables are `VocabularyMemory` and `VocabularyRecallChallenge`; existing user/content data is retained. No background job or new environment variable is required in production.

From `apps/web`, using Bun 1.3.14:

```sh
bun run db:migrate
bun run db:generate
bun run typecheck
bun run lint
bun test src/server/vocabulary/recall-policy.test.ts
# Only with DATABASE_URL pointing to a disposable migrated test database:
VOCABULARY_RECALL_INTEGRATION=1 bun test src/server/vocabulary/recall-service.integration.test.ts
```

Integration tests create their own organization/content fixtures and clean them up. They exercise real transactions, concurrent retries, access rechecks, completion gates, revocation, shared entry points, `ANY` policy, edits, deletion, and reward deduplication. They are opt-in so ordinary test runs do not write fixtures into a configured shared database. The production database adapter expects Neon; local PostgreSQL runs can supply a test-only Prisma adapter via Bun preload.

Challenges retain correctness and timestamps, but do not persist submitted answer text. No retention sweep is included; if challenge retention is introduced later, document that replay after purging returns `NOT_FOUND` and never recreate evidence from a retry.
