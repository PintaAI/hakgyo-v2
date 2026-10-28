import { Prisma } from "../../../generated/prisma/client";
import { createId } from "~/server/batch";
import { toPrismaJsonValue } from "~/server/prisma-json";

/**
 * Rows that copy questions into another assessment, groups included, so a group (instructions,
 * stimulus, questions, options, tags, points) always travels as a unit
 * (docs/eps-topik-simulation.md section 4.5). Duplicating an assessment and cloning a course build
 * their rows here and insert them their own way, and so does the question bank's package builder.
 */

export type QuestionCopySource = {
  type: Prisma.AssessmentQuestionCreateManyInput["type"];
  prompt: unknown;
  explanation: unknown;
  points: number;
  position: number;
  tags: string[];
  sectionId: string | null;
  groupId: string | null;
  /** The bank question a package question copies (docs/eps-question-generator.md section 3). */
  sourceQuestionId?: string | null;
  options: ReadonlyArray<{
    content: unknown;
    isCorrect: boolean;
    position: number;
  }>;
};

export type GroupCopySource = {
  id: string;
  instructions: unknown;
  stimulus: unknown;
  sourceGroupId?: string | null;
};

function optionalJson(
  value: unknown,
  transform: (value: unknown) => Prisma.InputJsonValue,
) {
  return value === null || value === undefined
    ? Prisma.DbNull
    : transform(value);
}

export function questionCopyRows(input: {
  assessmentId: string;
  questions: readonly QuestionCopySource[];
  groups: readonly GroupCopySource[];
  /** Old section id to new; questions of unknown sections are copied without one. */
  sectionIds: ReadonlyMap<string, string>;
  /** Rewrites content (asset references when copying to another organization). */
  transform?: (value: unknown) => Prisma.InputJsonValue;
}) {
  const transform = input.transform ?? toPrismaJsonValue;
  // Only groups that still have questions come along.
  const usedGroupIds = new Set(
    input.questions.flatMap(({ groupId }) => (groupId ? [groupId] : [])),
  );
  const groupIds = new Map(
    input.groups
      .filter(({ id }) => usedGroupIds.has(id))
      .map(({ id }) => [id, createId()]),
  );
  const groups = input.groups
    .filter(({ id }) => groupIds.has(id))
    .map((group): Prisma.AssessmentQuestionGroupCreateManyInput => ({
      id: groupIds.get(group.id)!,
      assessmentId: input.assessmentId,
      instructions: optionalJson(group.instructions, transform),
      stimulus: optionalJson(group.stimulus, transform),
      sourceGroupId: group.sourceGroupId ?? null,
    }));
  const questions = input.questions.map(
    (question): Prisma.AssessmentQuestionCreateManyInput & { id: string } => ({
      id: createId(),
      assessmentId: input.assessmentId,
      type: question.type,
      prompt: transform(question.prompt),
      explanation: optionalJson(question.explanation, transform),
      points: question.points,
      position: question.position,
      tags: question.tags,
      sectionId: question.sectionId
        ? (input.sectionIds.get(question.sectionId) ?? null)
        : null,
      groupId: question.groupId
        ? (groupIds.get(question.groupId) ?? null)
        : null,
      sourceQuestionId: question.sourceQuestionId ?? null,
    }),
  );
  const options = input.questions.flatMap((question, index) =>
    question.options.map((option): Prisma.AssessmentOptionCreateManyInput => ({
      questionId: questions[index]!.id,
      content: transform(option.content),
      isCorrect: option.isCorrect,
      position: option.position,
    })),
  );
  return { groups, questions, options };
}
