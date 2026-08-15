# Content IndexedDB

This package provides browser-local working storage for the content library. The
server database remains authoritative. IndexedDB holds recoverable drafts,
queued tRPC mutations, and temporary upload blobs.

## Data model

- `drafts`: typed aggregate drafts for materials, assessments, and vocabulary
  sets. Every key includes the user and organization scope.
- `syncOperations`: ordered, retryable tRPC mutations. Claims use expiring
  leases so multiple tabs cannot process the same operation concurrently.
- `pendingAssets`: blobs waiting for the existing presigned-upload flow. Blobs
  are separate from draft JSON so normal editor writes stay small.

Only import this package from browser code. `getContentLocalStore()` throws a
`ContentDbUnavailableError` during SSR or when IndexedDB is unavailable.

## Save an editor draft

```ts
import { getContentLocalStore } from "~/lib/content-db";

const store = getContentLocalStore();
const draft = await store.saveDraft({
  userId,
  organizationId,
  entityType: "material",
  entityId: materialId,
  editorSchemaVersion: 1,
  payload: {
    title,
    description,
    content: editor.document,
    editorSchemaVersion: 1,
    requirementPolicy: "ALL",
    completionRequirements: [],
    assets: [],
  },
});
```

Debounce editor calls by roughly 500-1000 ms. Use `saveDraftAndEnqueue()` when
the local draft and its mutation must be committed atomically. Give autosave
mutations a stable `dedupeKey`; a newer queued value will replace the older one.

For offline creates with child records, enqueue the child with the parent
operation ID in `dependencyIds`. After the parent mutation returns its server
ID, call `replaceQueuedOperationInput()` to replace the child's temporary ID.
The child becomes claimable only after the parent operation is complete.

## Process the outbox

Call `processContentSyncQueue()` when the app starts, after a write, and on the
browser `online` event. The executor deliberately receives typed mutation data
without depending on React, so the UI can adapt it to the tRPC client.

```ts
await processContentSyncQueue(store, { userId, organizationId }, async (op) => {
  switch (op.mutation) {
    case "content.updateMaterial":
      await trpc.content.updateMaterial.mutate(op.input);
      return;
    // Handle every mutation enabled by the editor.
  }
});
```

Throw `ContentSyncConflictError` when a conditional server update reports a
revision conflict. The draft becomes `conflict` and the operation becomes
blocked instead of retrying indefinitely.

## Lifecycle and safety

- Call `clearUser(userId)` during logout before closing the singleton.
- Call `clearScope(scope)` when local organization data must be removed.
- Call `pruneCleanDrafts(timestamp)` periodically; never prune dirty drafts.
- Check `estimateStorage()` before retaining large assets and handle
  `ContentDbQuotaError` in the UI.
- Optionally call `requestPersistentStorage()` after a clear user gesture. The
  browser may deny the request, so drafts must remain recoverable from server
  data.
- Do not store auth tokens, cookies, or secrets. IndexedDB is not protection
  against XSS.
- Add a new Dexie version in `database.ts` for every store/index migration;
  never modify an already shipped version definition.
