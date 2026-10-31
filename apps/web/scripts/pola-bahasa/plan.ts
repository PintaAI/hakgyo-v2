// The import plan: the desired courses, materials, vocabulary sets and quizzes (./curriculum.ts) against a snapshot
// of the database, as creates, updates (only the fields that differ), unchanged counts, and deletions of the Pola
// rows the content no longer has. Pure, so the dry run and the tests share it with --execute.
//
// Deletions only ever cover rows inside the two Pola courses (modules, items) and `pb-` resources of the system
// organization (materials, vocabulary sets and entries, quizzes, questions, options). A row with learner data, a
// resource placed outside the Pola courses, or any deletion while the courses have enrollments is an error: the
// import refuses instead of deleting.
import { canonicalJson } from "../hangeul-mastery/ids";

import type {
  DesiredAssessment,
  DesiredCourse,
  DesiredEntry,
  DesiredItem,
  DesiredMaterial,
  DesiredModule,
  DesiredOption,
  DesiredQuestion,
  DesiredVocabularySet,
} from "./curriculum";
import { ID_PREFIX } from "./ids";

// ---------------------------------------------------------------- snapshot

export type SnapshotCourse = {
  id: string;
  organizationId: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  progressionMode: string;
  /** Enrollments in the course's classes. */
  enrollmentCount: number;
};
export type SnapshotModule = {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  position: number;
  /** Cohort meetings planned for the module. */
  meetingCount: number;
};
export type ItemLearnerData = {
  progress: number;
  attempts: number;
  events: number;
  practiceAttempts: number;
};
export type SnapshotItem = {
  id: string;
  moduleId: string;
  /** Course of the item's module. */
  courseId: string;
  type: string;
  position: number;
  materialId: string | null;
  vocabularySetId: string | null;
  assessmentId: string | null;
  isPublished: boolean;
  learnerData: ItemLearnerData;
};
export type SnapshotMaterial = {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  content: unknown;
  editorSchemaVersion: number;
};
export type SnapshotVocabularySet = {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  /** Material requirements that require the set. */
  requirementCount: number;
};
export type SnapshotEntry = {
  id: string;
  vocabularySetId: string;
  term: string;
  meanings: string[];
  definition: string;
  examples: unknown;
  createdAt: Date;
  /** Learners' vocabulary progress and practice attempts on the entry. */
  progressCount: number;
  practiceCount: number;
};
export type SnapshotAssessment = {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  instructions: unknown;
  passingScore: number | null;
  maxAttempts: number | null;
  timeLimitMinutes: number | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  editorSchemaVersion: number;
  attemptCount: number;
  /** Material requirements that require the quiz, and whether it is published as a public quiz. */
  requirementCount: number;
  publicQuiz: boolean;
};
export type SnapshotQuestion = {
  id: string;
  assessmentId: string;
  type: string;
  prompt: unknown;
  explanation: unknown;
  points: number;
  position: number;
  /** Learner answers to the question (deleting it would lose them). */
  answerCount: number;
};
export type SnapshotOption = {
  id: string;
  questionId: string;
  content: unknown;
  isCorrect: boolean;
  position: number;
  /** Learner selections of the option (deleting it would lose them). */
  selectionCount: number;
};
/** A course item anywhere that places one of the snapshot's resources. */
export type SnapshotPlacement = {
  itemId: string;
  courseId: string;
  materialId: string | null;
  vocabularySetId: string | null;
  assessmentId: string | null;
};

export type Snapshot = {
  organizationId: string;
  /** Courses with a desired id, plus courses of the organization holding a desired slug. */
  courses: SnapshotCourse[];
  /** Modules of the desired courses, plus modules elsewhere holding a desired id. */
  modules: SnapshotModule[];
  /** Items of the desired courses, plus items elsewhere holding a desired id. */
  items: SnapshotItem[];
  /** Materials holding a desired id or placed in the desired courses, plus every `pb-` material of the organization. */
  materials: SnapshotMaterial[];
  /** Vocabulary sets, likewise. */
  vocabularySets: SnapshotVocabularySet[];
  /** Entries of those sets, plus entries elsewhere holding a desired id. */
  entries: SnapshotEntry[];
  /** Assessments, likewise. */
  assessments: SnapshotAssessment[];
  /** Questions of those assessments, plus questions elsewhere holding a desired id. */
  questions: SnapshotQuestion[];
  /** Options of those questions, plus options elsewhere holding a desired id. */
  options: SnapshotOption[];
  /** Every course item that places one of the snapshot's materials, vocabulary sets or assessments. */
  placements: SnapshotPlacement[];
};

// ---------------------------------------------------------------- plan

export type CourseRow = Omit<DesiredCourse, "modules" | "key">;
export type ModuleRow = Omit<DesiredModule, "items" | "key">;
export type ItemRow = Omit<DesiredItem, "key">;
export type MaterialRow = Omit<DesiredMaterial, "key">;
export type VocabularySetRow = Omit<DesiredVocabularySet, "entries" | "key">;
export type EntryRow = DesiredEntry;
export type AssessmentRow = Omit<DesiredAssessment, "questions" | "key">;
export type QuestionRow = Omit<DesiredQuestion, "options">;
export type OptionRow = DesiredOption;
/** A row the content no longer has; deleted by --execute, listed in every run. */
export type Removal = { id: string; parentId: string; title?: string };

export type Update<T> = { id: string; data: Partial<T>; fields: string[] };
export type ModelPlan<T> = {
  create: T[];
  update: Update<T>[];
  unchanged: number;
};
type WithRemovals<T> = ModelPlan<T> & { remove: Removal[] };

export type ImportPlan = {
  courses: ModelPlan<CourseRow>;
  modules: WithRemovals<ModuleRow>;
  materials: WithRemovals<MaterialRow>;
  vocabularySets: WithRemovals<VocabularySetRow>;
  entries: WithRemovals<EntryRow>;
  items: WithRemovals<ItemRow>;
  assessments: WithRemovals<AssessmentRow>;
  questions: WithRemovals<QuestionRow>;
  options: WithRemovals<OptionRow>;
  /** Problems that stop the import (id collisions, deletions that would lose learner data). */
  errors: string[];
};

export function sameValue(a: unknown, b: unknown): boolean {
  if ((a && typeof a === "object") || (b && typeof b === "object")) {
    return canonicalJson(a ?? null) === canonicalJson(b ?? null);
  }
  return (a ?? null) === (b ?? null);
}

/** Fields of `desired` that differ from `existing`, with their desired values. */
export function diffFields<T extends Record<string, unknown>>(
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
  return changed.length
    ? { id: desired.id as string, data, fields: changed }
    : null;
}

function planModel<T extends { id: string }>(
  desired: T[],
  existing: Map<string, Record<string, unknown>>,
  fields: readonly (keyof T & string)[],
): ModelPlan<T> {
  const plan: ModelPlan<T> = { create: [], update: [], unchanged: 0 };
  for (const row of desired) {
    const current = existing.get(row.id);
    if (!current) {
      plan.create.push(row);
      continue;
    }
    const update = diffFields(
      row as T & Record<string, unknown>,
      current,
      fields,
    );
    if (update) plan.update.push(update);
    else plan.unchanged += 1;
  }
  return plan;
}

const COURSE_FIELDS = [
  "title",
  "slug",
  "description",
  "status",
  "progressionMode",
] as const;
const MODULE_FIELDS = ["title", "description", "position"] as const;
const MATERIAL_FIELDS = [
  "title",
  "description",
  "content",
  "editorSchemaVersion",
] as const;
const VOCABULARY_SET_FIELDS = ["title", "description"] as const;
const ENTRY_FIELDS = [
  "term",
  "meanings",
  "definition",
  "examples",
  "createdAt",
] as const;
const ITEM_FIELDS = [
  "moduleId",
  "type",
  "position",
  "materialId",
  "vocabularySetId",
  "assessmentId",
  "isPublished",
] as const;
const ASSESSMENT_FIELDS = [
  "title",
  "description",
  "instructions",
  "passingScore",
  "maxAttempts",
  "timeLimitMinutes",
  "shuffleQuestions",
  "shuffleOptions",
  "editorSchemaVersion",
] as const;
const QUESTION_FIELDS = [
  "type",
  "prompt",
  "explanation",
  "points",
  "position",
] as const;
const OPTION_FIELDS = ["content", "isCorrect", "position"] as const;

const counts = (data: Record<string, number>) =>
  Object.entries(data)
    .filter(([, count]) => count > 0)
    .map(([name, count]) => `${count} ${name}`)
    .join(", ");

export function planImport(
  courses: DesiredCourse[],
  materials: DesiredMaterial[],
  vocabularySets: DesiredVocabularySet[],
  assessments: DesiredAssessment[],
  snapshot: Snapshot,
): ImportPlan {
  const errors: string[] = [];
  const org = snapshot.organizationId;
  const byId = <T extends { id: string }>(rows: T[]) =>
    new Map(
      rows.map((row) => [row.id, row as unknown as Record<string, unknown>]),
    );
  const ownedPola = (row: { id: string; organizationId: string }) =>
    row.organizationId === org && row.id.startsWith(ID_PREFIX);

  const courseIds = new Set(courses.map((row) => row.id));
  const desiredModules = courses.flatMap((course) => course.modules);
  const desiredItems = desiredModules.flatMap((row) => row.items);
  const moduleCourse = new Map(
    desiredModules.map((row) => [row.id, row.courseId]),
  );
  const itemCourse = new Map(
    desiredItems.map((row) => [row.id, moduleCourse.get(row.moduleId)!]),
  );

  // ---- courses, modules and items: collisions, and rows of the Pola courses the manifest no longer has.
  for (const course of snapshot.courses) {
    if (courseIds.has(course.id)) {
      if (course.organizationId !== org) {
        errors.push(
          `course ${course.id} exists in organization ${course.organizationId}`,
        );
      }
      continue;
    }
    const clash = courses.find((row) => row.slug === course.slug);
    if (clash && course.organizationId === org) {
      errors.push(
        `course ${course.id} already uses the slug "${course.slug}" wanted by ${clash.id}`,
      );
    }
  }
  const removeModules: Removal[] = [];
  for (const row of snapshot.modules) {
    const wanted = moduleCourse.get(row.id);
    if (wanted && wanted !== row.courseId) {
      errors.push(
        `module ${row.id} exists in course ${row.courseId}, not ${wanted}`,
      );
    } else if (!wanted && courseIds.has(row.courseId)) {
      if (row.meetingCount) {
        errors.push(
          `module ${row.id} "${row.title}" is no longer in the manifest but has ${row.meetingCount} cohort meetings; remove them by hand first`,
        );
      }
      removeModules.push({
        id: row.id,
        parentId: row.courseId,
        title: row.title,
      });
    }
  }
  const removeItems: Removal[] = [];
  for (const row of snapshot.items) {
    const wanted = itemCourse.get(row.id);
    if (wanted && wanted !== row.courseId) {
      errors.push(
        `item ${row.id} exists in course ${row.courseId}, not ${wanted}`,
      );
    } else if (!wanted && courseIds.has(row.courseId)) {
      const learner = counts(row.learnerData);
      if (learner) {
        errors.push(
          `item ${row.id} is no longer in the manifest but has learner data (${learner}); the import never deletes learner work, remove it by hand`,
        );
      }
      removeItems.push({ id: row.id, parentId: row.moduleId });
    }
  }
  const removedItemIds = new Set(removeItems.map((row) => row.id));
  const desiredItemIds = new Set(desiredItems.map((row) => row.id));
  /** Items that place a resource and survive the import (neither desired nor removed). */
  const otherPlacements = (
    field: "materialId" | "vocabularySetId" | "assessmentId",
    id: string,
  ) =>
    snapshot.placements.filter(
      (row) =>
        row[field] === id &&
        !removedItemIds.has(row.itemId) &&
        !desiredItemIds.has(row.itemId),
    );
  const placementError = (
    kind: string,
    id: string,
    rows: SnapshotPlacement[],
  ) =>
    `${kind} ${id} is no longer in the content but is placed by ${rows.map((row) => `item ${row.itemId} of ${row.courseId}`).join(", ")}; remove those items by hand first`;

  // ---- materials
  const materialIds = new Set(materials.map((row) => row.id));
  const removeMaterials: Removal[] = [];
  for (const row of snapshot.materials) {
    if (materialIds.has(row.id)) {
      if (row.organizationId !== org) {
        errors.push(
          `material ${row.id} exists in organization ${row.organizationId}`,
        );
      }
      continue;
    }
    if (!ownedPola(row)) continue;
    const placed = otherPlacements("materialId", row.id);
    if (placed.length) errors.push(placementError("material", row.id, placed));
    removeMaterials.push({
      id: row.id,
      parentId: row.organizationId,
      title: row.title,
    });
  }

  // ---- vocabulary sets and entries
  const setIds = new Set(vocabularySets.map((row) => row.id));
  const desiredEntries = vocabularySets.flatMap((row) => row.entries);
  const entrySet = new Map(
    desiredEntries.map((row) => [row.id, row.vocabularySetId]),
  );
  const removeSets: Removal[] = [];
  for (const row of snapshot.vocabularySets) {
    if (setIds.has(row.id)) {
      if (row.organizationId !== org) {
        errors.push(
          `vocabulary set ${row.id} exists in organization ${row.organizationId}`,
        );
      }
      continue;
    }
    if (!ownedPola(row)) continue;
    const placed = otherPlacements("vocabularySetId", row.id);
    if (placed.length)
      errors.push(placementError("vocabulary set", row.id, placed));
    if (row.requirementCount) {
      errors.push(
        `vocabulary set ${row.id} is no longer in the content but ${row.requirementCount} material requirements need it; remove them by hand first`,
      );
    }
    const learner = snapshot.entries
      .filter((entry) => entry.vocabularySetId === row.id)
      .reduce(
        (sum, entry) => sum + entry.progressCount + entry.practiceCount,
        0,
      );
    if (learner) {
      errors.push(
        `vocabulary set ${row.id} is no longer in the content but learners have ${learner} progress or practice rows on its entries; remove it by hand`,
      );
    }
    removeSets.push({
      id: row.id,
      parentId: row.organizationId,
      title: row.title,
    });
  }
  const removeEntries: Removal[] = [];
  for (const row of snapshot.entries) {
    const wanted = entrySet.get(row.id);
    if (wanted && wanted !== row.vocabularySetId) {
      errors.push(
        `vocabulary entry ${row.id} exists in set ${row.vocabularySetId}, not ${wanted}`,
      );
    } else if (!wanted && setIds.has(row.vocabularySetId)) {
      const learner = counts({
        progress: row.progressCount,
        "practice attempts": row.practiceCount,
      });
      if (learner) {
        errors.push(
          `vocabulary entry ${row.id} "${row.term}" is no longer in the set but has learner data (${learner}); restore its material or remove it by hand`,
        );
      }
      removeEntries.push({
        id: row.id,
        parentId: row.vocabularySetId,
        title: row.term,
      });
    }
  }

  // ---- quizzes, then their questions and options
  const assessmentIds = new Set(assessments.map((row) => row.id));
  const removeAssessments: Removal[] = [];
  for (const row of snapshot.assessments) {
    if (assessmentIds.has(row.id)) {
      if (row.organizationId !== org) {
        errors.push(
          `assessment ${row.id} exists in organization ${row.organizationId}`,
        );
      }
      continue;
    }
    if (!ownedPola(row)) continue;
    const placed = otherPlacements("assessmentId", row.id);
    if (placed.length)
      errors.push(placementError("assessment", row.id, placed));
    const blockers = counts({
      "learner attempts": row.attemptCount,
      "material requirements": row.requirementCount,
      "public quiz": row.publicQuiz ? 1 : 0,
    });
    if (blockers) {
      errors.push(
        `assessment ${row.id} is no longer in the content but has ${blockers}; remove it by hand`,
      );
    }
    removeAssessments.push({
      id: row.id,
      parentId: row.organizationId,
      title: row.title,
    });
  }
  const desiredQuestions = assessments.flatMap((row) => row.questions);
  const questionAssessment = new Map(
    desiredQuestions.map((row) => [row.id, row.assessmentId]),
  );
  const desiredOptions = desiredQuestions.flatMap((row) => row.options);
  const optionQuestion = new Map(
    desiredOptions.map((row) => [row.id, row.questionId]),
  );
  const removeQuestions: Removal[] = [];
  for (const row of snapshot.questions) {
    const wanted = questionAssessment.get(row.id);
    if (wanted && wanted !== row.assessmentId) {
      errors.push(
        `question ${row.id} exists in assessment ${row.assessmentId}, not ${wanted}`,
      );
    } else if (!wanted && assessmentIds.has(row.assessmentId)) {
      if (row.answerCount) {
        errors.push(
          `question ${row.id} is no longer in the quiz but has ${row.answerCount} learner answers; restore its key or remove it by hand`,
        );
      }
      removeQuestions.push({ id: row.id, parentId: row.assessmentId });
    }
  }
  const keptQuestionIds = new Set(
    snapshot.questions
      .filter((row) => assessmentIds.has(row.assessmentId))
      .map((row) => row.id),
  );
  const removeOptions: Removal[] = [];
  for (const row of snapshot.options) {
    const wanted = optionQuestion.get(row.id);
    if (wanted && wanted !== row.questionId) {
      errors.push(
        `option ${row.id} exists in question ${row.questionId}, not ${wanted}`,
      );
    } else if (!wanted && keptQuestionIds.has(row.questionId)) {
      if (row.selectionCount) {
        errors.push(
          `option ${row.id} is no longer in the quiz (its text changed or it was removed) but learners chose it ${row.selectionCount} times; restore its text or remove it by hand`,
        );
      }
      removeOptions.push({ id: row.id, parentId: row.questionId });
    }
  }

  // ---- no deletions at all while learners are enrolled in a Pola course.
  const deletions =
    removeModules.length +
    removeItems.length +
    removeMaterials.length +
    removeSets.length +
    removeEntries.length +
    removeAssessments.length +
    removeQuestions.length +
    removeOptions.length;
  if (deletions) {
    for (const course of snapshot.courses) {
      if (courseIds.has(course.id) && course.enrollmentCount) {
        errors.push(
          `course ${course.id} has ${course.enrollmentCount} enrollments, so the import deletes nothing (${deletions} rows are no longer in the content); remove them by hand`,
        );
      }
    }
  }

  return {
    courses: planModel(
      courses.map(({ modules: _modules, key: _key, ...row }) => row),
      byId(snapshot.courses.filter((row) => courseIds.has(row.id))),
      COURSE_FIELDS,
    ),
    modules: {
      ...planModel(
        desiredModules.map(({ items: _items, key: _key, ...row }) => row),
        byId(snapshot.modules),
        MODULE_FIELDS,
      ),
      remove: removeModules,
    },
    materials: {
      ...planModel(
        materials.map(({ key: _key, ...row }) => row),
        byId(snapshot.materials),
        MATERIAL_FIELDS,
      ),
      remove: removeMaterials,
    },
    vocabularySets: {
      ...planModel(
        vocabularySets.map(({ entries: _entries, key: _key, ...row }) => row),
        byId(snapshot.vocabularySets),
        VOCABULARY_SET_FIELDS,
      ),
      remove: removeSets,
    },
    entries: {
      ...planModel(
        desiredEntries,
        byId(
          snapshot.entries.filter(
            (row) => entrySet.get(row.id) === row.vocabularySetId,
          ),
        ),
        ENTRY_FIELDS,
      ),
      remove: removeEntries,
    },
    items: {
      ...planModel(
        desiredItems.map(({ key: _key, ...row }) => row),
        byId(snapshot.items),
        ITEM_FIELDS,
      ),
      remove: removeItems,
    },
    assessments: {
      ...planModel(
        assessments.map(({ questions: _questions, key: _key, ...row }) => row),
        byId(snapshot.assessments),
        ASSESSMENT_FIELDS,
      ),
      remove: removeAssessments,
    },
    questions: {
      ...planModel(
        desiredQuestions.map(({ options: _options, ...row }) => row),
        byId(
          snapshot.questions.filter(
            (row) => questionAssessment.get(row.id) === row.assessmentId,
          ),
        ),
        QUESTION_FIELDS,
      ),
      remove: removeQuestions,
    },
    options: {
      ...planModel(
        desiredOptions,
        byId(
          snapshot.options.filter(
            (row) => optionQuestion.get(row.id) === row.questionId,
          ),
        ),
        OPTION_FIELDS,
      ),
      remove: removeOptions,
    },
    errors,
  };
}

const MODELS = [
  "courses",
  "modules",
  "materials",
  "vocabularySets",
  "entries",
  "items",
  "assessments",
  "questions",
  "options",
] as const;

export function planHasChanges(plan: ImportPlan) {
  return MODELS.some((name) => {
    const model = plan[name] as ModelPlan<unknown> & { remove?: Removal[] };
    return (
      model.create.length > 0 ||
      model.update.length > 0 ||
      (model.remove?.length ?? 0) > 0
    );
  });
}

/** Every row the plan deletes, by kind, in the order --execute deletes them. */
export function planRemovals(plan: ImportPlan) {
  return {
    items: plan.items.remove,
    modules: plan.modules.remove,
    options: plan.options.remove,
    questions: plan.questions.remove,
    entries: plan.entries.remove,
    materials: plan.materials.remove,
    vocabularySets: plan.vocabularySets.remove,
    assessments: plan.assessments.remove,
  };
}
