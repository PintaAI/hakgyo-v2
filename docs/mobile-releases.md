# Mobile releases and forced updates

How the Expo app gets new code, how an old build is made to update, and the checks to run before and after the store launch. Sync compatibility itself is described in `docs/mobile-sync.md`.

## Runtimes and channels

- `runtimeVersion` uses the `appVersion` policy (`apps/mobile/app.config.ts`): the runtime is the app `version`, for example `1.0.0`. An EAS Update only reaches binaries of the same runtime, so once `1.1.0` ships, `1.0.0` binaries keep receiving only updates published for `1.0.0`.
- Build profiles in `apps/mobile/eas.json` publish to the channel of the same name (`development`, `preview`, `production`) and use the EAS environment of that name. Run `eas` from `apps/mobile`; there is no root `eas.json`.
- Bump `version` whenever native code changes: a new or upgraded native module, an Expo SDK upgrade, a config plugin, permissions or other native settings in `app.config.ts`. Then build and submit new binaries.

## Publishing an update

```bash
bun run --cwd apps/mobile ota:check --channel production
bun run --cwd apps/mobile ota:publish --channel production --message "Fix vocabulary audio"
```

`scripts/ota-publish.ts` lists every finished build on the channel with the current runtime and compares the fingerprint EAS recorded for it with the project's fingerprint. It publishes (`eas update`) only when all of them match. A mismatch means some installed binary has different native code, and the update could crash it on launch. The fix is a `version` bump and new builds, not a forced publish. `--platform ios|android` limits the check and the update to one platform; it is required while only one platform has builds on the channel.

`apps/mobile/fingerprint.config.js` leaves `package.json` scripts and `eas.json` out of the fingerprint, so editing dev scripts or submit settings does not block updates. If you add a native build hook (`eas-build-*` or `postinstall` scripts), bump `version` yourself.

## Forcing an update

Every mobile request sends `x-hakgyo-client: protocol=…;runtime=…;update=…;platform=…`. Sync procedures reject clients older than `MIN_SYNC_PROTOCOL` (`@hakgyo/shared/mobile-sync`) with `UPGRADE_REQUIRED`, and the app shows `ForcedUpdateGate`:

1. It checks for an EAS Update on the binary's channel and runtime, downloads it and reloads.
2. When none exists (the fix needs a new binary), it links to the store listing in `STORE_URLS` (`apps/mobile/src/components/forced-update-gate.tsx`).

The outbox stays on the device and syncs after the update.

Order of a breaking change:

1. Deploy a server that accepts the old and the new client.
2. Ship the new client (an update, or a store build when native code changed).
3. Check adoption (below) until the old builds are rare.
4. Raise `MIN_SYNC_PROTOCOL`.

Never raise the minimum in the same deploy that changes the contract.

Rules that keep old clients and queued work safe:

- Operations in the outbox were written by older JavaScript and replay after an update. Never change an existing operation `kind` incompatibly: add optional fields or a new kind, and keep accepting the old shape on the server.
- Cached data (course bundles, the learner index) is disposable: bump `BUNDLE_SCHEMA` or `INDEX_SCHEMA` instead of migrating it on the device.
- Temporary server unavailability (maintenance, overload) must use a transient error code such as `SERVICE_UNAVAILABLE`. `BAD_REQUEST`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT` and `PRECONDITION_FAILED` are terminal for the sync engine and eventually move operations to the dead-letter list.

## Who runs which build

`mobileSyncV2.getManifest` stores the newest build per user and platform in `mobileClientVersion` (written after the response, at most hourly per user). Builds older than the `platform` header field are not recorded.

```sql
SELECT platform, runtime, protocol, "updateId", count(*) AS users
FROM "mobileClientVersion"
WHERE "lastSeenAt" > now() - interval '30 days'
GROUP BY 1, 2, 3, 4
ORDER BY users DESC;
```

## Before the store launch

Test the update path on real `preview` or `production` builds; dev clients skip it. The `development` channel builds are dev clients and cannot run it.

1. Publish an update with `ota:publish` and confirm the build applies it (Profil shows the update id; relaunch twice, because updates download in the background and apply on the next launch).
2. Trigger the gate with an update available: build a client with a higher `SYNC_PROTOCOL`, raise `MIN_SYNC_PROTOCOL` on the server it talks to, and publish that client as an update. An older build must show the gate, download the update and come back working.
3. Trigger the gate with no update available (raise the minimum without publishing): the gate must show the store button and open the listing.
4. Undo both server and channel changes afterwards.

Raising the minimum on production is only acceptable while nobody outside the team uses the app. Afterwards, use a build that points at a Vercel preview deployment.
