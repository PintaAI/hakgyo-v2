# Large backend changes and migrations

How to ship a big backend change (a schema redesign, a new sync protocol, a reshaped API) to production without breaking clients or losing learner data. The tools this relies on are documented separately: `docs/maintenance.md` (maintenance mode), `docs/mobile-releases.md` (OTA updates, forced updates, adoption) and `docs/mobile-sync.md` (sync protocol and operation versions).

The rule behind every step: **at no moment may something running in production be unable to talk to something else running in production.**

## Who runs against the backend at the same time

| Client                                                                                                | How fast it changes                                                                    | Consequence                                                                                      |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Web (Vercel)                                                                                          | On every deploy, except browser tabs that are already open and keep the old JavaScript | The previous deployment (instant rollback) and old tabs must keep working against the new schema |
| Mobile app                                                                                            | Days through OTA updates, weeks to months through the stores                           | The server accepts old clients and old queued operations for a long time                         |
| Crons (`.github/workflows/`: assessment-events, notifications, mobile-sync-compact, analytics-digest) | Run on a schedule, also in the middle of a migration                                   | Pause them during risky steps (maintenance `read_only`/`full` does this)                         |
| MCP and ChatGPT agents                                                                                | Cache tool schemas                                                                     | Add new tools instead of changing the meaning of existing ones                                   |

So a big change is never one deploy. It is a sequence of small steps, each of which can be checked and undone on its own.

## 1. Classify the change

Write down which layers change. Each has its own compatibility tool:

| Layer                                                      | Tool                                                                                                                                                |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database shape                                             | Expand/contract migrations (section 4)                                                                                                              |
| tRPC inputs and outputs (web, mobile, MCP)                 | New procedures or optional fields next to the old ones                                                                                              |
| Sync protocol (manifest, index, bundles)                   | `mobileSyncV3` next to `mobileSyncV2`, then raise `MIN_SYNC_PROTOCOL` (`docs/mobile-releases.md`); `BUNDLE_SCHEMA`/`INDEX_SCHEMA` for cached shapes |
| Outbox operations                                          | `OPERATION_VERSION` and an upcaster (`docs/mobile-sync.md`, "Operation versions")                                                                   |
| Auth tables (`user`, `session`, `account`, `verification`) | Do it last and on its own; needs maintenance `full` if it cannot be done additively                                                                 |

If you cannot find a way for the old and new versions to run side by side, plan a maintenance window (section 6).

## 2. Design for coexistence

- **Database:** only additive migrations at first (new tables, nullable columns, new indexes). Never rename or drop in the same release that stops using something. To rename in code only, use Prisma `@map`.
- **API:** add `xV2` procedures or optional input fields; keep the old ones working until no client calls them.
- **Sync:** a new protocol is a new router next to the old one. The server translates old requests into the new model, so `mobileSyncV2` keeps working until `MIN_SYNC_PROTOCOL` is raised and the old router is deleted.
- **Queued operations:** operations sitting in device outboxes are replayed as written. Old kinds and versions must keep being accepted (upcast) indefinitely.
- **Writes during the transition:** new code writes to both the old and the new structure (dual write) until reads have moved to the new one.

## 3. Rehearse on a copy of production

1. Create a Neon branch from the production branch (Neon console, or `neonctl branches create`). It is an instant copy-on-write clone with real data.
2. Run the migration and the backfill against it: `bun run --cwd apps/web db:migrate` with `DATABASE_URL`/`DIRECT_URL` pointing at the branch. Measure how long they take and whether anything holds long locks on big tables.
3. Point a web server at the branch (a local `bun run --cwd apps/web dev`, or the shared development server) and test it with real clients: the new client, an old client (a build from before the change), and an old client with operations queued offline. Development builds talk to the development server.
4. Write the verification queries (row counts, sums or checksums comparing the old and new structures) and run them on the branch. You will run the same queries in production.
5. Delete the branch afterwards.

Never run the rehearsal, integration tests or seeds against the shared development database by accident: Bun loads `apps/web/.env` automatically.

## 4. Execute in production (no downtime)

Each step is its own pull request and deploy. Deploys do not run migrations, so migrations are applied by hand with `bun run --cwd apps/web db:migrate` against the production database.

1. **Prepare.**
   - Make a restore point: create a Neon branch of production named after the change (for example `before-course-redesign`). It is an instant snapshot you can compare against or restore from. Neon point-in-time restore is the fallback; check how many days your plan keeps.
   - Pick a time off-peak in WIB with no live Tryout or Latihan:
     ```sql
     SELECT id, title, status, "opensAt", "closesAt"
     FROM "AssessmentEvent"
     WHERE status IN ('SCHEDULED', 'OPEN')
       AND coalesce("opensAt", now()) < now() + interval '1 day'
       AND coalesce("closesAt", now() + interval '1 day') > now();
     ```
   - Tell organizations ahead of time if teachers will notice anything. Use maintenance mode `scheduled` for a banner on web and mobile.
2. **Expand.** Apply the additive migration first, then merge the code that uses it. The code that is currently live keeps working on the expanded schema.
3. **Dual write.** Deploy code that writes to both the old and the new structure and still reads from the old one.
4. **Backfill** existing rows with an idempotent script that works in batches and can resume where it stopped. The `MobileSyncChange` triggers fire on content, structure, roster and learner-state tables, so a mass backfill there makes every device re-download its course bundles: batch it, run it off-peak, and let `mobile-sync-compact` catch up.
5. **Verify** with the queries from the rehearsal.
6. **Switch reads** to the new structure (deploy). This is the moment users actually see the new backend; watch the Vercel logs and error rates.
7. **Ship the mobile client** that uses the new protocol or operation version: `ota:publish` when only JavaScript changed, otherwise bump `version` and release to the stores (`docs/mobile-releases.md`).
8. **Watch adoption** with the `mobileClientVersion` query in `docs/mobile-releases.md`.
9. **Raise `MIN_SYNC_PROTOCOL`** once old builds are rare. Stragglers see the update screen; their outbox is kept and syncs after they update.
10. **Contract, weeks later.** Stop dual writing, delete the old procedures and routers, and finally drop the old columns and tables in a later migration. After the drop, rollback means restoring from the snapshot, so wait until the rollback window has passed.

## 5. Rollback rules

Decide the point of no return before you start.

- **Before the contract step:** roll back code with Vercel instant rollback (or revert the pull request). The schema is still compatible with the previous deployment because every migration so far was additive.
- **After it:** fix forward. Restoring the snapshot or a point-in-time restore loses every write since that moment, which is why destructive steps happen late, and why a maintenance window is `read_only`.
- A mobile client that is ahead of the server (after a server rollback) only delays syncing: unknown operation versions fail with a transient error and stay queued.

## 6. When old and new cannot coexist

Use a short maintenance window instead of a big-bang deploy, following the runbook in `docs/maintenance.md`:

1. Announce with `scheduled` (start and estimated end).
2. Switch to `read_only`, or `full` when the database itself goes away or the auth tables change. Crons skip on their own, mobile learners keep studying offline and their writes queue in the outbox.
3. Create the snapshot branch, run the migration, deploy, and verify as a superadmin (superadmins bypass the block).
4. Switch back to `off`. Queued writes sync by themselves.

Because nothing is written during a `read_only` window, restoring the snapshot taken at its start loses no data.

## Checklist

- [ ] Layers classified, a coexistence path chosen for each (or a maintenance window planned)
- [ ] Rehearsed on a Neon branch of production, with timings, old and new clients, and an offline outbox
- [ ] Verification queries written
- [ ] No live assessment events in the window; organizations told when needed
- [ ] Snapshot branch created right before the first migration
- [ ] Expand migration applied before the code that needs it
- [ ] Dual write, backfill, verify, switch reads: each deployed and checked separately
- [ ] Mobile client shipped (`ota:publish` or store release), adoption checked
- [ ] `MIN_SYNC_PROTOCOL` raised only after adoption
- [ ] Contract migration scheduled after the rollback window

## Known gaps

- Operations the app gives up on (the dead-letter list) stay on the device; the server cannot see them yet. After a big change, ask testers to check Profil for unsynced items, or add reporting first.
- Check whether Vercel Skew Protection is enabled. Even with it, old browser tabs reach the new database, so additive-first stays mandatory.
