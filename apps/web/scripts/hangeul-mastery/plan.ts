// The import plan: desired rows (./desired.ts) against a snapshot of the database, as creates, updates (only the
// fields that differ), unchanged counts and removals. Pure, so the dry run and the tests share it with --execute.
import type {
  DesiredAssessment,
  DesiredCourse,
  DesiredEntry,
  DesiredItem,
  DesiredMaterial,
  DesiredModule,
  DesiredOption,
  DesiredQuestion,
  DesiredRequirement,
  DesiredVocabularySet,
} from "./desired";
import { canonicalJson, ID_PREFIX } from "./ids";

export { canonicalJson };

// ---------------------------------------------------------------- snapshot

export type SnapshotCourse = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  progressionMode: string;
  enrollmentMode: string | null;
  price: number;
};
export type SnapshotModule = {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  position: number;
};
export type SnapshotItem = {
  id: string;
  moduleId: string;
  /** Course of the item's module; another course means an id collision. */
  courseId: string;
  type: DesiredItem["type"];
  position: number;
  materialId: string | null;
  vocabularySetId: string | null;
  assessmentId: string | null;
  isPublished: boolean;
  learnerData: LearnerData;
};
export type SnapshotMaterial = {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  content: unknown;
  requirementPolicy: string;
};
export type SnapshotRequirement = Omit<DesiredRequirement, never>;
export type SnapshotVocabularySet = {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
};
export type SnapshotEntry = Omit<DesiredEntry, "examples" | "metadata"> & {
  examples: unknown;
  metadata: unknown;
  progressCount: number;
};
export type SnapshotAssessment = Omit<
  DesiredAssessment,
  "questions" | "assetIds" | "maxAttempts" | "passingScore"
> & {
  organizationId: string;
  maxAttempts: number | null;
  passingScore: number | null;
};
export type SnapshotQuestion = Omit<DesiredQuestion, "options" | "type"> & {
  type: string;
  answerCount: number;
};
export type SnapshotOption = DesiredOption & { selectionCount: number };
export type AssetLink = { parentId: string; assetId: string };

/** Learner work attached to a course item, lost when the item is deleted. */
export type LearnerData = {
  progress: number;
  attempts: number;
  events: number;
  practiceAttempts: number;
};

export type Snapshot = {
  organizationId: string;
  course: SnapshotCourse | null;
  modules: SnapshotModule[];
  /** Items of this course, plus items elsewhere that hold a desired id. */
  items: SnapshotItem[];
  materials: SnapshotMaterial[];
  requirements: SnapshotRequirement[];
  vocabularySets: SnapshotVocabularySet[];
  entries: SnapshotEntry[];
  assessments: SnapshotAssessment[];
  questions: SnapshotQuestion[];
  options: SnapshotOption[];
  materialAssets: AssetLink[];
  assessmentAssets: AssetLink[];
  /** Resource ids placed by items outside this course (never pruned). */
  placedElsewhere: Set<string>;
  /** Vocabulary progress rows per set (lost when a set is deleted). */
  setProgress: Map<string, number>;
};

// ---------------------------------------------------------------- plan

export type Update<T> = { id: string; data: Partial<T>; fields: string[] };
export type Removal = {
  id: string;
  label: string;
  learnerData: string | null;
  /** The resource (or question) a removed sub-row belongs to. */
  parentId?: string;
};

export type ModelPlan<T> = {
  create: T[];
  update: Update<T>[];
  unchanged: number;
  /** Rows to delete (sub-rows always; modules, items and resources only with --prune). */
  remove: Removal[];
};

export type ModuleRow = Omit<DesiredModule, "items" | "key">;
export type ItemRow = Omit<
  DesiredItem,
  "material" | "vocabularySet" | "assessment" | "key"
>;
export type MaterialRow = Omit<DesiredMaterial, "requirements" | "assetIds"> & {
  requirementPolicy: "ALL";
};
export type VocabularySetRow = Omit<DesiredVocabularySet, "entries">;
export type AssessmentRow = Omit<DesiredAssessment, "questions" | "assetIds">;
export type QuestionRow = Omit<DesiredQuestion, "options">;

export type ImportPlan = {
  course: {
    create: boolean;
    update: Update<CourseRow & { id: string }> | null;
    data: CourseRow;
  };
  modules: ModelPlan<ModuleRow>;
  /** Stale modules kept (no --prune) move behind the desired ones. */
  keptModuleMoves: { id: string; position: number }[];
  items: ModelPlan<ItemRow>;
  keptItemMoves: { id: string; moduleId: string; position: number }[];
  materials: ModelPlan<MaterialRow>;
  requirements: ModelPlan<DesiredRequirement>;
  vocabularySets: ModelPlan<VocabularySetRow>;
  entries: ModelPlan<DesiredEntry>;
  assessments: ModelPlan<AssessmentRow>;
  questions: ModelPlan<QuestionRow>;
  options: ModelPlan<DesiredOption>;
  materialAssets: ModelPlan<AssetLink>;
  assessmentAssets: ModelPlan<AssetLink>;
  /** Resources no longer in the content (deleted with --prune). */
  staleResources: {
    materials: Removal[];
    vocabularySets: Removal[];
    assessments: Removal[];
  };
  /** Sub-rows to remove that carry learner work: need --prune. */
  blocked: string[];
  /** Problems that stop the import (id collisions). */
  errors: string[];
};

export type CourseRow = {
  title: string;
  description: string | null;
  status: "PUBLISHED";
  progressionMode: "SEQUENTIAL";
  enrollmentMode: "OPEN";
  price: 0;
};

// ---------------------------------------------------------------- comparison

export function sameValue(a: unknown, b: unknown): boolean {
  if (a instanceof Date || b instanceof Date) {
    return (
      a instanceof Date && b instanceof Date && a.getTime() === b.getTime()
    );
  }
  if ((a && typeof a === "object") || (b && typeof b === "object")) {
    return canonicalJson(a ?? null) === canonicalJson(b ?? null);
  }
  return (a ?? null) === (b ?? null);
}

/** Fields of `desired` that differ from `existing`, with their desired values. */
export function changedFields<T extends { id: string }>(
  desired: T,
  existing: Record<string, unknown>,
  fields: readonly (keyof T & string)[],
): Update<T> | null {
  const data: Partial<T> = {};
  const changed: string[] = [];
  for (const field of fields) {
    if (!sameValue(desired[field], existing[field])) {
      data[field] = desired[field];
      changed.push(field);
    }
  }
  return changed.length ? { id: desired.id, data, fields: changed } : null;
}

function diffModel<T extends { id: string }>(
  desired: T[],
  existing: Map<string, Record<string, unknown>>,
  fields: readonly (keyof T & string)[],
): Omit<ModelPlan<T>, "remove"> {
  const plan: Omit<ModelPlan<T>, "remove"> = {
    create: [],
    update: [],
    unchanged: 0,
  };
  for (const row of desired) {
    const current = existing.get(row.id);
    if (!current) {
      plan.create.push(row);
      continue;
    }
    const update = changedFields(row, current, fields);
    if (update) plan.update.push(update);
    else plan.unchanged += 1;
  }
  return plan;
}

const byId = <T extends { id: string }>(rows: readonly T[]) =>
  new Map(
    rows.map((row) => [row.id, row as unknown as Record<string, unknown>]),
  );

const linkKey = (link: AssetLink) => `${link.parentId} ${link.assetId}`;

function diffLinks(
  desired: AssetLink[],
  existing: AssetLink[],
  parents: Set<string>,
) {
  const want = new Set(desired.map(linkKey));
  const have = new Set(
    existing.filter((link) => parents.has(link.parentId)).map(linkKey),
  );
  return {
    create: desired.filter((link) => !have.has(linkKey(link))),
    update: [],
    unchanged: desired.filter((link) => have.has(linkKey(link))).length,
    remove: existing
      .filter((link) => parents.has(link.parentId) && !want.has(linkKey(link)))
      .map((link) => ({
        id: linkKey(link),
        label: link.assetId,
        learnerData: null,
        parentId: link.parentId,
      })),
  } satisfies ModelPlan<AssetLink>;
}

export function describeLearnerData(data: LearnerData) {
  const parts = [
    data.progress && `${data.progress} progress`,
    data.attempts && `${data.attempts} attempts`,
    data.events && `${data.events} assessment events`,
    data.practiceAttempts && `${data.practiceAttempts} practice attempts`,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

// ---------------------------------------------------------------- planner

export function planImport(
  desired: DesiredCourse,
  snapshot: Snapshot,
): ImportPlan {
  const errors: string[] = [];
  const blocked: string[] = [];
  const courseId = snapshot.course?.id ?? null;

  const courseRow: CourseRow = {
    title: desired.title,
    description: desired.description,
    status: "PUBLISHED",
    progressionMode: "SEQUENTIAL",
    enrollmentMode: "OPEN",
    price: 0,
  };
  const courseUpdate = snapshot.course
    ? changedFields({ id: snapshot.course.id, ...courseRow }, snapshot.course, [
        "title",
        "description",
        "status",
        "progressionMode",
        "enrollmentMode",
        "price",
      ])
    : null;

  // Modules
  const desiredModules: ModuleRow[] = desired.modules.map(
    ({ items: _items, key: _key, ...row }) => row,
  );
  const desiredModuleIds = new Set(desiredModules.map((row) => row.id));
  const courseModules = snapshot.modules.filter(
    (row) => row.courseId === courseId,
  );
  for (const row of snapshot.modules) {
    if (row.courseId !== courseId && desiredModuleIds.has(row.id)) {
      errors.push(
        `module id ${row.id} already belongs to course ${row.courseId}`,
      );
    }
  }
  const modules: ModelPlan<ModuleRow> = {
    ...diffModel(desiredModules, byId(courseModules), [
      "title",
      "description",
      "position",
    ]),
    remove: [],
  };
  const staleModules = courseModules
    .filter((row) => !desiredModuleIds.has(row.id))
    .sort((a, b) => a.position - b.position);
  const keptModuleMoves = staleModules
    .map((row, index) => ({
      id: row.id,
      position: desiredModules.length + index,
      from: row.position,
    }))
    .filter((move) => move.position !== move.from)
    .map(({ id, position }) => ({ id, position }));

  // Items
  const desiredItems = desired.modules.flatMap((row) => row.items);
  const desiredItemRows: ItemRow[] = desiredItems.map(
    ({ material: _m, vocabularySet: _v, assessment: _a, key: _k, ...row }) =>
      row,
  );
  const desiredItemIds = new Set(desiredItemRows.map((row) => row.id));
  const courseItems = snapshot.items.filter((row) => row.courseId === courseId);
  for (const row of snapshot.items) {
    if (row.courseId !== courseId && desiredItemIds.has(row.id)) {
      errors.push(
        `course item id ${row.id} already belongs to course ${row.courseId}`,
      );
    }
  }
  const staleItems = courseItems.filter((row) => !desiredItemIds.has(row.id));
  const items: ModelPlan<ItemRow> = {
    ...diffModel(desiredItemRows, byId(courseItems), [
      "moduleId",
      "type",
      "position",
      "materialId",
      "vocabularySetId",
      "assessmentId",
      "isPublished",
    ]),
    remove: [],
  };
  // Stale items left in a module that is still in the content go behind its desired items.
  const keptItemMoves: ImportPlan["keptItemMoves"] = [];
  for (const courseModule of desired.modules) {
    staleItems
      .filter((row) => row.moduleId === courseModule.id)
      .sort((a, b) => a.position - b.position)
      .forEach((row, index) => {
        const position = courseModule.items.length + index;
        if (position !== row.position) {
          keptItemMoves.push({ id: row.id, moduleId: row.moduleId, position });
        }
      });
  }

  // Resources
  const materialsWanted = desiredItems.flatMap((item) =>
    item.material ? [item.material] : [],
  );
  const setsWanted = desiredItems.flatMap((item) =>
    item.vocabularySet ? [item.vocabularySet] : [],
  );
  const assessmentsWanted = desiredItems.flatMap((item) =>
    item.assessment ? [item.assessment] : [],
  );

  const foreign = (
    rows: { id: string; organizationId: string }[],
    wanted: { id: string }[],
  ) => {
    const ids = new Set(wanted.map((row) => row.id));
    for (const row of rows) {
      if (ids.has(row.id) && row.organizationId !== snapshot.organizationId) {
        errors.push(`${row.id} belongs to organization ${row.organizationId}`);
      }
    }
  };
  foreign(snapshot.materials, materialsWanted);
  foreign(snapshot.vocabularySets, setsWanted);
  foreign(snapshot.assessments, assessmentsWanted);

  const materials: ModelPlan<MaterialRow> = {
    ...diffModel(
      materialsWanted.map(
        ({ requirements: _r, assetIds: _a, ...row }): MaterialRow => ({
          ...row,
          requirementPolicy: "ALL",
        }),
      ),
      byId(snapshot.materials),
      ["title", "description", "content", "requirementPolicy"],
    ),
    remove: [],
  };
  const vocabularySets: ModelPlan<VocabularySetRow> = {
    ...diffModel(
      setsWanted.map(({ entries: _e, ...row }) => row),
      byId(snapshot.vocabularySets),
      ["title", "description"],
    ),
    remove: [],
  };
  const assessments: ModelPlan<AssessmentRow> = {
    ...diffModel(
      assessmentsWanted.map(({ questions: _q, assetIds: _a, ...row }) => row),
      byId(snapshot.assessments),
      [
        "title",
        "description",
        "instructions",
        "passingScore",
        "maxAttempts",
        "timeLimitMinutes",
        "shuffleQuestions",
        "shuffleOptions",
      ],
    ),
    remove: [],
  };

  // Sub-rows of the desired resources
  const materialIds = new Set(materialsWanted.map((row) => row.id));
  const setIds = new Set(setsWanted.map((row) => row.id));
  const assessmentIds = new Set(assessmentsWanted.map((row) => row.id));

  const requirementsWanted = materialsWanted.flatMap((row) => row.requirements);
  const requirementIds = new Set(requirementsWanted.map((row) => row.id));
  const requirements: ModelPlan<DesiredRequirement> = {
    ...diffModel(requirementsWanted, byId(snapshot.requirements), [
      "type",
      "assessmentId",
      "vocabularySetId",
      "minimumScore",
      "position",
    ]),
    remove: snapshot.requirements
      .filter(
        (row) => materialIds.has(row.materialId) && !requirementIds.has(row.id),
      )
      .map((row) => ({
        id: row.id,
        label: `${row.materialId} #${row.position}`,
        learnerData: null,
        parentId: row.materialId,
      })),
  };

  const entriesWanted = setsWanted.flatMap((row) => row.entries);
  const entryIds = new Set(entriesWanted.map((row) => row.id));
  const entries: ModelPlan<DesiredEntry> = {
    ...diffModel(entriesWanted, byId(snapshot.entries), [
      "vocabularySetId",
      "term",
      "meanings",
      "definition",
      "examples",
      "metadata",
      "audioAssetId",
      "createdAt",
    ]),
    remove: snapshot.entries
      .filter((row) => setIds.has(row.vocabularySetId) && !entryIds.has(row.id))
      .map((row) => ({
        id: row.id,
        label: `${row.term} (${row.vocabularySetId})`,
        learnerData: row.progressCount
          ? `${row.progressCount} learner progress`
          : null,
        parentId: row.vocabularySetId,
      })),
  };

  const questionsWanted = assessmentsWanted.flatMap((row) => row.questions);
  const questionIds = new Set(questionsWanted.map((row) => row.id));
  const questions: ModelPlan<QuestionRow> = {
    ...diffModel(
      questionsWanted.map(({ options: _o, ...row }) => row),
      byId(snapshot.questions),
      ["type", "prompt", "explanation", "points", "position"],
    ),
    remove: snapshot.questions
      .filter(
        (row) =>
          assessmentIds.has(row.assessmentId) && !questionIds.has(row.id),
      )
      .map((row) => ({
        id: row.id,
        label: row.id,
        learnerData: row.answerCount
          ? `${row.answerCount} learner answers`
          : null,
        parentId: row.assessmentId,
      })),
  };

  const optionsWanted = questionsWanted.flatMap((row) => row.options);
  const optionIds = new Set(optionsWanted.map((row) => row.id));
  const removedQuestionIds = new Set(questions.remove.map((row) => row.id));
  const options: ModelPlan<DesiredOption> = {
    ...diffModel(optionsWanted, byId(snapshot.options), [
      "content",
      "isCorrect",
      "position",
    ]),
    remove: snapshot.options
      .filter(
        (row) =>
          (questionIds.has(row.questionId) ||
            removedQuestionIds.has(row.questionId)) &&
          !optionIds.has(row.id),
      )
      .map((row) => ({
        id: row.id,
        label: row.id,
        learnerData: row.selectionCount
          ? `${row.selectionCount} learner selections`
          : null,
        parentId: row.questionId,
      })),
  };

  for (const removal of [
    ...entries.remove,
    ...questions.remove,
    ...options.remove,
  ]) {
    if (removal.learnerData)
      blocked.push(`${removal.label}: ${removal.learnerData}`);
  }

  const materialAssets = diffLinks(
    materialsWanted.flatMap((row) =>
      row.assetIds.map((assetId) => ({ parentId: row.id, assetId })),
    ),
    snapshot.materialAssets,
    materialIds,
  );
  const assessmentAssets = diffLinks(
    assessmentsWanted.flatMap((row) =>
      row.assetIds.map((assetId) => ({ parentId: row.id, assetId })),
    ),
    snapshot.assessmentAssets,
    assessmentIds,
  );

  // Stale modules, items and resources (deleted only with --prune)
  modules.remove = staleModules.map((row) => {
    const moduleItems = courseItems.filter((item) => item.moduleId === row.id);
    return {
      id: row.id,
      label: `${row.title} (${moduleItems.length} items)`,
      learnerData: null,
    };
  });
  items.remove = staleItems.map((row) => ({
    id: row.id,
    label: `${row.type.toLowerCase()} ${row.materialId ?? row.vocabularySetId ?? row.assessmentId} in ${row.moduleId}`,
    learnerData: describeLearnerData(row.learnerData),
  }));

  // A resource is stale when the course placed it (before this import) or it carries the importer's id prefix,
  // it is no longer in the content, and nothing outside the course places it.
  const placedHere = new Set(
    courseItems
      .flatMap((row) => [row.materialId, row.vocabularySetId, row.assessmentId])
      .filter((id): id is string => Boolean(id)),
  );
  const stale = <
    T extends { id: string; organizationId: string; title: string },
  >(
    rows: T[],
    wanted: Set<string>,
    learnerData: (row: T) => string | null = () => null,
  ) =>
    rows
      .filter(
        (row) =>
          row.organizationId === snapshot.organizationId &&
          !wanted.has(row.id) &&
          (placedHere.has(row.id) || row.id.startsWith(ID_PREFIX)) &&
          !snapshot.placedElsewhere.has(row.id),
      )
      .map((row) => ({
        id: row.id,
        label: row.title,
        learnerData: learnerData(row),
      }));

  const staleResources = {
    materials: stale(snapshot.materials, materialIds),
    vocabularySets: stale(snapshot.vocabularySets, setIds, (row) => {
      const count = snapshot.setProgress.get(row.id) ?? 0;
      return count ? `${count} vocabulary progress` : null;
    }),
    assessments: stale(snapshot.assessments, assessmentIds),
  };

  return {
    course: { create: !snapshot.course, update: courseUpdate, data: courseRow },
    modules,
    keptModuleMoves,
    items,
    keptItemMoves,
    materials,
    requirements,
    vocabularySets,
    entries,
    assessments,
    questions,
    options,
    materialAssets,
    assessmentAssets,
    staleResources,
    blocked,
    errors,
  };
}

/** Whether applying the plan would write anything (prunes count only when `prune`). */
export function planHasChanges(plan: ImportPlan, prune: boolean) {
  const models = [
    plan.modules,
    plan.items,
    plan.materials,
    plan.requirements,
    plan.vocabularySets,
    plan.entries,
    plan.assessments,
    plan.questions,
    plan.options,
    plan.materialAssets,
    plan.assessmentAssets,
  ];
  const subRowRemovals =
    plan.requirements.remove.length +
    plan.entries.remove.length +
    plan.questions.remove.length +
    plan.options.remove.length +
    plan.materialAssets.remove.length +
    plan.assessmentAssets.remove.length;
  const prunes =
    plan.modules.remove.length +
    plan.items.remove.length +
    plan.staleResources.materials.length +
    plan.staleResources.vocabularySets.length +
    plan.staleResources.assessments.length;
  return (
    plan.course.create ||
    Boolean(plan.course.update) ||
    models.some((model) => model.create.length || model.update.length) ||
    plan.keptModuleMoves.length > 0 ||
    plan.keptItemMoves.length > 0 ||
    subRowRemovals > 0 ||
    (prune && prunes > 0)
  );
}
