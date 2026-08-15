import Dexie, { type EntityTable } from "dexie";

import type { AnyContentDraft, AnySyncOperation, PendingAsset } from "./types";

export const CONTENT_DB_NAME = "hakgyo-content";
export const CONTENT_DB_VERSION = 1;

export class HakgyoContentDatabase extends Dexie {
  drafts!: EntityTable<AnyContentDraft, "key">;
  syncOperations!: EntityTable<AnySyncOperation, "id">;
  pendingAssets!: EntityTable<PendingAsset, "id">;

  constructor(
    name = CONTENT_DB_NAME,
    options?: ConstructorParameters<typeof Dexie>[1],
  ) {
    super(name, options);

    this.version(CONTENT_DB_VERSION).stores({
      drafts:
        "&key, [userId+organizationId], [userId+organizationId+entityType], [userId+organizationId+syncStatus], updatedAt",
      syncOperations:
        "&id, draftKey, [userId+organizationId], [userId+organizationId+status+nextAttemptAt], [userId+organizationId+dedupeKey], updatedAt",
      pendingAssets:
        "&id, draftKey, [userId+organizationId], [userId+organizationId+status], updatedAt",
    });
  }
}
