import { entryMeanings, joinMeanings } from "@hakgyo/shared";
import type {
  BundleContent,
  BundleStructure,
} from "@hakgyo/shared/mobile-sync";

import { gameCatalog, type GameKey } from "../games/catalog";
import type { LearnerIndex } from "../sync/types";
import { extractTextSegments, vocabularyExamples } from "./text";

export type SearchKind =
  | "course"
  | "module"
  | "material"
  | "vocabularySet"
  | "vocabularyEntry"
  | "assessment"
  | "event"
  | "cohort"
  | "game";

type AssessmentEventTarget = {
  id: string;
  entry: { destination: string };
  course: { id: string };
  courseItem: { id: string };
  attempts: { id: string }[];
};

export type SearchTarget =
  | { type: "course"; courseId: string }
  | { type: "courseItem"; courseId: string; courseItemId: string }
  | {
      type: "vocabularyEntry";
      courseId: string;
      vocabularySetId: string;
      entryId: string;
      sourceCourseItemId: string;
    }
  | { type: "event"; event: AssessmentEventTarget }
  | { type: "cohort"; cohortId: string; organizationId: string | null }
  | { type: "game"; gameKey: GameKey };

/** A short field (title, term, meaning) matched with typo tolerance. */
export type SearchField = { text: string; weight: number };

/**
 * One searchable thing. `fields` are short and scored highly; `body` holds
 * longer text (material paragraphs, examples, question prompts) that is only
 * matched as a substring and shown as a snippet.
 */
export type SearchDocument = {
  key: string;
  kind: SearchKind;
  /** Replaces the kind's label, e.g. "Tryout" for an event. */
  label?: string;
  title: string;
  /** Where the result lives, e.g. "Course · Bab 2". */
  context: string | null;
  organizationId: string | null;
  fields: SearchField[];
  body: string[];
  target: SearchTarget;
};

const TITLE = 1;
const TERM = 1;
const MEANING = 0.9;
const DESCRIPTION = 0.5;
const PEOPLE = 0.4;

function field(text: string | null | undefined, weight: number) {
  return text?.trim() ? [{ text: text.trim(), weight }] : [];
}

function joinContext(...parts: (string | null | undefined)[]) {
  const present = parts.filter((part): part is string => Boolean(part?.trim()));
  return present.length ? present.join(" · ") : null;
}

/** Documents of one downloaded course bundle. */
export function courseBundleDocuments({
  courseId,
  organizationId,
  structure,
  content,
}: {
  courseId: string;
  organizationId: string | null;
  structure: BundleStructure;
  content: BundleContent;
}): SearchDocument[] {
  const documents: SearchDocument[] = [];
  const courseTitle = structure.title;

  documents.push({
    key: `course:${courseId}`,
    kind: "course",
    title: courseTitle,
    context: null,
    organizationId,
    fields: [
      ...field(courseTitle, TITLE),
      ...field(structure.description, DESCRIPTION),
    ],
    body: [],
    target: { type: "course", courseId },
  });

  // A vocabulary set or assessment opens through the course item that places
  // it, either directly or embedded in a material.
  const sourceItems = new Map<
    string,
    { courseItemId: string; moduleTitle: string }
  >();
  const indexedSets = new Set<string>();
  const indexedAssessments = new Set<string>();

  const sortedModules = [...structure.modules].sort(
    (a, b) => a.position - b.position,
  );
  for (const module of sortedModules) {
    documents.push({
      key: `module:${module.id}`,
      kind: "module",
      title: module.title,
      context: courseTitle,
      organizationId,
      fields: [
        ...field(module.title, TITLE),
        ...field(module.description, DESCRIPTION),
      ],
      body: [],
      target: { type: "course", courseId },
    });

    for (const item of module.items) {
      const placement = content.placements[item.id];
      if (item.vocabularySetId) {
        sourceItems.set(`set:${item.vocabularySetId}`, {
          courseItemId: item.id,
          moduleTitle: module.title,
        });
      }
      if (item.assessmentId) {
        sourceItems.set(`assessment:${item.assessmentId}`, {
          courseItemId: item.id,
          moduleTitle: module.title,
        });
      }
      for (const reference of placement?.embedded.vocabularySetIds ?? []) {
        if (!sourceItems.has(`set:${reference.id}`)) {
          sourceItems.set(`set:${reference.id}`, {
            courseItemId: reference.courseItemId,
            moduleTitle: module.title,
          });
        }
      }
      for (const reference of placement?.embedded.assessmentIds ?? []) {
        if (!sourceItems.has(`assessment:${reference.id}`)) {
          sourceItems.set(`assessment:${reference.id}`, {
            courseItemId: reference.courseItemId,
            moduleTitle: module.title,
          });
        }
      }

      if (item.type === "MATERIAL" && item.materialId) {
        const material = content.materials[item.materialId];
        documents.push({
          key: `material:${item.id}`,
          kind: "material",
          title: item.title || material?.title || "Materi",
          context: joinContext(courseTitle, module.title),
          organizationId,
          fields: [
            ...field(item.title, TITLE),
            ...(material && material.title !== item.title
              ? field(material.title, TITLE)
              : []),
            ...field(material?.description, DESCRIPTION),
          ],
          body: material ? extractTextSegments(material.content) : [],
          target: { type: "courseItem", courseId, courseItemId: item.id },
        });
      }
    }
  }

  for (const set of Object.values(content.vocabularySets)) {
    const source = sourceItems.get(`set:${set.id}`);
    if (!source || indexedSets.has(set.id)) continue;
    indexedSets.add(set.id);
    documents.push({
      key: `vocabularySet:${set.id}`,
      kind: "vocabularySet",
      title: set.title,
      context: joinContext(courseTitle, source.moduleTitle),
      organizationId,
      fields: [
        ...field(set.title, TITLE),
        ...field(set.description, DESCRIPTION),
      ],
      body: [],
      target: {
        type: "courseItem",
        courseId,
        courseItemId: source.courseItemId,
      },
    });
    for (const entry of set.entries) {
      const meanings = entryMeanings(entry);
      documents.push({
        key: `vocabularyEntry:${set.id}:${entry.id}`,
        kind: "vocabularyEntry",
        title: entry.term,
        context: joinContext(joinMeanings(meanings), set.title),
        organizationId,
        fields: [
          ...field(entry.term, TERM),
          ...meanings.flatMap((meaning) => field(meaning, MEANING)),
        ],
        body: vocabularyExamples(entry.examples),
        target: {
          type: "vocabularyEntry",
          courseId,
          vocabularySetId: set.id,
          entryId: entry.id,
          sourceCourseItemId: source.courseItemId,
        },
      });
    }
  }

  for (const assessment of Object.values(content.assessments)) {
    const source = sourceItems.get(`assessment:${assessment.id}`);
    if (!source || indexedAssessments.has(assessment.id)) continue;
    indexedAssessments.add(assessment.id);
    const questions = [...assessment.questions].sort(
      (a, b) => a.position - b.position,
    );
    documents.push({
      key: `assessment:${assessment.id}`,
      kind: "assessment",
      title: assessment.title,
      context: joinContext(courseTitle, source.moduleTitle),
      organizationId,
      fields: [
        ...field(assessment.title, TITLE),
        ...field(assessment.description, DESCRIPTION),
      ],
      body: [
        ...extractTextSegments(assessment.instructions),
        ...questions.flatMap((question) => [
          ...extractTextSegments(question.prompt),
          ...[...question.options]
            .sort((a, b) => a.position - b.position)
            .flatMap((option) => extractTextSegments(option.content)),
        ]),
      ],
      target: {
        type: "courseItem",
        courseId,
        courseItemId: source.courseItemId,
      },
    });
  }

  return documents;
}

type IndexCourse = LearnerIndex["courses"][number];
type IndexCohort = LearnerIndex["cohorts"][number];
type IndexEvent = LearnerIndex["events"][number];

/** Organization of each course listed in the learner indexes. */
export function courseOrganizations(indexes: LearnerIndex[]) {
  const organizations = new Map<string, string>();
  for (const index of indexes) {
    for (const course of index.courses) {
      organizations.set(course.id, course.organization.id);
    }
    for (const cohort of index.cohorts) {
      organizations.set(cohort.course.id, cohort.course.organization.id);
    }
  }
  return organizations;
}

function courseDocument(course: IndexCourse): SearchDocument {
  return {
    key: `course:${course.id}`,
    kind: "course",
    title: course.title,
    context: null,
    organizationId: course.organization.id,
    fields: [
      ...field(course.title, TITLE),
      ...field(course.description, DESCRIPTION),
    ],
    body: [],
    target: { type: "course", courseId: course.id },
  };
}

function cohortDocument(cohort: IndexCohort): SearchDocument {
  return {
    key: `cohort:${cohort.id}`,
    kind: "cohort",
    title: cohort.name,
    context: cohort.course.title,
    organizationId: cohort.course.organization.id,
    fields: [
      ...field(cohort.name, TITLE),
      ...field(cohort.description, DESCRIPTION),
      ...cohort.staff.flatMap((staff) =>
        field(staff.organizationMember.user.name, PEOPLE),
      ),
    ],
    body: cohort.meetings.flatMap((meeting) => [
      ...field(meeting.title, 1).map(({ text }) => text),
      ...field(meeting.agenda, 1).map(({ text }) => text),
    ]),
    target: {
      type: "cohort",
      cohortId: cohort.id,
      organizationId: cohort.course.organization.id,
    },
  };
}

function eventDocument(
  event: IndexEvent,
  organizationId: string | null,
): SearchDocument {
  const assessment = event.courseItem.assessment;
  return {
    key: `event:${event.id}`,
    kind: "event",
    label: event.type === "TRYOUT" ? "Tryout" : "Latihan",
    title: event.title,
    context: event.course.title,
    organizationId,
    fields: [
      ...field(event.title, TITLE),
      ...field(assessment?.title, DESCRIPTION),
      ...field(assessment?.description, DESCRIPTION),
    ],
    body: [],
    target: { type: "event", event },
  };
}

/**
 * Courses (also those not downloaded yet), cohorts and assessment events from
 * every stored learner index, without duplicates.
 */
export function learnerIndexDocuments(
  indexes: LearnerIndex[],
): SearchDocument[] {
  const documents = new Map<string, SearchDocument>();
  const organizations = courseOrganizations(indexes);
  for (const index of indexes) {
    for (const course of index.courses) {
      const document = courseDocument(course);
      documents.set(document.key, document);
    }
    for (const cohort of index.cohorts) {
      const document = cohortDocument(cohort);
      documents.set(document.key, document);
    }
    for (const event of index.events) {
      const document = eventDocument(
        event,
        organizations.get(event.course.id) ?? index.organizationId,
      );
      documents.set(document.key, document);
    }
  }
  return [...documents.values()];
}

/** The games, which ship with the app rather than with a course. */
export function gameDocuments(): SearchDocument[] {
  return (Object.keys(gameCatalog) as GameKey[]).map((gameKey) => {
    const game = gameCatalog[gameKey];
    return {
      key: `game:${gameKey}`,
      kind: "game",
      title: game.title,
      context: "Game",
      organizationId: null,
      fields: [
        ...field(game.title, TITLE),
        ...field(game.description, DESCRIPTION),
      ],
      body: [],
      target: { type: "game", gameKey },
    };
  });
}
