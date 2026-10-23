// Content -> the rows the course should have (pure, no database). Keys become stable ids, placeholders become
// asset and resource ids, strings become BlockNote documents, and every document and the course readiness rules
// are checked so the import can never leave the course broken.
import {
  assessmentContentAssetIds,
  collectContentAssetIds,
} from "@hakgyo/shared";

import { findBlockNoteDocumentIssues } from "~/lib/blocknote/document-validation";
import { collectMaterialAssetIds } from "~/lib/blocknote/material-assets";
import { collectMaterialReferenceIds } from "~/lib/blocknote/resource-references";
import {
  computeCourseReadiness,
  summarizeAssessmentReadiness,
  type ReadinessAssessment,
  type ReadinessItem,
  type ReadinessMaterial,
} from "~/server/course/readiness";

import { p } from "./blocks";
import type {
  AssessmentContent,
  BlockNoteBlock,
  CourseContent,
  ItemContent,
  MaterialContent,
  VocabularySetContent,
} from "./content-types";
import {
  assessmentId,
  entryCreatedAt,
  entryId,
  isValidKey,
  itemId,
  materialId,
  moduleId,
  normalizeTerm,
  optionId,
  questionId,
  requirementId,
  vocabularySetId,
} from "./ids";
import { replacePlaceholders } from "./placeholders";

/** A BlockNote document or other JSON column value. */
export type Json = unknown;

export type DesiredMaterial = {
  id: string;
  title: string;
  description: string | null;
  content: Json;
  requirements: DesiredRequirement[];
  assetIds: string[];
};

export type DesiredRequirement = {
  id: string;
  materialId: string;
  type: "ASSESSMENT" | "VOCABULARY_SET";
  assessmentId: string | null;
  vocabularySetId: string | null;
  minimumScore: number | null;
  position: number;
};

export type DesiredEntry = {
  id: string;
  vocabularySetId: string;
  term: string;
  definition: string;
  examples: string[];
  metadata: { romanization: string } | null;
  audioAssetId: string | null;
  createdAt: Date;
};

export type DesiredVocabularySet = {
  id: string;
  title: string;
  description: string | null;
  entries: DesiredEntry[];
};

export type DesiredOption = {
  id: string;
  questionId: string;
  content: Json;
  isCorrect: boolean;
  position: number;
};

export type DesiredQuestion = {
  id: string;
  assessmentId: string;
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE";
  prompt: Json;
  explanation: Json;
  points: number;
  position: number;
  options: DesiredOption[];
};

export type DesiredAssessment = {
  id: string;
  title: string;
  description: string | null;
  instructions: Json;
  passingScore: number;
  maxAttempts: null;
  timeLimitMinutes: number | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  questions: DesiredQuestion[];
  assetIds: string[];
};

export type DesiredItem = {
  id: string;
  key: string;
  moduleId: string;
  position: number;
  type: "MATERIAL" | "VOCABULARY_SET" | "ASSESSMENT";
  materialId: string | null;
  vocabularySetId: string | null;
  assessmentId: string | null;
  isPublished: true;
  material?: DesiredMaterial;
  vocabularySet?: DesiredVocabularySet;
  assessment?: DesiredAssessment;
};

export type DesiredModule = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  position: number;
  items: DesiredItem[];
};

export type DesiredCourse = {
  title: string;
  description: string | null;
  modules: DesiredModule[];
};

export type BuildOptions = {
  /** Asset id of the clip for a Korean text, or undefined when there is none yet. */
  resolveAudio: (text: string) => string | undefined;
  /** Strip unresolved clips to "" (the player hides) instead of failing. */
  allowMissingAudio?: boolean;
};

export type BuildResult = {
  course: DesiredCourse;
  errors: string[];
  /** Texts without a clip (stripped when allowMissingAudio, otherwise also in errors). */
  missingAudio: string[];
};

const isIntegerIn = (value: number, min: number, max: number) =>
  Number.isInteger(value) && value >= min && value <= max;

const emptyToNull = (value: string | undefined) =>
  value?.trim() ? value : null;

/** A string becomes a one-paragraph document; blocks are kept as they are. */
export function toDocument(value: string | BlockNoteBlock[]): BlockNoteBlock[] {
  return typeof value === "string" ? [p(value)] : value;
}

function resourceIdOf(item: ItemContent) {
  return item.type === "material"
    ? materialId(item.key)
    : item.type === "vocabulary"
      ? vocabularySetId(item.key)
      : assessmentId(item.key);
}

export function buildDesiredCourse(
  content: CourseContent,
  options: BuildOptions,
): BuildResult {
  const errors: string[] = [];
  const missingAudio = new Set<string>();
  const seenModules = new Set<string>();
  const seenItems = new Map<string, string>();

  for (const courseModule of content.modules) {
    if (!isValidKey(courseModule.key)) {
      errors.push(`module key "${courseModule.key}" must be kebab-case`);
    }
    if (seenModules.has(courseModule.key)) {
      errors.push(`module key "${courseModule.key}" is used twice`);
    }
    seenModules.add(courseModule.key);
    for (const item of courseModule.items) {
      if (!isValidKey(item.key)) {
        errors.push(`item key "${item.key}" must be kebab-case`);
      }
      const other = seenItems.get(item.key);
      if (other) {
        errors.push(
          `item key "${item.key}" is used twice (modules ${other} and ${courseModule.key}); item keys are unique in the course`,
        );
      }
      seenItems.set(item.key, courseModule.key);
    }
  }

  const modules = content.modules.map((courseModule, modulePosition) => {
    const id = moduleId(courseModule.key);
    const itemsByKey = new Map(
      courseModule.items.map((item) => [item.key, item]),
    );
    const where = (item: ItemContent) => `${courseModule.key} / ${item.key}`;

    // The resource id of the item `key` in this module, of the expected kind.
    const resolveItem = (
      key: string,
      from: string,
      expected?: "vocabulary" | "assessment",
    ) => {
      const target = itemsByKey.get(key);
      if (!target) {
        const elsewhere = seenItems.get(key);
        errors.push(
          elsewhere
            ? `${from}: "${key}" is in module ${elsewhere}; references must point at an item of the same module`
            : `${from}: no item "${key}" in this module`,
        );
        return "";
      }
      if (expected && target.type !== expected) {
        errors.push(
          `${from}: "${key}" is a ${target.type}, expected ${expected}`,
        );
        return "";
      }
      return resourceIdOf(target);
    };

    const resolve = (from: string) => (value: unknown) =>
      replacePlaceholders(value, (placeholder) => {
        if (placeholder.kind === "item") {
          return resolveItem(placeholder.value, from);
        }
        const text = normalizeTerm(placeholder.value);
        const assetId = options.resolveAudio(text);
        if (assetId) return assetId;
        missingAudio.add(text);
        return "";
      });

    const checkDocument = (from: string, document: unknown) => {
      if (!Array.isArray(document)) {
        errors.push(`${from}: must be a list of blocks`);
        return;
      }
      for (const issue of findBlockNoteDocumentIssues(document)) {
        errors.push(`${from} at ${issue.path.join(".")}: ${issue.message}`);
      }
    };

    const items = courseModule.items.map((item, position): DesiredItem => {
      const base = {
        id: itemId(item.key),
        key: item.key,
        moduleId: id,
        position,
        isPublished: true as const,
        materialId: null,
        vocabularySetId: null,
        assessmentId: null,
      };
      if (item.type === "material") {
        const material = buildMaterial(
          item,
          where(item),
          resolve,
          resolveItem,
          checkDocument,
          errors,
        );
        return { ...base, type: "MATERIAL", materialId: material.id, material };
      }
      if (item.type === "vocabulary") {
        const vocabularySet = buildVocabularySet(
          item,
          where(item),
          options,
          missingAudio,
          errors,
        );
        return {
          ...base,
          type: "VOCABULARY_SET",
          vocabularySetId: vocabularySet.id,
          vocabularySet,
        };
      }
      const assessment = buildAssessment(
        item,
        where(item),
        resolve,
        checkDocument,
        errors,
      );
      return {
        ...base,
        type: "ASSESSMENT",
        assessmentId: assessment.id,
        assessment,
      };
    });

    return {
      id,
      key: courseModule.key,
      title: courseModule.title,
      description: emptyToNull(courseModule.description),
      position: modulePosition,
      items,
    } satisfies DesiredModule;
  });

  const course: DesiredCourse = {
    title: content.title,
    description: emptyToNull(content.description),
    modules,
  };

  if (missingAudio.size && !options.allowMissingAudio) {
    const list = [...missingAudio];
    errors.push(
      `${list.length} audio clip(s) have no asset: ${list.slice(0, 40).join(", ")}${list.length > 40 ? ", …" : ""}. Run hangeul:audio --execute against this database, or pass --allow-missing-audio.`,
    );
  }
  errors.push(...readinessErrors(course));
  return { course, errors, missingAudio: [...missingAudio] };
}

function buildMaterial(
  item: MaterialContent,
  where: string,
  resolve: (from: string) => (value: unknown) => unknown,
  resolveItem: (
    key: string,
    from: string,
    expected?: "vocabulary" | "assessment",
  ) => string,
  checkDocument: (from: string, document: unknown) => void,
  errors: string[],
): DesiredMaterial {
  const id = materialId(item.key);
  const content = resolve(where)(item.blocks);
  checkDocument(`${where} content`, content);
  const requirements = (item.requirements ?? []).map(
    (requirement, position): DesiredRequirement => {
      const target = resolveItem(
        requirement.key,
        `${where} requirement`,
        requirement.type,
      );
      return {
        id: requirementId(item.key, requirement.type, requirement.key),
        materialId: id,
        type:
          requirement.type === "assessment" ? "ASSESSMENT" : "VOCABULARY_SET",
        assessmentId: requirement.type === "assessment" ? target : null,
        vocabularySetId: requirement.type === "vocabulary" ? target : null,
        minimumScore:
          requirement.type === "assessment"
            ? (requirement.minimumScore ?? null)
            : null,
        position,
      };
    },
  );
  for (const requirement of item.requirements ?? []) {
    if (
      requirement.type === "assessment" &&
      requirement.minimumScore !== undefined &&
      !isIntegerIn(requirement.minimumScore, 0, 100)
    ) {
      errors.push(
        `${where} requirement ${requirement.key}: minimumScore must be a whole number 0-100`,
      );
    }
  }
  return {
    id,
    title: item.title,
    description: emptyToNull(item.description),
    content,
    requirements,
    // The material helper knows every block that shows a file; the generic walk also catches JSON props it may
    // not know yet (both only return ids that are in the document).
    assetIds: [
      ...new Set([
        ...collectMaterialAssetIds(content),
        ...collectContentAssetIds(content),
      ]),
    ].sort(),
  };
}

function buildVocabularySet(
  item: VocabularySetContent,
  where: string,
  options: BuildOptions,
  missingAudio: Set<string>,
  errors: string[],
): DesiredVocabularySet {
  const id = vocabularySetId(item.key);
  const seen = new Set<string>();
  const entries = item.entries.map((entry, index): DesiredEntry => {
    const term = normalizeTerm(entry.term);
    if (!term) errors.push(`${where}: entry ${index + 1} has no term`);
    if (!entry.definition.trim()) {
      errors.push(`${where}: "${term}" has no definition`);
    }
    if (seen.has(term)) errors.push(`${where}: "${term}" is listed twice`);
    seen.add(term);
    const audioAssetId = term ? options.resolveAudio(term) : undefined;
    if (term && !audioAssetId) missingAudio.add(term);
    const romanization = entry.romanization.trim();
    return {
      id: entryId(item.key, term),
      vocabularySetId: id,
      term,
      definition: entry.definition.trim(),
      examples: (entry.examples ?? [])
        .map((example) => example.trim())
        .filter(Boolean),
      metadata: romanization ? { romanization } : null,
      audioAssetId: audioAssetId ?? null,
      createdAt: entryCreatedAt(index),
    };
  });
  if (!entries.length) errors.push(`${where}: the set has no entries`);
  return {
    id,
    title: item.title,
    description: emptyToNull(item.description),
    entries,
  };
}

function buildAssessment(
  item: AssessmentContent,
  where: string,
  resolve: (from: string) => (value: unknown) => unknown,
  checkDocument: (from: string, document: unknown) => void,
  errors: string[],
): DesiredAssessment {
  const id = assessmentId(item.key);
  const document = (from: string, value: string | BlockNoteBlock[]) => {
    const resolved = resolve(from)(toDocument(value));
    checkDocument(from, resolved);
    return resolved;
  };
  // The database CHECK constraints, checked before anything is written.
  if (!isIntegerIn(item.passingScore, 0, 100)) {
    errors.push(`${where}: passingScore must be a whole number 0-100`);
  }
  if (
    item.timeLimitMinutes !== undefined &&
    !isIntegerIn(item.timeLimitMinutes, 1, 10_000)
  ) {
    errors.push(`${where}: timeLimitMinutes must be a whole number above 0`);
  }
  const seen = new Set<string>();
  const questions = item.questions.map(
    (question, position): DesiredQuestion => {
      const from = `${where} question ${question.key}`;
      if (!isValidKey(question.key))
        errors.push(`${from}: key must be kebab-case`);
      if (seen.has(question.key)) errors.push(`${from}: key is used twice`);
      seen.add(question.key);
      const qid = questionId(item.key, question.key);
      if (
        question.points !== undefined &&
        !isIntegerIn(question.points, 1, 1000)
      ) {
        errors.push(`${from}: points must be a whole number above 0`);
      }
      const optionIds = question.options.map((option) =>
        optionId(qid, option.content),
      );
      if (new Set(optionIds).size !== optionIds.length) {
        errors.push(`${from}: two options have the same content`);
      }
      return {
        id: qid,
        assessmentId: id,
        type: question.type ?? "SINGLE_CHOICE",
        prompt: document(`${from} prompt`, question.prompt),
        explanation: question.explanation
          ? document(`${from} explanation`, question.explanation)
          : null,
        points: question.points ?? 1,
        position,
        options: question.options.map((option, index) => ({
          id: optionIds[index]!,
          questionId: qid,
          content: document(`${from} option ${index + 1}`, option.content),
          isCorrect: option.correct === true,
          position: index,
        })),
      };
    },
  );
  const instructions = item.instructions
    ? document(`${where} instructions`, item.instructions)
    : null;
  return {
    id,
    title: item.title,
    description: emptyToNull(item.description),
    instructions,
    passingScore: item.passingScore,
    maxAttempts: null,
    timeLimitMinutes: item.timeLimitMinutes ?? null,
    shuffleQuestions: item.shuffleQuestions ?? false,
    shuffleOptions: item.shuffleOptions ?? false,
    questions,
    assetIds: [
      ...new Set([
        ...assessmentContentAssetIds({ instructions, questions }),
        ...collectContentAssetIds(
          ...questions.map((question) => question.explanation),
        ),
      ]),
    ].sort(),
  };
}

/** The course readiness rules (what the workspace enforces) applied to the desired rows. */
export function readinessErrors(course: DesiredCourse) {
  const items = course.modules.flatMap((courseModule) => courseModule.items);
  const materials = new Map<string, ReadinessMaterial>();
  const assessments = new Map<string, ReadinessAssessment>();
  const vocabularySets = new Map<string, { id: string; title: string }>();
  for (const item of items) {
    if (item.material) {
      materials.set(item.material.id, {
        id: item.material.id,
        title: item.material.title,
        requirements: item.material.requirements.map((requirement) => ({
          type: requirement.type,
          assessmentId: requirement.assessmentId,
          vocabularySetId: requirement.vocabularySetId,
        })),
        embeds: collectMaterialReferenceIds(item.material.content),
      });
    }
    if (item.assessment) {
      assessments.set(
        item.assessment.id,
        summarizeAssessmentReadiness(
          item.assessment,
          item.assessment.questions.map((question) => ({
            type: question.type,
            prompt: question.prompt,
            options: question.options,
          })),
        ),
      );
    }
    if (item.vocabularySet) {
      vocabularySets.set(item.vocabularySet.id, item.vocabularySet);
    }
  }
  const readiness = computeCourseReadiness({
    organizationSlug: "hakgyo-system",
    courseId: "hangeul-mastery",
    courseStatus: "PUBLISHED",
    modules: course.modules.map(({ id, title, position }) => ({
      id,
      title,
      position,
    })),
    items: items.map((item): ReadinessItem => ({
      id: item.id,
      moduleId: item.moduleId,
      position: item.position,
      type: item.type,
      isPublished: item.isPublished,
      materialId: item.materialId,
      assessmentId: item.assessmentId,
      vocabularySetId: item.vocabularySetId,
    })),
    materials,
    assessments,
    vocabularySets,
  });
  const keyById = new Map(items.map((item) => [item.id, item.key]));
  return readiness.items
    .filter((item) => !item.ready)
    .map(
      (item) =>
        `${keyById.get(item.courseItemId)} is not ready: ${item.reasons.map((reason) => reason.message).join(" ")}`,
    );
}
