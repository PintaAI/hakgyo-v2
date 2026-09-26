# Mobile sync freshness

The mobile client reads its persisted learner index, course bundles, and query rows from SQLite immediately, including while offline. Local learning changes are stored in the SQLite outbox before any network request. `mobileSyncV2.commit` applies outbox operations in batches of at most 500 and returns a learner-state patch; the client removes only acknowledged versions and retries any remainder.

Database triggers append rows to the `MobileSyncChange` log whenever learner-visible course structure, content, roster, organization, or learner state changes, which also catches writes made outside the mobile API. A scope's revision is the newest logged transaction id below the reader's snapshot horizon (`src/server/mobile/sync-log.ts`). `mobileSyncV2.getManifest` returns the index token and per-course bundle revisions; `getIndex` returns `unchanged` when the client's token still matches, and course bundles are downloaded from `/api/mobile/v2/courses/[courseId]/bundle` only when their revision changes. The cron route `/api/cron/mobile-sync-compact` compacts the log.

Every v2 request announces its sync protocol. Clients older than `MIN_SYNC_PROTOCOL` receive `UPGRADE_REQUIRED` and show the update screen; raise `MIN_SYNC_PROTOCOL` in `@hakgyo/shared/mobile-sync` to force an update.
