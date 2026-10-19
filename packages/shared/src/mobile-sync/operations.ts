/**
 * Versioned offline sync operations.
 *
 * Learner progress is queued on the device as operations and replayed later
 * by `mobileSyncV2.commit`, possibly by much newer app JavaScript and always
 * against the newest server. Every operation carries an optional `v` (absent
 * means 1, which is what every client built before versioning sends). When an
 * operation's shape changes incompatibly, bump `OPERATION_VERSION` and
 * register an upcaster from the previous version; both the client (reading
 * its outbox) and the server (before validating) upcast old operations to the
 * current shape. See `docs/mobile-sync.md` for the full procedure.
 */

/** Version stamped on newly queued operations; the shape the server validates. */
export const OPERATION_VERSION = 1;

/** A queued operation as stored or sent, before validation. */
export type RawSyncOperation = { [key: string]: unknown };

/**
 * Turns an operation of version `from` into version `from + 1`. Return a new
 * object (never mutate the input); `upcastOperation` sets `v` itself.
 */
export type OperationUpcaster = (
  operation: RawSyncOperation,
) => RawSyncOperation;

/**
 * Upcasters keyed by the version they upgrade from. Empty while only
 * version 1 exists. A breaking change to an operation adds one entry, for
 * example after renaming `courseItemId` to `itemId` in version 2:
 *
 * ```ts
 * export const OPERATION_VERSION = 2;
 * export const OPERATION_UPCASTERS = {
 *   1: (operation) => {
 *     if (operation.kind !== "CONTENT_COMPLETED") return operation;
 *     const { courseItemId, ...rest } = operation;
 *     return { ...rest, itemId: courseItemId };
 *   },
 * };
 * ```
 *
 * Never remove an entry: operations of every version may still be queued.
 */
export const OPERATION_UPCASTERS: Readonly<Record<number, OperationUpcaster>> =
  {};

export type UpcastOperationResult =
  | { status: "ok"; operation: RawSyncOperation & { v: number } }
  /** Written by a newer client than this code understands. */
  | { status: "too-new"; version: number }
  /** Not an object, or `v` is not a positive integer. */
  | { status: "invalid"; message: string };

/** Version of a raw operation (absent `v` is 1), or null when `v` is malformed. */
export function operationVersion(operation: RawSyncOperation) {
  const version = operation.v;
  if (version === undefined) return 1;
  return typeof version === "number" &&
    Number.isSafeInteger(version) &&
    version >= 1
    ? version
    : null;
}

/**
 * Brings a raw operation up to `version` (default `OPERATION_VERSION`) by
 * applying the upcasters one version at a time, and sets `v` to it. Does not
 * validate the payload itself. Throws when an upcaster in the chain is
 * missing, which is a bug in the registry, not in the operation.
 */
export function upcastOperation(
  raw: unknown,
  {
    upcasters = OPERATION_UPCASTERS,
    version: targetVersion = OPERATION_VERSION,
  }: {
    upcasters?: Readonly<Record<number, OperationUpcaster>>;
    version?: number;
  } = {},
): UpcastOperationResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { status: "invalid", message: "Sync operation must be an object" };
  }
  const version = operationVersion(raw as RawSyncOperation);
  if (version === null) {
    return {
      status: "invalid",
      message: "Sync operation version must be a positive integer",
    };
  }
  if (version > targetVersion) return { status: "too-new", version };
  let operation: RawSyncOperation = { ...(raw as RawSyncOperation) };
  for (let from = version; from < targetVersion; from += 1) {
    const upcaster = upcasters[from];
    if (!upcaster) {
      throw new Error(`Missing sync operation upcaster from version ${from}`);
    }
    operation = { ...upcaster(operation), v: from + 1 };
  }
  return { status: "ok", operation: { ...operation, v: targetVersion } };
}
