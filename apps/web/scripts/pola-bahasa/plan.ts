// The import plan: the desired courses, materials and quizzes (./curriculum.ts) against a snapshot of the
// database, as creates, updates (only the fields that differ), unchanged counts and the quiz questions and options
// the content no longer has. Pure, so the dry run and the tests share it with --execute.
import { canonicalJson } from "../hangeul-mastery/ids";

import type {
  DesiredAssessment,
  DesiredCourse,
  DesiredItem,
  DesiredMaterial,
  DesiredModule,
  DesiredOption,
  DesiredQuestion,
} from "./curriculum";

// ---------------------------------------------------------------- snapshot

export type SnapshotCourse = {
  id: string;
  organizationId: string;
  title: string;
  slug: string;
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
  /** Course of the item's module. */
  courseId: string;
  type: string;
  position: number;
  materialId: string | null;
  assessmentId: string | null;
  isPublished: boolean;
};
export type SnapshotMaterial = {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  content: unknown;
  editorSchemaVersion: number;
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

export type Snapshot = {
  organizationId: string;
  /** Courses with a desired id, plus courses of the organization holding a desired slug. */
  courses: SnapshotCourse[];
  /** Modules of the desired courses, plus modules elsewhere holding a desired id. */
  modules: SnapshotModule[];
  /** Items of the desired courses, plus items elsewhere holding a desired id. */
  items: SnapshotItem[];
  /** Materials holding a desired id. */
  materials: SnapshotMaterial[];
  /** Assessments holding a desired id. */
  assessments: SnapshotAssessment[];
  /** Questions of those assessments, plus questions elsewhere holding a desired id. */
  questions: SnapshotQuestion[];
  /** Options of those questions, plus options elsewhere holding a desired id. */
  options: SnapshotOption[];
};

// ---------------------------------------------------------------- plan

export type CourseRow = Omit<DesiredCourse, "modules" | "key">;
export type ModuleRow = Omit<DesiredModule, "items" | "key">;
export type ItemRow = Omit<DesiredItem, "key">;
export type MaterialRow = DesiredMaterial;
export type AssessmentRow = Omit<DesiredAssessment, "questions" | "key">;
export type QuestionRow = Omit<DesiredQuestion, "options">;
export type OptionRow = DesiredOption;
/** A quiz question or option the content no longer has; deleted by the import, listed in every run. */
export type Removal = { id: string; parentId: string };

export type Update<T> = { id: string; data: Partial<T>; fields: string[] };
export type ModelPlan<T> = {
  create: T[];
  update: Update<T>[];
  unchanged: number;
};

export type ImportPlan = {
  courses: ModelPlan<CourseRow>;
  modules: ModelPlan<ModuleRow>;
  materials: ModelPlan<MaterialRow>;
  items: ModelPlan<ItemRow>;
  assessments: ModelPlan<AssessmentRow>;
  questions: ModelPlan<QuestionRow> & { remove: Removal[] };
  options: ModelPlan<OptionRow> & { remove: Removal[] };
  /** Problems that stop the import (id collisions, rows the content no longer has, removals with learner work). */
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
  "enrollmentMode",
  "price",
] as const;
const MODULE_FIELDS = ["title", "description", "position"] as const;
const MATERIAL_FIELDS = [
  "title",
  "description",
  "content",
  "editorSchemaVersion",
] as const;
const ITEM_FIELDS = [
  "moduleId",
  "type",
  "position",
  "materialId",
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

export function planImport(
  courses: DesiredCourse[],
  materials: DesiredMaterial[],
  assessments: DesiredAssessment[],
  snapshot: Snapshot,
): ImportPlan {
  const errors: string[] = [];
  const byId = <T extends { id: string }>(rows: T[]) =>
    new Map(
      rows.map((row) => [row.id, row as unknown as Record<string, unknown>]),
    );

  const courseIds = new Set(courses.map((row) => row.id));
  const desiredModules = courses.flatMap((course) => course.modules);
  const desiredItems = desiredModules.flatMap((row) => row.items);
  const moduleCourse = new Map(
    desiredModules.map((row) => [row.id, row.courseId]),
  );
  const itemCourse = new Map(
    desiredItems.map((row) => [row.id, moduleCourse.get(row.moduleId)!]),
  );

  for (const course of snapshot.courses) {
    if (courseIds.has(course.id)) {
      if (course.organizationId !== snapshot.organizationId) {
        errors.push(
          `course ${course.id} exists in organization ${course.organizationId}`,
        );
      }
      continue;
    }
    const clash = courses.find((row) => row.slug === course.slug);
    if (clash && course.organizationId === snapshot.organizationId) {
      errors.push(
        `course ${course.id} already uses the slug "${course.slug}" wanted by ${clash.id}`,
      );
    }
  }
  for (const row of snapshot.modules) {
    const wanted = moduleCourse.get(row.id);
    if (wanted && wanted !== row.courseId) {
      errors.push(
        `module ${row.id} exists in course ${row.courseId}, not ${wanted}`,
      );
    } else if (!wanted && courseIds.has(row.courseId)) {
      errors.push(
        `module ${row.id} "${row.title}" of ${row.courseId} is not in the manifest; keys never change, so remove or restore it by hand`,
      );
    }
  }
  for (const row of snapshot.items) {
    const wanted = itemCourse.get(row.id);
    if (wanted && wanted !== row.courseId) {
      errors.push(
        `item ${row.id} exists in course ${row.courseId}, not ${wanted}`,
      );
    } else if (!wanted && courseIds.has(row.courseId)) {
      errors.push(
        `item ${row.id} of ${row.courseId} is not in the manifest; keys never change, so remove or restore it by hand`,
      );
    }
  }
  for (const row of snapshot.materials) {
    if (row.organizationId !== snapshot.organizationId) {
      errors.push(
        `material ${row.id} exists in organization ${row.organizationId}`,
      );
    }
  }

  // Quizzes: the assessment rows, then their questions and options. A question or option of a quiz that the content
  // no longer has is deleted, unless learners answered it: then the import refuses, and it has to go by hand.
  for (const row of snapshot.assessments) {
    if (row.organizationId !== snapshot.organizationId) {
      errors.push(
        `assessment ${row.id} exists in organization ${row.organizationId}`,
      );
    }
  }
  const assessmentIds = new Set(assessments.map((row) => row.id));
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
      } else {
        removeQuestions.push({ id: row.id, parentId: row.assessmentId });
      }
    }
  }
  const snapshotQuestionIds = new Set(
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
    } else if (!wanted && snapshotQuestionIds.has(row.questionId)) {
      if (row.selectionCount) {
        errors.push(
          `option ${row.id} is no longer in the quiz (its text changed or it was removed) but learners chose it ${row.selectionCount} times; restore its text or remove it by hand`,
        );
      } else {
        removeOptions.push({ id: row.id, parentId: row.questionId });
      }
    }
  }

  return {
    courses: planModel(
      courses.map(({ modules: _modules, key: _key, ...row }) => row),
      byId(snapshot.courses.filter((row) => courseIds.has(row.id))),
      COURSE_FIELDS,
    ),
    modules: planModel(
      desiredModules.map(({ items: _items, key: _key, ...row }) => row),
      byId(snapshot.modules),
      MODULE_FIELDS,
    ),
    materials: planModel(materials, byId(snapshot.materials), MATERIAL_FIELDS),
    items: planModel(
      desiredItems.map(({ key: _key, ...row }) => row),
      byId(snapshot.items),
      ITEM_FIELDS,
    ),
    assessments: planModel(
      assessments.map(({ questions: _questions, key: _key, ...row }) => row),
      byId(snapshot.assessments),
      ASSESSMENT_FIELDS,
    ),
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

export function planHasChanges(plan: ImportPlan) {
  return (
    [
      plan.courses,
      plan.modules,
      plan.materials,
      plan.items,
      plan.assessments,
      plan.questions,
      plan.options,
    ].some((model) => model.create.length > 0 || model.update.length > 0) ||
    plan.questions.remove.length > 0 ||
    plan.options.remove.length > 0
  );
}
