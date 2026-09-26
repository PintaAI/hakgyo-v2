/**
 * Mobile offline sync protocol v2.
 *
 * The server publishes a tiny per-user manifest (which courses changed), a
 * small per-user index (progress, attempts, cohorts, gamification...) and one
 * shared, cacheable content bundle per course. The device composes the screen
 * shapes it needs from `bundle + index` using the pure helpers in
 * `@hakgyo/shared/learning`.
 *
 * Every wire shape lives here so the web server (`satisfies`) and the mobile
 * client (`import type`) can never drift apart.
 */

/** Bumped when the request/response contract changes incompatibly. */
export const SYNC_PROTOCOL = 2;
/** Oldest protocol the server still accepts; older clients must update. */
export const MIN_SYNC_PROTOCOL = 2;
/** Bumped when the course bundle shape changes; clients refetch bundles. */
export const BUNDLE_SCHEMA = 1;
/** Bumped when the learner index shape changes; clients refetch the index. */
export const INDEX_SCHEMA = 1;

export const CLIENT_HEADER = "x-hakgyo-client";
export const UPGRADE_REQUIRED_MESSAGE = "UPGRADE_REQUIRED";

export type UpgradeRequiredData = { minProtocol: number };

// ---------------------------------------------------------------------------
// Value types shared with the server's Prisma client. Declared structurally
// (no Prisma import) so composed shapes are assignable to the tRPC outputs.
// ---------------------------------------------------------------------------

export type JsonObject = { [key in string]?: JsonValue };
export interface JsonArray extends Array<JsonValue> {}
export type JsonValue =
  string | number | boolean | JsonObject | JsonArray | null;

export type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type CourseProgressionMode = "OPEN" | "SEQUENTIAL";
export type AssessmentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type AssessmentQuestionType =
  "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "WRITTEN";
export type AssessmentAttemptStatus =
  "IN_PROGRESS" | "SUBMITTED" | "IN_REVIEW" | "GRADED";
export type ProgressStatus = "IN_PROGRESS" | "COMPLETED";
export type MaterialRequirementType = "ASSESSMENT" | "VOCABULARY_SET";
export type RequirementPolicy = "ALL" | "ANY";

// ---------------------------------------------------------------------------
// Change log scopes
// ---------------------------------------------------------------------------

export type SyncScopeType = "course" | "user" | "organization";
export type SyncCourseKind = "structure" | "content" | "roster";
export type SyncScopeKind = SyncCourseKind | "state" | "meta";

export type SyncScope = {
  scopeType: SyncScopeType;
  scopeId: string;
  kind: SyncScopeKind;
};

/** Opaque, monotonically increasing per scope. "0" means "never changed". */
export type SyncRevision = string;

// ---------------------------------------------------------------------------
// getManifest
// ---------------------------------------------------------------------------

export type SyncManifestInput = {
  protocol: number;
  organizationId?: string;
};

export type SyncManifestCourse = {
  courseId: string;
  organizationId: string;
  /** max(structure, content) revision of the course bundle. */
  revision: SyncRevision;
};

export type SyncManifest = {
  protocol: number;
  minProtocol: number;
  bundleSchema: number;
  indexSchema: number;
  /** Hash of everything the index depends on; unchanged token = skip getIndex. */
  indexToken: string;
  courses: SyncManifestCourse[];
  /** Server-suggested delay before the next poll (lets the server shed load). */
  checkAfterMs: number;
};

// ---------------------------------------------------------------------------
// Learner state (per user, per course) — the only user-specific inputs the
// composition helpers need.
// ---------------------------------------------------------------------------

export type LearnerContentProgress = {
  status: ProgressStatus;
  startedAt: string;
  completedAt: string | null;
};

export type LearnerStandaloneAttempt = {
  id: string;
  status: AssessmentAttemptStatus;
  attemptNumber: number;
  score: number | null;
  maxScore: number | null;
  startedAt: string;
  submittedAt: string | null;
  gradedAt: string | null;
};

export type LearnerPassEvidence = {
  status: AssessmentAttemptStatus;
  score: number | null;
  maxScore: number | null;
};

export type LearnerEligibleCohort = { id: string; name: string };

export type LearnerState = {
  /** Courses this state covers; a patch replaces state course-by-course. */
  courseIds: string[];
  contentProgress: Record<string, LearnerContentProgress>;
  standaloneAttempts: Record<
    string,
    { latest: LearnerStandaloneAttempt | null; count: number }
  >;
  /**
   * Keyed by assessmentId: graded standalone attempts with a usable score
   * (what module completion counts, see `hasPassedAssessment`).
   */
  passEvidence: Record<string, LearnerPassEvidence[]>;
  /**
   * Keyed by assessmentId, only for assessments used as material completion
   * requirements: every graded attempt, event attempts included (what
   * `passesAssessmentRequirement` counts on the server). Falls back to
   * `passEvidence` when absent.
   */
  requirementEvidence?: Record<string, LearnerPassEvidence[]>;
  practicedVocabularySetIds: string[];
  /** Keyed by courseId. */
  eligibleCohortsByCourse: Record<string, LearnerEligibleCohort[]>;
};

// ---------------------------------------------------------------------------
// getIndex
// ---------------------------------------------------------------------------

export type SyncIndexInput = {
  protocol: number;
  organizationId?: string;
  knownIndexToken?: string;
};

export type SyncIndexResult<TIndex> =
  { status: "unchanged"; indexToken: string } | { status: "ok"; index: TIndex };

/**
 * The per-user index. Sections marked `unknown` here are the existing tRPC
 * output shapes the server reuses verbatim (listMyCourses, listMyCohorts...).
 * The server narrows them with its router output types; the client narrows
 * them with `RouterOutputs`.
 */
export type LearnerIndexBase<TSections> = TSections & {
  indexToken: string;
  indexSchema: number;
  generatedAt: string;
  organizationId: string | null;
  /** Earliest time-driven expiry (midnight for streaks, event closes...). */
  validUntil: string;
  learner: LearnerState;
};

// ---------------------------------------------------------------------------
// Course bundle — identical for every learner of the course.
// ---------------------------------------------------------------------------

export type BundleItemType = "MATERIAL" | "VOCABULARY_SET" | "ASSESSMENT";

export type BundleItem = {
  id: string;
  type: BundleItemType;
  position: number;
  title: string;
  materialId: string | null;
  vocabularySetId: string | null;
  assessmentId: string | null;
  assessmentPassingScore: number | null;
};

export type BundleModule = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  items: BundleItem[];
};

export type BundleStructure = {
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  status: CourseStatus;
  progressionMode: CourseProgressionMode;
  modules: BundleModule[];
};

export type BundleReference = { id: string; courseItemId: string };

export type BundleRequirement = {
  id: string;
  type: MaterialRequirementType;
  minimumScore: number | null;
  resourceId: string;
  title: string;
  /** Published placement of the resource in the same module, if any. */
  courseItemId: string | null;
  passingScore: number | null;
};

export type BundlePlacement = {
  embedded: {
    vocabularySetIds: BundleReference[];
    assessmentIds: BundleReference[];
    pdfBookIds: string[];
  };
  requirements: BundleRequirement[];
};

export type BundleMaterial = {
  id: string;
  title: string;
  description: string | null;
  content: JsonValue;
  editorSchemaVersion: number;
  requirementPolicy: RequirementPolicy;
  assetIds: string[];
};

export type BundleVocabularyEntry = {
  id: string;
  term: string;
  definition: string;
  examples: JsonValue;
  metadata: JsonValue;
  audioAssetId: string | null;
  imageAssetId: string | null;
};

export type BundleVocabularySet = {
  id: string;
  title: string;
  description: string | null;
  entries: BundleVocabularyEntry[];
};

export type BundleAssessmentOption = {
  id: string;
  content: JsonValue;
  position: number;
};

export type BundleAssessmentQuestion = {
  id: string;
  type: AssessmentQuestionType;
  prompt: JsonValue;
  points: number;
  position: number;
  options: BundleAssessmentOption[];
};

/** Never carries `isCorrect` or `explanation`. */
export type BundleAssessment = {
  id: string;
  title: string;
  description: string | null;
  instructions: JsonValue;
  passingScore: number | null;
  maxAttempts: number | null;
  timeLimitMinutes: number | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  status: AssessmentStatus;
  questionCount: number;
  questions: BundleAssessmentQuestion[];
};

export type BundlePdfBook = {
  id: string;
  title: string;
  pageOffset: number;
  pages: Array<{
    pageNumber: number;
    assetId: string;
    width: number;
    height: number;
  }>;
};

export type BundleAsset = {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
};

export type BundleContent = {
  placements: Record<string, BundlePlacement>;
  materials: Record<string, BundleMaterial>;
  vocabularySets: Record<string, BundleVocabularySet>;
  assessments: Record<string, BundleAssessment>;
  pdfBooks: Record<string, BundlePdfBook>;
  assets: Record<string, BundleAsset>;
};

export type CourseBundle = {
  schema: number;
  courseId: string;
  organizationId: string;
  revision: SyncRevision;
  structure: BundleStructure;
  content: BundleContent;
};

export function bundleEtag(courseId: string, revision: SyncRevision) {
  return `"${BUNDLE_SCHEMA}:${courseId}@${revision}"`;
}

// ---------------------------------------------------------------------------
// commit
// ---------------------------------------------------------------------------

export type SyncCommitPatch<TGamification, TAttempts> = {
  /** Restricted to the affected courses; replace those courses' state. */
  learner: LearnerState;
  gamification: TGamification;
  attempts: TAttempts;
};

export function parseClientHeader(value: string | null | undefined) {
  const fields: Record<string, string> = {};
  for (const part of (value ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key && rest.length) fields[key] = rest.join("=");
  }
  const protocol = Number(fields.protocol);
  return {
    protocol: Number.isFinite(protocol) ? protocol : null,
    runtime: fields.runtime ?? null,
    update: fields.update ?? null,
  };
}

export function formatClientHeader(input: {
  protocol: number;
  runtime?: string | null;
  update?: string | null;
}) {
  return [
    `protocol=${input.protocol}`,
    input.runtime ? `runtime=${input.runtime}` : null,
    input.update ? `update=${input.update}` : null,
  ]
    .filter(Boolean)
    .join(";");
}
