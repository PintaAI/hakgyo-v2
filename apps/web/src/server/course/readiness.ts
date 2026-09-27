/**
 * Course item readiness: the pure rules behind "live items are always complete".
 *
 * Learner visibility is `Course.status = PUBLISHED` AND `CourseItem.isPublished`. Library
 * resources have no publish state; whether an item may be visible is computed here, never
 * stored:
 *
 * - ASSESSMENT item: the assessment must have questions and pass
 *   `getAssessmentPublishValidationError`.
 * - MATERIAL item: every completion requirement and every embedded vocabulary set / assessment
 *   must be placed as a visible (isPublished) item in the same module, and an embedded or
 *   required assessment must itself be ready.
 * - VOCABULARY_SET item: always ready.
 *
 * Everything in this module is synchronous and database-free so it can be unit tested; the
 * loaders and server-side guards live in `readiness-service.ts`.
 */
import {
  getAssessmentPublishValidationError,
  type PublishableQuestion,
} from "~/lib/assessment-publication";

export type CourseItemKind = "MATERIAL" | "ASSESSMENT" | "VOCABULARY_SET";
export type ReadinessCourseStatus = "DRAFT" | "PUBLISHED";

export type ReadinessItem = {
  id: string;
  moduleId: string;
  position: number;
  type: CourseItemKind;
  isPublished: boolean;
  materialId: string | null;
  assessmentId: string | null;
  vocabularySetId: string | null;
};

export type ReadinessModule = { id: string; title: string; position: number };

export type ReadinessMaterial = {
  id: string;
  title: string;
  requirements: Array<{
    type: "ASSESSMENT" | "VOCABULARY_SET";
    assessmentId: string | null;
    vocabularySetId: string | null;
  }>;
  /** Ids from `collectMaterialReferenceIds(material.content)`. */
  embeds: { assessmentIds: string[]; vocabularySetIds: string[] };
};

export type ReadinessAssessment = {
  id: string;
  title: string;
  questionCount: number;
  /** `getAssessmentPublishValidationError` result; null when complete. */
  validationError: string | null;
};

export type ReadinessSnapshot = {
  /** Used to build workspace fix links (`/workspace/<slug>/…`). */
  organizationSlug: string;
  courseId: string;
  courseStatus: ReadinessCourseStatus;
  modules: ReadinessModule[];
  items: ReadinessItem[];
  materials: ReadonlyMap<string, ReadinessMaterial>;
  assessments: ReadonlyMap<string, ReadinessAssessment>;
  vocabularySets: ReadonlyMap<string, { id: string; title: string }>;
};

export type ReadinessReasonCode =
  /** The assessment has no questions. */
  | "ASSESSMENT_NO_QUESTIONS"
  /** A question fails the publish validation (missing prompt, options, answer key). */
  | "ASSESSMENT_INCOMPLETE"
  /** A completion requirement is not placed in the lesson's module. */
  | "REQUIREMENT_NOT_IN_MODULE"
  /** A completion requirement is placed in the module but every placement is hidden. */
  | "REQUIREMENT_HIDDEN"
  /** A required assessment is placed and visible but itself not ready. */
  | "REQUIREMENT_NOT_READY"
  /** An embedded vocabulary set / assessment is not placed in the lesson's module. */
  | "EMBED_NOT_IN_MODULE"
  /** An embedded resource is placed in the module but every placement is hidden. */
  | "EMBED_HIDDEN"
  /** An embedded assessment is placed and visible but itself not ready. */
  | "EMBED_NOT_READY";

export type ReadinessReason = {
  code: ReadinessReasonCode;
  message: string;
  /** The resource the reason is about (the item's own assessment, or the dependency). */
  resourceType?: "ASSESSMENT" | "VOCABULARY_SET";
  resourceId?: string;
  /** Items in the same module that place the dependency (to show or fix them). */
  blockingCourseItemIds?: string[];
  fixHref?: string;
};

export type ItemReadinessState =
  "LIVE" | "HIDDEN" | "HIDDEN_COURSE_UNPUBLISHED" | "NOT_READY";

export type ItemReadiness = {
  courseItemId: string;
  moduleId: string;
  type: CourseItemKind;
  /** Resource title (null when the resource is missing), for authoring UI. */
  title: string | null;
  moduleTitle: string | null;
  isPublished: boolean;
  /** False when `reasons` is non-empty; the item cannot be made visible. */
  ready: boolean;
  /**
   * NOT_READY wins over the visibility states (it also flags legacy visible items that break
   * the invariant). Otherwise LIVE = visible in a published course, HIDDEN_COURSE_UNPUBLISHED =
   * visible item in an unpublished course, HIDDEN = item hidden.
   */
  state: ItemReadinessState;
  reasons: ReadinessReason[];
  /** MATERIAL items in the same module that require or embed this item's resource. */
  dependents: string[];
};

export type CourseReadiness = {
  courseId: string;
  courseStatus: ReadinessCourseStatus;
  items: ItemReadiness[];
  summary: { live: number; hidden: number; notReady: number };
};

export type { PublishableQuestion };

/** Readiness facts about an assessment computed from its questions. */
export function summarizeAssessmentReadiness(
  assessment: { id: string; title: string },
  questions: PublishableQuestion[],
): ReadinessAssessment {
  return {
    id: assessment.id,
    title: assessment.title,
    questionCount: questions.length,
    validationError: getAssessmentPublishValidationError(questions),
  };
}

function assessmentHref(
  snapshot: Pick<ReadinessSnapshot, "organizationSlug" | "courseId">,
  moduleId: string,
  assessmentId: string,
) {
  return `/workspace/${snapshot.organizationSlug}/courses/${snapshot.courseId}/kurikulum/${moduleId}/assessments/${assessmentId}`;
}

function quote(title: string | undefined, fallback: string) {
  return title ? `"${title}"` : fallback;
}

/** Reasons the assessment itself is incomplete; empty when it is ready. */
export function assessmentReadinessReasons(
  snapshot: Pick<ReadinessSnapshot, "organizationSlug" | "courseId">,
  moduleId: string,
  assessment: ReadinessAssessment | undefined,
  assessmentId: string,
): ReadinessReason[] {
  const fixHref = assessmentHref(snapshot, moduleId, assessmentId);
  if (!assessment || assessment.questionCount === 0) {
    return [
      {
        code: "ASSESSMENT_NO_QUESTIONS",
        message: `Tugas ${quote(assessment?.title, "ini")} belum memiliki soal.`,
        resourceType: "ASSESSMENT",
        resourceId: assessmentId,
        fixHref,
      },
    ];
  }
  if (assessment.validationError) {
    return [
      {
        code: "ASSESSMENT_INCOMPLETE",
        message: `Tugas ${quote(assessment.title, "ini")} belum lengkap: ${assessment.validationError}`,
        resourceType: "ASSESSMENT",
        resourceId: assessmentId,
        fixHref,
      },
    ];
  }
  return [];
}

type Dependency = {
  kind: "REQUIREMENT" | "EMBED";
  resourceType: "ASSESSMENT" | "VOCABULARY_SET";
  resourceId: string;
};

/** Requirement and embed dependencies of a material, de-duplicated. */
export function materialDependencies(material: ReadinessMaterial) {
  const dependencies: Dependency[] = [];
  const seen = new Set<string>();
  const add = (dependency: Dependency) => {
    const key = `${dependency.kind}:${dependency.resourceType}:${dependency.resourceId}`;
    if (seen.has(key)) return;
    seen.add(key);
    dependencies.push(dependency);
  };
  for (const requirement of material.requirements) {
    if (requirement.type === "ASSESSMENT" && requirement.assessmentId) {
      add({
        kind: "REQUIREMENT",
        resourceType: "ASSESSMENT",
        resourceId: requirement.assessmentId,
      });
    }
    if (requirement.type === "VOCABULARY_SET" && requirement.vocabularySetId) {
      add({
        kind: "REQUIREMENT",
        resourceType: "VOCABULARY_SET",
        resourceId: requirement.vocabularySetId,
      });
    }
  }
  for (const assessmentId of material.embeds.assessmentIds) {
    add({
      kind: "EMBED",
      resourceType: "ASSESSMENT",
      resourceId: assessmentId,
    });
  }
  for (const vocabularySetId of material.embeds.vocabularySetIds) {
    add({
      kind: "EMBED",
      resourceType: "VOCABULARY_SET",
      resourceId: vocabularySetId,
    });
  }
  return dependencies;
}

function resourceIdOf(item: ReadinessItem) {
  return item.type === "ASSESSMENT"
    ? item.assessmentId
    : item.type === "VOCABULARY_SET"
      ? item.vocabularySetId
      : item.materialId;
}

function resourceKey(type: CourseItemKind, id: string) {
  return `${type}:${id}`;
}

function dependencyReason(
  snapshot: ReadinessSnapshot,
  moduleId: string,
  moduleTitle: string | undefined,
  dependency: Dependency,
  placements: ReadinessItem[],
): ReadinessReason | null {
  const title =
    dependency.resourceType === "ASSESSMENT"
      ? snapshot.assessments.get(dependency.resourceId)?.title
      : snapshot.vocabularySets.get(dependency.resourceId)?.title;
  const noun =
    dependency.resourceType === "ASSESSMENT" ? "Tugas" : "Kosakata";
  const label = `${noun} ${quote(title, "yang dirujuk")}`;
  const role =
    dependency.kind === "REQUIREMENT" ? "syarat penyelesaian" : "sisipan";
  const moduleLabel = moduleTitle ? `module "${moduleTitle}"` : "module ini";
  const base = {
    resourceType: dependency.resourceType,
    resourceId: dependency.resourceId,
  };

  if (placements.length === 0) {
    return {
      ...base,
      code:
        dependency.kind === "REQUIREMENT"
          ? "REQUIREMENT_NOT_IN_MODULE"
          : "EMBED_NOT_IN_MODULE",
      message: `${label} (${role}) belum ditambahkan sebagai item di ${moduleLabel}.`,
    };
  }
  const visible = placements.filter((placement) => placement.isPublished);
  if (visible.length === 0) {
    return {
      ...base,
      code:
        dependency.kind === "REQUIREMENT"
          ? "REQUIREMENT_HIDDEN"
          : "EMBED_HIDDEN",
      message: `${label} (${role}) masih disembunyikan di ${moduleLabel}. Tampilkan item tersebut terlebih dahulu.`,
      blockingCourseItemIds: placements.map((placement) => placement.id),
    };
  }
  if (dependency.resourceType === "ASSESSMENT") {
    const ownReasons = assessmentReadinessReasons(
      snapshot,
      moduleId,
      snapshot.assessments.get(dependency.resourceId),
      dependency.resourceId,
    );
    if (ownReasons.length) {
      return {
        ...base,
        code:
          dependency.kind === "REQUIREMENT"
            ? "REQUIREMENT_NOT_READY"
            : "EMBED_NOT_READY",
        message: `${label} (${role}) belum lengkap: ${ownReasons[0]!.message}`,
        blockingCourseItemIds: visible.map((placement) => placement.id),
        fixHref: assessmentHref(snapshot, moduleId, dependency.resourceId),
      };
    }
  }
  return null;
}

/** Readiness of every item in the snapshot, in module/position order. */
export function computeCourseReadiness(
  snapshot: ReadinessSnapshot,
): CourseReadiness {
  const moduleTitles = new Map(
    snapshot.modules.map((module) => [module.id, module.title]),
  );
  const modulePosition = new Map(
    snapshot.modules.map((module) => [module.id, module.position]),
  );
  // (moduleId, resource) -> placements in that module.
  const placementsByModule = new Map<string, Map<string, ReadinessItem[]>>();
  for (const item of snapshot.items) {
    const resourceId = resourceIdOf(item);
    if (!resourceId) continue;
    let byResource = placementsByModule.get(item.moduleId);
    if (!byResource) {
      byResource = new Map();
      placementsByModule.set(item.moduleId, byResource);
    }
    const key = resourceKey(item.type, resourceId);
    const list = byResource.get(key);
    if (list) list.push(item);
    else byResource.set(key, [item]);
  }

  const dependents = new Map<string, Set<string>>();
  const results = new Map<string, ItemReadiness>();

  for (const item of snapshot.items) {
    const reasons: ReadinessReason[] = [];
    if (item.type === "ASSESSMENT" && item.assessmentId) {
      reasons.push(
        ...assessmentReadinessReasons(
          snapshot,
          item.moduleId,
          snapshot.assessments.get(item.assessmentId),
          item.assessmentId,
        ),
      );
    }
    if (item.type === "MATERIAL" && item.materialId) {
      const material = snapshot.materials.get(item.materialId);
      const moduleResources = placementsByModule.get(item.moduleId);
      for (const dependency of material ? materialDependencies(material) : []) {
        const placements =
          moduleResources?.get(
            resourceKey(dependency.resourceType, dependency.resourceId),
          ) ?? [];
        for (const placement of placements) {
          let set = dependents.get(placement.id);
          if (!set) {
            set = new Set();
            dependents.set(placement.id, set);
          }
          set.add(item.id);
        }
        const reason = dependencyReason(
          snapshot,
          item.moduleId,
          moduleTitles.get(item.moduleId),
          dependency,
          placements,
        );
        if (reason) reasons.push(reason);
      }
    }
    const ready = reasons.length === 0;
    results.set(item.id, {
      courseItemId: item.id,
      moduleId: item.moduleId,
      type: item.type,
      title: resourceTitleOf(snapshot, item) ?? null,
      moduleTitle: moduleTitles.get(item.moduleId) ?? null,
      isPublished: item.isPublished,
      ready,
      state: !ready
        ? "NOT_READY"
        : !item.isPublished
          ? "HIDDEN"
          : snapshot.courseStatus === "PUBLISHED"
            ? "LIVE"
            : "HIDDEN_COURSE_UNPUBLISHED",
      reasons,
      dependents: [],
    });
  }

  const ordered = [...snapshot.items].sort(
    (left, right) =>
      (modulePosition.get(left.moduleId) ?? 0) -
        (modulePosition.get(right.moduleId) ?? 0) ||
      left.position - right.position,
  );
  const items = ordered.map((item) => {
    const result = results.get(item.id)!;
    const itemDependents = dependents.get(item.id);
    return itemDependents
      ? {
          ...result,
          dependents: ordered
            .filter((candidate) => itemDependents.has(candidate.id))
            .map((candidate) => candidate.id),
        }
      : result;
  });

  return {
    courseId: snapshot.courseId,
    courseStatus: snapshot.courseStatus,
    items,
    summary: {
      live: items.filter((item) => item.state === "LIVE").length,
      hidden: items.filter(
        (item) =>
          item.state === "HIDDEN" || item.state === "HIDDEN_COURSE_UNPUBLISHED",
      ).length,
      notReady: items.filter((item) => item.state === "NOT_READY").length,
    },
  };
}

/**
 * Visible items (isPublished) that are ready in `before` but not in `after`: the items a change
 * would break. Items that were already not ready are ignored so legacy data does not block
 * unrelated edits.
 */
export function findBrokenVisibleItems(
  before: CourseReadiness,
  after: CourseReadiness,
) {
  const readyBefore = new Set(
    before.items
      .filter((item) => item.isPublished && item.ready)
      .map((item) => item.courseItemId),
  );
  return after.items.filter(
    (item) =>
      item.isPublished && !item.ready && readyBefore.has(item.courseItemId),
  );
}

function resourceTitleOf(snapshot: ReadinessSnapshot, item: ReadinessItem) {
  return item.type === "MATERIAL" && item.materialId
    ? snapshot.materials.get(item.materialId)?.title
    : item.type === "ASSESSMENT" && item.assessmentId
      ? snapshot.assessments.get(item.assessmentId)?.title
      : item.vocabularySetId
        ? snapshot.vocabularySets.get(item.vocabularySetId)?.title
        : undefined;
}

/** Display label of an item: its resource title. */
export function itemTitle(snapshot: ReadinessSnapshot, itemId: string) {
  const item = snapshot.items.find((candidate) => candidate.id === itemId);
  if (!item) return "item";
  const title = resourceTitleOf(snapshot, item);
  return title ? `"${title}"` : "item";
}

/** `"A", "B" dan "C"` for error messages. */
export function joinTitles(titles: string[]) {
  const unique = [...new Set(titles)];
  if (unique.length <= 1) return unique[0] ?? "";
  return `${unique.slice(0, -1).join(", ")} dan ${unique.at(-1)}`;
}
