import type { RouterInputs, RouterOutputs } from "@hakgyo/api";

export type MobileSyncOperation =
  RouterInputs["mobileSync"]["commit"]["operations"][number];
export type MobileSyncCommitInput = RouterInputs["mobileSync"]["commit"];
export type MobileSyncCommitResult = RouterOutputs["mobileSync"]["commit"];
export type MobileDashboard = RouterOutputs["mobileSync"]["getDashboard"];
export type AssessmentSyncAnswer = Extract<
  MobileSyncOperation,
  { kind: "ASSESSMENT_COMPLETED" }
>["answers"][number];
export type VocabularySyncAttempt = Extract<
  MobileSyncOperation,
  { kind: "VOCABULARY_SESSION_COMPLETED" }
>["attempts"][number];

export type SyncCheckpointResult =
  | { state: "synced"; result: MobileSyncCommitResult }
  | { state: "queued"; reason: "offline" | "unavailable" };

export type MobileSyncTransport = {
  commit: (input: MobileSyncCommitInput) => Promise<MobileSyncCommitResult>;
};
