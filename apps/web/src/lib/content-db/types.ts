import type { inferRouterInputs } from "@trpc/server";

import type { AppRouter } from "~/server/api/root";

type RouterInputs = inferRouterInputs<AppRouter>;

export type ContentEntityType = "material" | "assessment" | "vocabularySet";
export type DraftSyncStatus = "clean" | "dirty" | "syncing" | "conflict";
export type SyncOperationStatus = "queued" | "processing" | "blocked";
export type PendingAssetStatus = "pending" | "uploading" | "failed";

export type ContentDbScope = {
  userId: string;
  organizationId: string;
};

export type LocalEntityIdentity = {
  clientId: string;
  serverId?: string;
};

export type MaterialRequirementDraft = LocalEntityIdentity &
  (
    | {
        type: "ASSESSMENT";
        assessmentId: string;
        minimumScore?: number | null;
      }
    | {
        type: "VOCABULARY_SET";
        vocabularySetId: string;
      }
  );

export type MaterialAssetDraft = LocalEntityIdentity & {
  assetId?: string;
  pendingAssetId?: string;
  fileName: string;
  contentType: string;
  size: number;
};

export type MaterialDraftPayload = {
  title: string;
  description?: string | null;
  content: RouterInputs["content"]["createMaterial"]["content"];
  editorSchemaVersion: number;
  requirementPolicy: "ALL" | "ANY";
  completionRequirements: MaterialRequirementDraft[];
  assets: MaterialAssetDraft[];
};

export type AssessmentOptionDraft = LocalEntityIdentity & {
  content: RouterInputs["assessment"]["createOption"]["content"];
  isCorrect: boolean;
};

export type AssessmentQuestionDraft = LocalEntityIdentity & {
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "WRITTEN";
  prompt: RouterInputs["assessment"]["createQuestion"]["prompt"];
  explanation?: RouterInputs["assessment"]["createQuestion"]["explanation"];
  points: number;
  options: AssessmentOptionDraft[];
};

export type AssessmentDraftPayload = {
  title: string;
  description?: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  editorSchemaVersion: number;
  instructions?: RouterInputs["assessment"]["create"]["instructions"];
  passingScore?: number | null;
  maxAttempts?: number | null;
  timeLimitMinutes?: number | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  questions: AssessmentQuestionDraft[];
};

export type VocabularyEntryDraft = LocalEntityIdentity & {
  term: string;
  definition: string;
  examples?: RouterInputs["content"]["createVocabularyEntry"]["examples"];
  audioAssetId?: string | null;
  pendingAudioAssetId?: string;
  metadata?: RouterInputs["content"]["createVocabularyEntry"]["metadata"];
};

export type VocabularySetDraftPayload = {
  title: string;
  description?: string | null;
  entries: VocabularyEntryDraft[];
};

export type ContentDraftPayloadMap = {
  material: MaterialDraftPayload;
  assessment: AssessmentDraftPayload;
  vocabularySet: VocabularySetDraftPayload;
};

export type ContentDraft<T extends ContentEntityType = ContentEntityType> =
  ContentDbScope & {
    key: string;
    entityType: T;
    entityId: string;
    payload: ContentDraftPayloadMap[T];
    editorSchemaVersion: number;
    syncStatus: DraftSyncStatus;
    baseRevision?: number;
    serverUpdatedAt?: string;
    createdAt: number;
    updatedAt: number;
    lastSyncedAt?: number;
  };

export type AnyContentDraft = {
  [T in ContentEntityType]: ContentDraft<T>;
}[ContentEntityType];

export type ContentMutationInputMap = {
  "content.createMaterial": RouterInputs["content"]["createMaterial"];
  "content.updateMaterial": RouterInputs["content"]["updateMaterial"];
  "content.deleteMaterial": RouterInputs["content"]["deleteMaterial"];
  "content.attachMaterialAsset": RouterInputs["content"]["attachMaterialAsset"];
  "content.detachMaterialAsset": RouterInputs["content"]["detachMaterialAsset"];
  "content.createRequirement": RouterInputs["content"]["createRequirement"];
  "content.deleteRequirement": RouterInputs["content"]["deleteRequirement"];
  "content.reorderRequirements": RouterInputs["content"]["reorderRequirements"];
  "content.createVocabularySet": RouterInputs["content"]["createVocabularySet"];
  "content.updateVocabularySet": RouterInputs["content"]["updateVocabularySet"];
  "content.deleteVocabularySet": RouterInputs["content"]["deleteVocabularySet"];
  "content.createVocabularyEntry": RouterInputs["content"]["createVocabularyEntry"];
  "content.updateVocabularyEntry": RouterInputs["content"]["updateVocabularyEntry"];
  "content.deleteVocabularyEntry": RouterInputs["content"]["deleteVocabularyEntry"];
  "assessment.create": RouterInputs["assessment"]["create"];
  "assessment.update": RouterInputs["assessment"]["update"];
  "assessment.delete": RouterInputs["assessment"]["delete"];
  "assessment.createQuestion": RouterInputs["assessment"]["createQuestion"];
  "assessment.updateQuestion": RouterInputs["assessment"]["updateQuestion"];
  "assessment.deleteQuestion": RouterInputs["assessment"]["deleteQuestion"];
  "assessment.createOption": RouterInputs["assessment"]["createOption"];
  "assessment.updateOption": RouterInputs["assessment"]["updateOption"];
  "assessment.deleteOption": RouterInputs["assessment"]["deleteOption"];
  "storage.confirmUpload": RouterInputs["storage"]["confirmUpload"];
};

export type ContentMutationName = keyof ContentMutationInputMap;

export type SyncOperation<T extends ContentMutationName = ContentMutationName> =
  ContentDbScope & {
    id: string;
    draftKey?: string;
    mutation: T;
    input: ContentMutationInputMap[T];
    dedupeKey?: string;
    dependencyIds: string[];
    status: SyncOperationStatus;
    attemptCount: number;
    nextAttemptAt: number;
    leaseId?: string;
    leaseExpiresAt?: number;
    lastError?: string;
    createdAt: number;
    updatedAt: number;
  };

export type AnySyncOperation = {
  [T in ContentMutationName]: SyncOperation<T>;
}[ContentMutationName];

export type PendingAsset = ContentDbScope & {
  id: string;
  draftKey: string;
  file: Blob;
  fileName: string;
  contentType: string;
  size: number;
  status: PendingAssetStatus;
  attemptCount: number;
  assetId?: string;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
};

export type StorageEstimate = {
  usage?: number;
  quota?: number;
  usageRatio?: number;
};
