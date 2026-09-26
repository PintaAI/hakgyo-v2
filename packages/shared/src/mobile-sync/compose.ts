/**
 * Pure composition of the learner screen shapes from a course bundle and the
 * learner state. Each helper mirrors the output of the matching tRPC procedure
 * so screens can render from local data with the same code path they use for
 * online results:
 *
 * - `composeCourseOutline`       ≙ `learning.getCourseOutline`
 * - `composeCourseItem`          ≙ `learning.getCourseItem`
 * - `composeLearnerAssessment`   ≙ `assessment.getForCourseItem` (no attempt)
 * - `composeVocabularyPractice`  ≙ `learning.getVocabularyPractice`
 *
 * No React Native or server imports: this runs on the device and in tests.
 */
import {
  evaluateOpenModules,
  evaluateSequentialModules,
  hasPassedAssessment,
  passesAssessmentRequirement,
  passesRequirementPolicy,
} from "../learning";
import { collectPdfPageRanges } from "../pdf-book";
import type {
  BundleItem,
  BundleModule,
  BundlePlacement,
  BundleStructure,
  BundleVocabularyEntry,
  CourseBundle,
  JsonValue,
  LearnerContentProgress,
  LearnerEligibleCohort,
  LearnerPassEvidence,
  LearnerStandaloneAttempt,
  LearnerState,
} from "./types";

export type CourseOutlineOrganization = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  theme: JsonValue;
  themeEnabled: boolean;
};

export type ComposeOutlineOptions = {
  /**
   * Organization summary shown on the course screen. The bundle only carries
   * the organization id; pass the entry from the learner index (`courses`) to
   * fill in the name, slug, logo and theme.
   */
  organization?: Partial<CourseOutlineOrganization> | null;
};

export const emptyLearnerState: LearnerState = {
  courseIds: [],
  contentProgress: {},
  standaloneAttempts: {},
  passEvidence: {},
  practicedVocabularySetIds: [],
  eligibleCohortsByCourse: {},
};

const emptyPlacement: BundlePlacement = {
  embedded: { vocabularySetIds: [], assessmentIds: [], pdfBookIds: [] },
  requirements: [],
};

function contentProgressFor(
  state: LearnerState,
  courseItemId: string,
): LearnerContentProgress | null {
  return state.contentProgress[courseItemId] ?? null;
}

function isContentCompleted(state: LearnerState, courseItemId: string) {
  return contentProgressFor(state, courseItemId)?.status === "COMPLETED";
}

function passEvidenceFor(
  state: LearnerState,
  assessmentId: string | null,
): LearnerPassEvidence[] {
  if (!assessmentId) return [];
  return state.passEvidence[assessmentId] ?? [];
}

/** Evidence for a material requirement on an assessment (event attempts count). */
function requirementEvidenceFor(
  state: LearnerState,
  assessmentId: string,
): LearnerPassEvidence[] {
  return state.requirementEvidence
    ? (state.requirementEvidence[assessmentId] ?? [])
    : passEvidenceFor(state, assessmentId);
}

/** The attempt summary `learning.getCourseOutline` and `assessment.getForCourseItem` return. */
function attemptSummary(attempt: LearnerStandaloneAttempt | null | undefined) {
  if (!attempt) return null;
  return {
    id: attempt.id,
    attemptNumber: attempt.attemptNumber,
    status: attempt.status,
    score: attempt.score,
    maxScore: attempt.maxScore,
    startedAt: new Date(attempt.startedAt),
  };
}

export type ComposedAttemptSummary = NonNullable<
  ReturnType<typeof attemptSummary>
>;

/**
 * Standalone attempts are keyed by course item id (an assessment placed twice
 * has separate attempts per placement). Older indexes keyed by assessment id
 * are still read.
 */
function standaloneAttemptsFor(state: LearnerState, item: BundleItem) {
  return (
    state.standaloneAttempts[item.id] ??
    (item.assessmentId ? state.standaloneAttempts[item.assessmentId] : null) ??
    null
  );
}

function isItemCompleted(state: LearnerState, item: BundleItem) {
  if (item.type === "ASSESSMENT") {
    return hasPassedAssessment(
      passEvidenceFor(state, item.assessmentId),
      item.assessmentPassingScore,
    );
  }
  return isContentCompleted(state, item.id);
}

function sortedModules(structure: BundleStructure): BundleModule[] {
  return [...structure.modules]
    .sort((left, right) => left.position - right.position)
    .map((module) => ({
      ...module,
      items: [...module.items].sort(
        (left, right) =>
          left.position - right.position || left.id.localeCompare(right.id),
      ),
    }));
}

function findItem(bundle: CourseBundle, courseItemId: string) {
  for (const module of bundle.structure.modules) {
    const item = module.items.find(
      (candidate) => candidate.id === courseItemId,
    );
    if (item) return { module, item };
  }
  return null;
}

/**
 * Asset metadata from the bundle. The bundle only lists confirmed, not
 * deleted assets, so a reference to anything else resolves to null (the
 * online procedures would return a record whose download fails).
 */
function assetRecord(bundle: CourseBundle, assetId: string | null) {
  return assetId ? (bundle.content.assets[assetId] ?? null) : null;
}

function assetReference(bundle: CourseBundle, assetId: string | null) {
  const asset = assetRecord(bundle, assetId);
  return asset ? { id: asset.id, fileName: asset.fileName } : null;
}

function assetDetail(bundle: CourseBundle, assetId: string | null) {
  const asset = assetRecord(bundle, assetId);
  return asset
    ? {
        id: asset.id,
        fileName: asset.fileName,
        contentType: asset.contentType,
        size: asset.size,
      }
    : null;
}

// ---------------------------------------------------------------------------
// learning.getCourseOutline
// ---------------------------------------------------------------------------

export type ComposedOutlineItem = {
  id: string;
  type: BundleItem["type"];
  position: number;
  title: string;
  attempt: ComposedAttemptSummary | null;
  isCompleted: boolean;
};

export function composeCourseOutline(
  bundle: CourseBundle,
  state: LearnerState = emptyLearnerState,
  options: ComposeOutlineOptions = {},
) {
  const moduleCompletion = sortedModules(bundle.structure).map((module) => ({
    id: module.id,
    title: module.title,
    description: module.description,
    position: module.position,
    items: module.items.map((item): ComposedOutlineItem => ({
      id: item.id,
      type: item.type,
      position: item.position,
      title: item.title,
      attempt: attemptSummary(standaloneAttemptsFor(state, item)?.latest),
      isCompleted: isItemCompleted(state, item),
    })),
  }));
  const modules =
    bundle.structure.progressionMode === "SEQUENTIAL"
      ? evaluateSequentialModules(moduleCompletion)
      : evaluateOpenModules(moduleCompletion);
  const organization = options.organization ?? {};

  return {
    id: bundle.courseId,
    title: bundle.structure.title,
    description: bundle.structure.description,
    thumbnailUrl: bundle.structure.thumbnailUrl,
    organization: {
      id: organization.id ?? bundle.organizationId,
      name: organization.name ?? "",
      slug: organization.slug ?? "",
      logoUrl: organization.logoUrl ?? null,
      theme: organization.theme ?? null,
      themeEnabled: organization.themeEnabled ?? false,
    },
    status: bundle.structure.status,
    progressionMode: bundle.structure.progressionMode,
    // Bundles are the learner view; staff management views stay online.
    canManage: false,
    modules,
  };
}

export type ComposedCourseOutline = ReturnType<typeof composeCourseOutline>;

/** The next non-locked, not yet completed item after `courseItemId` in module order. */
export function nextCourseItemId(
  outline: Pick<ComposedCourseOutline, "modules">,
  courseItemId: string,
) {
  const sequence = outline.modules.flatMap((module) =>
    module.items.map((item) => ({ item, module })),
  );
  const index = sequence.findIndex(({ item }) => item.id === courseItemId);
  if (index === -1) return null;
  for (const { item, module } of sequence.slice(index + 1)) {
    if (module.access === "LOCKED") return null;
    return item.id;
  }
  return null;
}

// ---------------------------------------------------------------------------
// learning.getCourseItem
// ---------------------------------------------------------------------------

function vocabularyEntryDetail(
  bundle: CourseBundle,
  entry: BundleVocabularyEntry,
) {
  return {
    id: entry.id,
    term: entry.term,
    definition: entry.definition,
    examples: entry.examples,
    metadata: entry.metadata,
    audioAsset: assetDetail(bundle, entry.audioAssetId),
    imageAsset: assetDetail(bundle, entry.imageAssetId),
  };
}

function vocabularyEntryReference(
  bundle: CourseBundle,
  entry: BundleVocabularyEntry,
) {
  return {
    id: entry.id,
    term: entry.term,
    definition: entry.definition,
    examples: entry.examples,
    audioAsset: assetReference(bundle, entry.audioAssetId),
    imageAsset: assetReference(bundle, entry.imageAssetId),
  };
}

/** PDF pages referenced by the material, restricted to the embedded ranges. */
export function referencedPdfBooks(bundle: CourseBundle, content: unknown) {
  const ranges = collectPdfPageRanges(content);
  if (!ranges.length) return [];
  const bookIds = [...new Set(ranges.map((range) => range.bookId))].sort();
  return bookIds.flatMap((bookId) => {
    const book = bundle.content.pdfBooks[bookId];
    if (!book) return [];
    const pages = [...book.pages]
      .sort((left, right) => left.pageNumber - right.pageNumber)
      .filter((page) =>
        ranges.some(
          (range) =>
            range.bookId === bookId &&
            page.pageNumber >= range.startPage &&
            page.pageNumber <= range.endPage,
        ),
      )
      .map((page) => ({
        pageNumber: page.pageNumber,
        assetId: page.assetId,
        width: page.width,
        height: page.height,
      }));
    return pages.length
      ? [{ id: book.id, title: book.title, pageOffset: book.pageOffset, pages }]
      : [];
  });
}

function isRequirementSatisfied(
  state: LearnerState,
  requirement: BundlePlacement["requirements"][number],
) {
  if (requirement.type === "VOCABULARY_SET") {
    return state.practicedVocabularySetIds.includes(requirement.resourceId);
  }
  return passesAssessmentRequirement(
    requirementEvidenceFor(state, requirement.resourceId),
    requirement.minimumScore,
    requirement.passingScore,
  );
}

/** Whether the material's completion requirements are met under its `requirementPolicy`. */
export function materialRequirementsSatisfied(
  bundle: CourseBundle,
  state: LearnerState,
  courseItemId: string,
) {
  const placement = bundle.content.placements[courseItemId] ?? emptyPlacement;
  const found = findItem(bundle, courseItemId);
  const material = found?.item.materialId
    ? bundle.content.materials[found.item.materialId]
    : undefined;
  return passesRequirementPolicy(
    material?.requirementPolicy ?? "ALL",
    placement.requirements.map((requirement) =>
      isRequirementSatisfied(state, requirement),
    ),
  );
}

export function composeCourseItem(
  bundle: CourseBundle,
  state: LearnerState = emptyLearnerState,
  courseItemId: string,
) {
  const found = findItem(bundle, courseItemId);
  if (!found) return null;
  const { module, item } = found;
  const placement = bundle.content.placements[item.id] ?? emptyPlacement;
  const material = item.materialId
    ? bundle.content.materials[item.materialId]
    : undefined;
  const vocabularySet = item.vocabularySetId
    ? bundle.content.vocabularySets[item.vocabularySetId]
    : undefined;
  const assessment = item.assessmentId
    ? bundle.content.assessments[item.assessmentId]
    : undefined;
  const progress = contentProgressFor(state, item.id);

  const requiredActivities = placement.requirements.flatMap((requirement) => {
    if (isRequirementSatisfied(state, requirement)) return [];
    if (!requirement.courseItemId) return [];
    return [
      {
        id: requirement.id,
        type: requirement.type,
        resourceId: requirement.resourceId,
        courseItemId: requirement.courseItemId,
        title: requirement.title,
      },
    ];
  });

  return {
    id: item.id,
    moduleId: module.id,
    organizationId: bundle.organizationId,
    type: item.type,
    position: item.position,
    module: { courseId: bundle.courseId },
    material: material
      ? {
          id: material.id,
          title: material.title,
          description: material.description,
          content: material.content,
          editorSchemaVersion: material.editorSchemaVersion,
          assets: material.assetIds.flatMap((assetId) => {
            const asset = assetDetail(bundle, assetId);
            return asset ? [{ asset }] : [];
          }),
          requiredActivities,
        }
      : null,
    vocabularySet: vocabularySet
      ? {
          id: vocabularySet.id,
          title: vocabularySet.title,
          description: vocabularySet.description,
          entries: vocabularySet.entries.map((entry) =>
            vocabularyEntryDetail(bundle, entry),
          ),
        }
      : null,
    assessment: assessment
      ? {
          id: assessment.id,
          title: assessment.title,
          description: assessment.description,
          status: assessment.status,
          _count: { questions: assessment.questionCount },
        }
      : null,
    progress: progress
      ? [
          {
            status: progress.status,
            startedAt: new Date(progress.startedAt),
            completedAt: progress.completedAt
              ? new Date(progress.completedAt)
              : null,
          },
        ]
      : [],
    embeddedResources: {
      pdfBooks: material ? referencedPdfBooks(bundle, material.content) : [],
      vocabularySets: placement.embedded.vocabularySetIds.flatMap(
        (reference) => {
          const set = bundle.content.vocabularySets[reference.id];
          return set
            ? [
                {
                  id: set.id,
                  title: set.title,
                  description: set.description,
                  entries: set.entries.map((entry) =>
                    vocabularyEntryReference(bundle, entry),
                  ),
                  courseItemId: reference.courseItemId,
                },
              ]
            : [];
        },
      ),
      assessments: placement.embedded.assessmentIds.flatMap((reference) => {
        const embedded = bundle.content.assessments[reference.id];
        return embedded && embedded.status === "PUBLISHED"
          ? [
              {
                id: embedded.id,
                title: embedded.title,
                description: embedded.description,
                questionCount: embedded.questionCount,
                courseItemId: reference.courseItemId,
              },
            ]
          : [];
      }),
      courseId: bundle.courseId,
      sourceCourseItemId: item.id,
    },
  };
}

export type ComposedCourseItem = NonNullable<
  ReturnType<typeof composeCourseItem>
>;

// ---------------------------------------------------------------------------
// assessment.getForCourseItem (without an attempt)
// ---------------------------------------------------------------------------

export function composeLearnerAssessment(
  bundle: CourseBundle,
  state: LearnerState = emptyLearnerState,
  courseItemId: string,
) {
  const found = findItem(bundle, courseItemId);
  const assessmentId = found?.item.assessmentId;
  if (!found || !assessmentId) return null;
  const { module, item } = found;
  const assessment = bundle.content.assessments[assessmentId];
  if (!assessment || assessment.status !== "PUBLISHED") return null;
  const attempts = standaloneAttemptsFor(state, item);
  const eligibleCohorts: LearnerEligibleCohort[] =
    state.eligibleCohortsByCourse[bundle.courseId] ?? [];

  return {
    id: assessment.id,
    title: assessment.title,
    description: assessment.description,
    instructions: assessment.instructions,
    passingScore: assessment.passingScore,
    maxAttempts: assessment.maxAttempts,
    shuffleQuestions: assessment.shuffleQuestions,
    shuffleOptions: assessment.shuffleOptions,
    status: assessment.status,
    context: {
      label: "Asesmen bab",
      title: assessment.title,
      courseTitle: bundle.structure.title,
      moduleTitle: module.title,
    },
    timeLimitMinutes: assessment.timeLimitMinutes,
    attemptDeadline: null as Date | null,
    event: null as {
      id: string;
      title: string;
      type: "QUICK_ASSESSMENT" | "TRYOUT";
      status: "DRAFT" | "OPEN" | "CLOSED" | "CANCELLED";
    } | null,
    latestStandaloneAttempt: attemptSummary(attempts?.latest),
    standaloneAttemptCount: attempts?.count ?? 0,
    // Without an attempt the answers are never revealed, so no `isCorrect`
    // (never in the bundle anyway) and no explanation.
    answersRevealed: false,
    eligibleCohorts,
    questions: [...assessment.questions]
      .sort((left, right) => left.position - right.position)
      .map((question) => ({
        id: question.id,
        type: question.type,
        prompt: question.prompt,
        explanation: null as JsonValue,
        points: question.points,
        position: question.position,
        options: [...question.options]
          .sort((left, right) => left.position - right.position)
          .map((option) => ({
            id: option.id,
            content: option.content,
            position: option.position,
          })),
      })),
  };
}

export type ComposedLearnerAssessment = NonNullable<
  ReturnType<typeof composeLearnerAssessment>
>;

// ---------------------------------------------------------------------------
// learning.getVocabularyPractice
// ---------------------------------------------------------------------------

export function composeVocabularyPractice(
  bundle: CourseBundle,
  _state: LearnerState = emptyLearnerState,
  vocabularySetId: string,
  sourceCourseItemId: string,
) {
  const found = findItem(bundle, sourceCourseItemId);
  if (!found) return null;
  const { module, item } = found;
  const placement = bundle.content.placements[item.id] ?? emptyPlacement;
  const linked =
    item.vocabularySetId === vocabularySetId ||
    placement.requirements.some(
      (requirement) =>
        requirement.type === "VOCABULARY_SET" &&
        requirement.resourceId === vocabularySetId,
    ) ||
    placement.embedded.vocabularySetIds.some(
      (reference) => reference.id === vocabularySetId,
    );
  if (!linked) return null;
  const vocabularySet = bundle.content.vocabularySets[vocabularySetId];
  if (!vocabularySet) return null;
  // The set's published placement in the source's module.
  const practiceItem = [...module.items]
    .filter((candidate) => candidate.vocabularySetId === vocabularySetId)
    .sort(
      (left, right) =>
        left.position - right.position || left.id.localeCompare(right.id),
    )[0];
  if (!practiceItem) return null;

  return {
    id: vocabularySet.id,
    title: vocabularySet.title,
    description: vocabularySet.description,
    courseItems: [{ id: practiceItem.id }],
    entries: vocabularySet.entries.map((entry) => ({
      id: entry.id,
      term: entry.term,
      definition: entry.definition,
      examples: entry.examples,
      audioAssetId: entry.audioAssetId,
      imageAssetId: entry.imageAssetId,
    })),
    _count: { entries: vocabularySet.entries.length },
    courseId: bundle.courseId,
    practiceCourseItemId: practiceItem.id,
  };
}

export type ComposedVocabularyPractice = NonNullable<
  ReturnType<typeof composeVocabularyPractice>
>;

// ---------------------------------------------------------------------------
// Assets referenced by a lesson (used by the prefetcher)
// ---------------------------------------------------------------------------

/** Every asset id a lesson screen may render: material assets, referenced PDF pages, vocabulary media. */
export function lessonAssetIds(bundle: CourseBundle, courseItemId: string) {
  const found = findItem(bundle, courseItemId);
  if (!found) return [];
  const { item } = found;
  const placement = bundle.content.placements[item.id] ?? emptyPlacement;
  const ids = new Set<string>();
  const addSet = (setId: string | null) => {
    const set = setId ? bundle.content.vocabularySets[setId] : undefined;
    for (const entry of set?.entries ?? []) {
      if (entry.audioAssetId) ids.add(entry.audioAssetId);
      if (entry.imageAssetId) ids.add(entry.imageAssetId);
    }
  };
  const material = item.materialId
    ? bundle.content.materials[item.materialId]
    : undefined;
  if (material) {
    for (const assetId of material.assetIds) ids.add(assetId);
    for (const book of referencedPdfBooks(bundle, material.content)) {
      for (const page of book.pages) ids.add(page.assetId);
    }
  }
  addSet(item.vocabularySetId);
  for (const reference of placement.embedded.vocabularySetIds) {
    addSet(reference.id);
  }
  return [...ids];
}

/** Merges a learner-state patch: courses listed in the patch replace their state. */
export function mergeLearnerState(
  current: LearnerState,
  patch: LearnerState,
  bundlesByCourse?: Record<
    string,
    Pick<CourseBundle, "structure"> & Partial<Pick<CourseBundle, "content">>
  >,
): LearnerState {
  const replaced = new Set(patch.courseIds);
  // Without bundle knowledge only the patch's keys are replaced; with it the
  // affected courses' stale keys are dropped too.
  const itemIds = new Set<string>();
  const assessmentIds = new Set<string>();
  const setIds = new Set<string>();
  for (const courseId of replaced) {
    const bundle = bundlesByCourse?.[courseId];
    if (!bundle) continue;
    for (const module of bundle.structure.modules) {
      for (const item of module.items) {
        itemIds.add(item.id);
        if (item.assessmentId) assessmentIds.add(item.assessmentId);
        if (item.vocabularySetId) setIds.add(item.vocabularySetId);
      }
    }
    for (const assessmentId of Object.keys(bundle.content?.assessments ?? {})) {
      assessmentIds.add(assessmentId);
    }
    for (const setId of Object.keys(bundle.content?.vocabularySets ?? {})) {
      setIds.add(setId);
    }
  }
  const keep = <T>(record: Record<string, T>, dropped: Set<string>) =>
    Object.fromEntries(
      Object.entries(record).filter(([key]) => !dropped.has(key)),
    );
  return {
    courseIds: [...new Set([...current.courseIds, ...patch.courseIds])],
    contentProgress: {
      ...keep(current.contentProgress, itemIds),
      ...patch.contentProgress,
    },
    standaloneAttempts: {
      ...keep(
        current.standaloneAttempts,
        new Set([...itemIds, ...assessmentIds]),
      ),
      ...patch.standaloneAttempts,
    },
    passEvidence: {
      ...keep(current.passEvidence, assessmentIds),
      ...patch.passEvidence,
    },
    ...(current.requirementEvidence || patch.requirementEvidence
      ? {
          requirementEvidence: {
            ...keep(current.requirementEvidence ?? {}, assessmentIds),
            ...(patch.requirementEvidence ?? {}),
          },
        }
      : {}),
    practicedVocabularySetIds: [
      ...new Set([
        ...current.practicedVocabularySetIds.filter((id) => !setIds.has(id)),
        ...patch.practicedVocabularySetIds,
      ]),
    ],
    eligibleCohortsByCourse: {
      ...keep(current.eligibleCohortsByCourse, replaced),
      ...patch.eligibleCohortsByCourse,
    },
  };
}
