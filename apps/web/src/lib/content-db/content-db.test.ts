import { afterEach, describe, expect, test } from "bun:test";
import { IDBKeyRange, indexedDB } from "fake-indexeddb";

import { createContentLocalStore } from "./store";
import { ContentSyncConflictError, processContentSyncQueue } from "./sync";
import type { ContentDbScope, MaterialDraftPayload } from "./types";

const scope: ContentDbScope = {
  userId: "user-1",
  organizationId: "org-1",
};

const stores: ReturnType<typeof createContentLocalStore>[] = [];

function createStore() {
  const store = createContentLocalStore({
    name: `hakgyo-content-test-${crypto.randomUUID()}`,
    indexedDB,
    IDBKeyRange,
  });
  stores.push(store);
  return store;
}

function materialPayload(title = "Korean alphabet"): MaterialDraftPayload {
  return {
    title,
    content: [{ type: "paragraph", content: [] }],
    editorSchemaVersion: 1,
    requirementPolicy: "ALL",
    completionRequirements: [],
    assets: [],
  };
}

afterEach(async () => {
  await Promise.all(
    stores.splice(0).map(async (store) => {
      await store.database.delete();
    }),
  );
});

describe("ContentLocalStore", () => {
  test("upserts typed drafts while preserving creation metadata", async () => {
    const store = createStore();
    const first = await store.saveDraft({
      ...scope,
      entityType: "material",
      entityId: "material-1",
      payload: materialPayload(),
      editorSchemaVersion: 1,
      serverUpdatedAt: "2026-08-15T00:00:00.000Z",
    });
    const second = await store.saveDraft({
      ...scope,
      entityType: "material",
      entityId: "material-1",
      payload: materialPayload("Updated title"),
      editorSchemaVersion: 1,
    });

    expect(second.key).toBe(first.key);
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.serverUpdatedAt).toBe(first.serverUpdatedAt);
    expect(second.payload.title).toBe("Updated title");
    expect(await store.listDrafts(scope, "material")).toHaveLength(1);
    expect(
      await store.listDrafts({ userId: "other-user", organizationId: "org-1" }),
    ).toHaveLength(0);
  });

  test("deduplicates queued autosave mutations", async () => {
    const store = createStore();
    const first = await store.enqueueOperation({
      ...scope,
      mutation: "content.updateMaterial",
      input: {
        ...scope,
        materialId: "material-1",
        title: "First title",
      },
      dedupeKey: "material-1:autosave",
    });
    const second = await store.enqueueOperation({
      ...scope,
      mutation: "content.updateMaterial",
      input: {
        ...scope,
        materialId: "material-1",
        title: "Latest title",
      },
      dedupeKey: "material-1:autosave",
    });

    expect(second.id).toBe(first.id);
    const operations = await store.listOperations(scope);
    expect(operations).toHaveLength(1);
    expect(operations[0]?.input).toMatchObject({ title: "Latest title" });
  });

  test("claims operations atomically and waits for dependencies", async () => {
    const store = createStore();
    const parent = await store.enqueueOperation({
      ...scope,
      mutation: "content.createVocabularySet",
      input: { organizationId: scope.organizationId, title: "Greetings" },
    });
    const child = await store.enqueueOperation({
      ...scope,
      mutation: "content.createVocabularyEntry",
      input: {
        organizationId: scope.organizationId,
        vocabularySetId: "server-set-id",
        term: "annyeong",
        definition: "hello",
      },
      dependencyIds: [parent.id],
    });

    const firstClaim = await store.claimOperations(scope);
    expect(firstClaim.map((operation) => operation.id)).toEqual([parent.id]);
    expect(await store.claimOperations(scope)).toHaveLength(0);
    expect(
      await store.completeOperation(parent.id, firstClaim[0]!.leaseId),
    ).toBe(true);

    const secondClaim = await store.claimOperations(scope);
    expect(secondClaim.map((operation) => operation.id)).toEqual([child.id]);
  });

  test("replaces dependent input after a parent receives its server id", async () => {
    const store = createStore();
    const child = await store.enqueueOperation({
      ...scope,
      mutation: "content.createVocabularyEntry",
      input: {
        organizationId: scope.organizationId,
        vocabularySetId: "local-set-id",
        term: "annyeong",
        definition: "hello",
      },
    });

    expect(
      await store.replaceQueuedOperationInput(
        child.id,
        "content.createVocabularyEntry",
        {
          organizationId: scope.organizationId,
          vocabularySetId: "server-set-id",
          term: "annyeong",
          definition: "hello",
        },
      ),
    ).toBe(true);

    expect((await store.listOperations(scope))[0]?.input).toMatchObject({
      vocabularySetId: "server-set-id",
    });
  });

  test("deletes a draft and its queued operations and assets atomically", async () => {
    const store = createStore();
    const draft = await store.saveDraft({
      ...scope,
      entityType: "material",
      entityId: "material-1",
      payload: materialPayload(),
      editorSchemaVersion: 1,
    });
    await store.enqueueOperation({
      ...scope,
      draftKey: draft.key,
      mutation: "content.updateMaterial",
      input: {
        organizationId: scope.organizationId,
        materialId: "material-1",
        title: "Queued title",
      },
    });
    await store.addPendingAsset({
      ...scope,
      draftKey: draft.key,
      file: new Blob(["audio"], { type: "audio/mpeg" }),
      fileName: "example.mp3",
    });

    await store.deleteDraft(draft.key);

    expect(
      await store.getDraft(scope, "material", "material-1"),
    ).toBeUndefined();
    expect(await store.listOperations(scope)).toHaveLength(0);
    expect(await store.listPendingAssets(scope)).toHaveLength(0);
  });

  test("processes the outbox and marks the related draft clean", async () => {
    const store = createStore();
    const draft = await store.saveDraft({
      ...scope,
      entityType: "material",
      entityId: "material-1",
      payload: materialPayload(),
      editorSchemaVersion: 1,
    });
    await store.enqueueOperation({
      ...scope,
      draftKey: draft.key,
      mutation: "content.updateMaterial",
      input: {
        organizationId: scope.organizationId,
        materialId: "material-1",
        title: "Synced title",
      },
    });

    const summary = await processContentSyncQueue(store, scope, async () => ({
      serverVersion: { revision: 2, updatedAt: "2026-08-15T01:00:00.000Z" },
    }));
    const saved = await store.getDraft(scope, "material", "material-1");

    expect(summary).toMatchObject({ claimed: 1, succeeded: 1, failed: 0 });
    expect(saved).toMatchObject({
      syncStatus: "clean",
      baseRevision: 2,
      serverUpdatedAt: "2026-08-15T01:00:00.000Z",
    });
    expect(await store.listOperations(scope)).toHaveLength(0);
  });

  test("blocks conflicts instead of retrying them", async () => {
    const store = createStore();
    const draft = await store.saveDraft({
      ...scope,
      entityType: "material",
      entityId: "material-1",
      payload: materialPayload(),
      editorSchemaVersion: 1,
    });
    await store.enqueueOperation({
      ...scope,
      draftKey: draft.key,
      mutation: "content.updateMaterial",
      input: {
        organizationId: scope.organizationId,
        materialId: "material-1",
        title: "Conflicting title",
      },
    });

    await processContentSyncQueue(store, scope, () => {
      throw new ContentSyncConflictError();
    });

    expect(await store.getDraft(scope, "material", "material-1")).toMatchObject(
      { syncStatus: "conflict" },
    );
    const operations = await store.listOperations(scope);
    expect(operations).toHaveLength(1);
    expect(operations[0]?.status).toBe("blocked");
    expect(operations[0]?.attemptCount).toBe(1);
  });

  test("clears every organization belonging to a user", async () => {
    const store = createStore();
    await Promise.all(
      ["org-1", "org-2"].map((organizationId) =>
        store.saveDraft({
          userId: scope.userId,
          organizationId,
          entityType: "material",
          entityId: `material-${organizationId}`,
          payload: materialPayload(),
          editorSchemaVersion: 1,
        }),
      ),
    );
    await store.saveDraft({
      userId: "other-user",
      organizationId: "org-1",
      entityType: "material",
      entityId: "other-material",
      payload: materialPayload(),
      editorSchemaVersion: 1,
    });

    await store.clearUser(scope.userId);

    expect(await store.listDrafts(scope)).toHaveLength(0);
    expect(
      await store.listDrafts({ userId: scope.userId, organizationId: "org-2" }),
    ).toHaveLength(0);
    expect(
      await store.listDrafts({ userId: "other-user", organizationId: "org-1" }),
    ).toHaveLength(1);
  });
});
