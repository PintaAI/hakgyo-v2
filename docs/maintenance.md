# Maintenance mode

A server-wide switch for big backend changes and incidents. For learners on the mobile app it feels like being offline: they keep studying from the device, their progress queues in the SQLite outbox and syncs when maintenance ends. On the web it shows a banner, rejects writes, or replaces the pages with a maintenance page.

## Modes

| Mode        | Meaning                                                                                                                |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| `off`       | Default. Nothing happens.                                                                                              |
| `scheduled` | Announcement only: the web banner and the mobile notice show the start (and estimated end) in WIB. Nothing is blocked. |
| `read_only` | Reads work, writes are rejected.                                                                                       |
| `full`      | Everything is rejected, except the web sign-in (`/auth`) and `/superadmin` pages.                                      |

Superadmins (`SUPERADMIN_EMAILS`, matched by the signed-in session's email) bypass `read_only` and `full` in tRPC procedures and see the normal web pages in `full`, so they can verify the system during a window. Route handlers, crons and MCP never bypass.

## Configuration

Environment variables, validated in `apps/web/src/env.js` and documented in `apps/web/.env.example`:

- `MAINTENANCE_MODE`: `off` | `scheduled` | `read_only` | `full` (default `off`).
- `MAINTENANCE_MESSAGE`: optional Indonesian text replacing the default description. Leave the times out; they are appended in WIB.
- `MAINTENANCE_STARTS_AT`: optional ISO datetime with an offset (`2026-10-20T22:00:00+07:00`), announced while `scheduled`.
- `MAINTENANCE_UNTIL`: optional ISO datetime of the estimated end. It is sent as `Retry-After` and the mobile app pauses syncing until then.

Everything reads the state through `getMaintenanceState()` in `apps/web/src/server/maintenance.ts`, so the source can move to Vercel Global Config later without touching callers. The flag is never stored in Postgres: the database may be what is under maintenance.

### Toggling on Vercel

Environment variable changes only reach new deployments.

1. Set the variables for the Production environment (dashboard: Settings, Environment Variables; or `vercel env add MAINTENANCE_MODE production`, after `vercel env rm` of the old value).
2. Redeploy production (dashboard: Deployments, the current production deployment, Redeploy; or `vercel redeploy <deployment-url>`). Pages are rebuilt, so the banner reaches statically rendered pages too.
3. Check the banner on the site and, in `read_only`, that a write shows the maintenance message.

## What each mode blocks

| Surface                                      | `scheduled`            | `read_only`                                                                     | `full`                                             |
| -------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------- |
| Web pages                                    | Banner                 | Banner; failed writes show the server message as a toast                        | Maintenance page, except `/auth` and `/superadmin` |
| tRPC (`/api/trpc`, RSC callers, MCP callers) | Allowed                | Mutations rejected                                                              | Everything rejected                                |
| Mobile app                                   | Notice with start time | Notice; studying continues offline, sync pauses after the first rejected commit | Notice; studying continues offline, sync pauses    |
| Better Auth (`/api/auth/*`)                  | Allowed                | Allowed (sign-in still writes sessions)                                         | Rejected                                           |
| Crons (`/api/cron/*`)                        | Run                    | Skipped with 200                                                                | Skipped with 200                                   |
| MCP (`/api/mcp`)                             | Allowed                | Write tools rejected                                                            | Rejected before authentication                     |

Rejections are HTTP 503. tRPC procedures throw `SERVICE_UNAVAILABLE` with an Indonesian message and `data.maintenance` (the `MaintenanceState`); route handlers answer `{ code: "MAINTENANCE", message, maintenance }`. Both send `Retry-After` while `MAINTENANCE_UNTIL` is in the future.

A migration that touches the Better Auth tables (`user`, `session`, `account`, `verification`) needs `full`, because `read_only` keeps sign-in working.

### Route handlers

| Route                                                                                               | Treated as                         | `read_only`                        | `full`  |
| --------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------- | ------- |
| `/api/trpc/[trpc]`                                                                                  | Per procedure (middleware)         | Mutations 503                      | 503     |
| `/api/auth/[...all]`                                                                                | Read                               | Allowed                            | 503     |
| `/.well-known/oauth-authorization-server/api/auth`, `/.well-known/oauth-protected-resource/api/mcp` | Read                               | Allowed                            | 503     |
| `/api/mcp`                                                                                          | Read, write tools checked per tool | Write tools fail                   | 503     |
| `/api/mobile/v2/courses/[courseId]/bundle`                                                          | Read                               | Allowed                            | 503     |
| `/api/organization-landing/draft/[organizationId]`, `/api/organization-landing/published/[slug]`    | Read                               | Allowed                            | 503     |
| `/[orgSlug]/quiz/[quizSlug]/hasil/[attemptId]/kartu`                                                | Read                               | Allowed                            | 503     |
| `/api/public-quiz/[quizId]/cta`                                                                     | Read with a counter                | Redirects without counting         | 503     |
| `/api/integrations/{zoom,google-meet}/{connect,callback}`                                           | Write                              | 503                                | 503     |
| `/api/cron/{assessment-events,notifications,analytics-digest,mobile-sync-compact}`                  | Write                              | `{ skipped: "maintenance" }` (200) | Same    |
| `/auth/continue`                                                                                    | Part of sign-in                    | Allowed                            | Allowed |
| `/.well-known/openai-apps-challenge`, `/serwist/[path]`                                             | No database                        | Allowed                            | Allowed |

Crons answer 200 so the scheduled GitHub workflows (`curl --fail-with-body`) do not fail every run. While they skip, assessment events are not opened, closed or graded and reminders are not sent; the next run after maintenance catches up.

Writes made by reads are skipped while writes are blocked: the mobile client version recorded by `mobileSyncV2.getManifest`, and the public quiz view and call-to-action counters.

### Mobile app

`mobileSyncV2.getManifest` returns `maintenance` (`scheduled` or `read_only`; `full` rejects the manifest itself). Older clients ignore the field.

When a sync request is rejected for maintenance, the engine (`apps/mobile/src/sync/engine.ts`) publishes `maintenance` in its state, does not count the rejection against any operation, and pauses commit, manifest, index and bundle requests until `MAINTENANCE_UNTIL`, or for five minutes when no end is known. Pull-to-refresh tries the server once even while paused. The next successful sync call clears the state. The outbox keeps queueing throughout.

The tab screens show a notice (`MaintenanceBanner`) saying learners can keep studying and progress syncs afterwards. Online-only actions, such as signing in during `full` or starting an assessment event during `read_only`, show the server's message. A signed-in learner stays signed in during `full`: the auth client keeps the cached session on non-401 errors.

## Runbook

Maintenance is the fallback for changes that cannot run side by side with the old version; `docs/backend-changes.md` describes the zero-downtime path to try first.

1. Announce: set `MAINTENANCE_MODE=scheduled` with `MAINTENANCE_STARTS_AT` (and `MAINTENANCE_UNTIL` if known), redeploy. Give mobile clients time to fetch a manifest; they poll about every 15 minutes while open.
2. Start: switch to `read_only` (or `full` when the database itself goes away or the auth tables change), update `MAINTENANCE_UNTIL`, redeploy.
3. Work: run the migration or deploy the change. Verify as a superadmin, who bypasses the block.
4. End: set `MAINTENANCE_MODE=off` and redeploy. Mobile clients resume at the announced end (or within five minutes), or right away on pull-to-refresh.

## Rules

- Maintenance must use a transient error code (`SERVICE_UNAVAILABLE`). `BAD_REQUEST`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT` and `PRECONDITION_FAILED` are terminal for the sync engine (`TERMINAL_FAILURE_CODES` in `apps/mobile/src/sync/engine.ts` and `apps/web/src/server/mobile/apply-operations.ts`) and eventually move queued learner work to the dead-letter list. `src/server/maintenance.test.ts` and the engine tests pin this.
- Enforce maintenance in the handlers, not in `proxy.ts`: adding `/api/*` to the proxy matcher would make every API request a separate billed function call.
- A new route handler wraps its handler with `guardRoute("read" | "write", handler)`; a new cron calls `skipCronDuringMaintenance()` after its authorization check; a read that writes skips the write when `writesBlockedByMaintenance()`.
- In `full`, the web maintenance page is chosen on the client by path (layouts cannot read it on the server), so it is served with status 200 and the route's server components still run; their errors stay hidden.
