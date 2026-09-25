# Mobile sync freshness

The mobile client reads its persisted TanStack Query cache immediately, including while offline. Local learning changes are stored in the SQLite outbox before any network request. A checkpoint sends outbox operations in batches of 500, removes only acknowledged versions, and refreshes the dashboard after the final batch. The client processes at most 5,000 operations per checkpoint and retries any remainder.

The server keeps a small revision row for each organization and learner. Database triggers increment the appropriate row when mobile-visible content, enrollment, assessment, or progress data changes. This also catches writes made outside the mobile API. `mobileSync.getRevision` returns the relevant revision token; an unchanged token avoids rebuilding the dashboard. The dashboard records the revision from **before** its data reads, so a write during construction remains detectable on the next check.

The client checks on startup, when it returns to the foreground, when connectivity resumes, and roughly every 15 minutes while active. Checks are jittered across devices. Failures use exponential backoff with jitter, capped at about an hour. The outbox takes priority over revision checks. A full dashboard refresh is due after 24 hours and runs when the app is active and online, covering data outside the trigger list and changes made before the migration was installed.

Deploy the Prisma migration before deploying a server build that calls `mobileSyncRevision`. The new mobile client requires the server's `getRevision` procedure. The sync loop runs only while the app is active; it does not require background execution or push delivery.
