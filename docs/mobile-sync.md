# Mobile sync freshness

The mobile client reads its persisted learner index, course bundles, and query rows from SQLite immediately, including while offline. Local learning changes are stored in the SQLite outbox before any network request. `mobileSyncV2.commit` applies outbox operations in batches of at most 500 and returns a learner-state patch; the client removes only acknowledged versions and retries any remainder.

Database triggers append rows to the `MobileSyncChange` log whenever learner-visible course structure, content, roster, organization, or learner state changes, which also catches writes made outside the mobile API. A scope's revision is the newest logged transaction id below the reader's snapshot horizon (`src/server/mobile/sync-log.ts`). `mobileSyncV2.getManifest` returns the index token and per-course bundle revisions; `getIndex` returns `unchanged` when the client's token still matches, and course bundles are downloaded from `/api/mobile/v2/courses/[courseId]/bundle` only when their revision changes. The cron route `/api/cron/mobile-sync-compact` compacts the log.

Every v2 request announces its sync protocol. Clients older than `MIN_SYNC_PROTOCOL` receive `UPGRADE_REQUIRED` and show the update screen; raise `MIN_SYNC_PROTOCOL` in `@hakgyo/shared/mobile-sync` to force an update. See `docs/mobile-releases.md` for the rollout order and the OTA publish guard.

## Operation versions

Outbox operations (`CONTENT_COMPLETED`, `VOCABULARY_SESSION_COMPLETED`, `ASSESSMENT_COMPLETED`) can sit on a device for a long time and are replayed by whatever JavaScript the app runs later, against the newest server. Each operation therefore carries a version `v`; an operation without `v` is version 1, which is what every client built before versioning sends. The current version is `OPERATION_VERSION` in `@hakgyo/shared/mobile-sync` (`packages/shared/src/mobile-sync/operations.ts`).

- The client stamps `v: OPERATION_VERSION` into the stored payload JSON when it queues an operation (`engine.putOperation` and `recordVocabularyAttempt` in `apps/mobile/src/sync/engine.ts`). Older rows simply lack `v`; there is no SQLite column for it.
- When the engine reads the outbox (to send, to append vocabulary attempts, to split oversized sessions, or to check whether an operation changed while in flight) it runs `upcastOperation`, which applies the registered upcasters one version at a time and sets `v`. An operation newer than the running JavaScript (an OTA update was rolled back) is sent unchanged and never edited locally, because the server is always at least as new as the newest client.
- The server (`parseSyncOperation` in `apps/web/src/server/mobile/sync-operation-schema.ts`) upcasts every operation before validating it with `syncOperation`. An operation newer than the server (a client ahead of a rolled-back deployment) fails with `UNSUPPORTED_OPERATION_VERSION`. That code is transient: the server stops processing the batch there, like after other transient failures, and the client keeps the operation queued and retries instead of dead-lettering it.

### Changing an operation

1. Additive, optional fields (or a new `kind`) need no version bump. Older clients simply do not send them, and the server must keep accepting operations without them.
2. Anything else is a breaking change: renaming, removing or retyping a field, making a field required, or changing its meaning. For one:
   - bump `OPERATION_VERSION`;
   - register an upcaster from the previous version in `OPERATION_UPCASTERS` that turns an old operation into the new shape (the doc comment there shows an example);
   - change the zod schema in `sync-operation-schema.ts` to the new shape only; old versions reach it through the upcasters;
   - add `apps/web/src/server/mobile/__fixtures__/sync-operations/v<N>.json` with realistic operations of every kind exactly as the new client queues them (each with `v: N`).
3. Never edit or delete an existing fixture file, and never remove an upcaster. The server keeps accepting every old version indefinitely, because old operations may still be queued on devices that have not synced in months.
4. Deploy the server before shipping the client that sends the new version (see the order in `docs/mobile-releases.md`). A client ahead of the server only delays syncing; it does not lose progress.

`sync-operation-schema.test.ts` checks that there is one fixture file per version up to `OPERATION_VERSION`, that every fixture of every version upcasts and validates against the current schema, and that the newest file covers every kind in the `syncOperation` union, so adding a kind without a fixture fails the test.
