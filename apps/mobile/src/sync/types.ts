import type { RouterInputs, RouterOutputs } from "@hakgyo/api";
import type { CourseBundle, LearnerState } from "@hakgyo/shared/mobile-sync";

// ---------------------------------------------------------------------------
// Outbox operations
// ---------------------------------------------------------------------------

export type MobileSyncOperation =
  RouterInputs["mobileSyncV2"]["commit"]["operations"][number];
export type AssessmentSyncAnswer = Extract<
  MobileSyncOperation,
  { kind: "ASSESSMENT_COMPLETED" }
>["answers"][number];
export type VocabularySyncAttempt = Extract<
  MobileSyncOperation,
  { kind: "VOCABULARY_SESSION_COMPLETED" }
>["attempts"][number];

// ---------------------------------------------------------------------------
// mobileSyncV2 procedures (protocol 2)
// ---------------------------------------------------------------------------

type V2Inputs = RouterInputs["mobileSyncV2"];
type V2Outputs = RouterOutputs["mobileSyncV2"];

export type MobileSyncIndexResult = V2Outputs["getIndex"];
/** Per-user learner index, exactly as `mobileSyncV2.getIndex` returns it. */
export type LearnerIndex = Extract<
  MobileSyncIndexResult,
  { status: "ok" }
>["index"];
export type LearnerIndexSections = Omit<
  LearnerIndex,
  | "indexToken"
  | "indexSchema"
  | "generatedAt"
  | "organizationId"
  | "validUntil"
  | "learner"
>;

export type MobileSyncCommitInput = V2Inputs["commit"];
export type MobileSyncCommitResult = V2Outputs["commit"];
export type MobileSyncCommitPatch = NonNullable<
  MobileSyncCommitResult["patch"]
>;
export type MobileSyncManifestInput = V2Inputs["getManifest"];
export type MobileSyncManifest = V2Outputs["getManifest"];
export type MobileSyncIndexInput = V2Inputs["getIndex"];

/** `getMyAttempt` / `getForCourseItem` written by commit results and assessment starts. */
export type MobileSyncAssessmentResult = NonNullable<
  MobileSyncCommitResult["results"][number]["assessment"]
>;
export type MobileSyncAssessmentDetail = NonNullable<
  MobileSyncCommitResult["results"][number]["assessmentDetail"]
>;

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

export type UpgradeRequired = { minProtocol: number };

export type BundleFetchInput = {
  courseId: string;
  /** `bundleEtag(courseId, revision)` of the stored bundle, if any. */
  etag: string | null;
};

export type BundleFetchResult =
  | { status: "not-modified" }
  | {
      status: "ok";
      bundle: CourseBundle;
      etag: string | null;
      /** From the `X-Bundle-Revision` header (falls back to the body). */
      revision: string;
    }
  | { status: "upgrade-required"; minProtocol: number };

export type MobileSyncTransport = {
  commit: (input: MobileSyncCommitInput) => Promise<MobileSyncCommitResult>;
  getManifest: (input: MobileSyncManifestInput) => Promise<MobileSyncManifest>;
  getIndex: (input: MobileSyncIndexInput) => Promise<MobileSyncIndexResult>;
  fetchBundle: (input: BundleFetchInput) => Promise<BundleFetchResult>;
};

// ---------------------------------------------------------------------------
// Engine results and state
// ---------------------------------------------------------------------------

export type SyncQueuedReason = "offline" | "unavailable" | "upgrade-required";

export type SyncCheckpointResult =
  | { state: "synced"; result: MobileSyncCommitResult }
  | { state: "queued"; reason: SyncQueuedReason };

export type SyncRefreshResult =
  | { state: "current" }
  | { state: "refreshed" }
  | { state: "queued"; reason: SyncQueuedReason };

export type SyncUpdateResult = SyncCheckpointResult | SyncRefreshResult;

export type BundleSyncProgress = {
  /** Courses queued or downloading. */
  pending: number;
  /** Courses downloaded (or confirmed unchanged) since the last idle state. */
  completed: number;
  /** Courses that gave up after repeated failures since the last idle state. */
  failed: number;
  activeCourseIds: string[];
};

export type MobileSyncEngineState = {
  upgradeRequired: UpgradeRequired | null;
  isRefreshing: boolean;
  bundles: BundleSyncProgress;
  /** Server-suggested delay before the next manifest poll. */
  nextCheckAfterMs: number;
  lastRefreshedAt: number | null;
};

export type LearnerStatePatch = Partial<
  Pick<LearnerState, "contentProgress">
> & {
  practicedVocabularySetIds?: string[];
};
