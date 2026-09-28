import { z } from "zod";

import { pageInput } from "~/server/api/pagination";
import { toPrismaJsonValue } from "~/server/prisma-json";

export const id = z.string().min(1);
const json = z.unknown().transform(toPrismaJsonValue);

export const assessmentFields = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(10000).nullable().optional(),
  editorSchemaVersion: z.number().int().positive().optional(),
  instructions: json.optional(),
  passingScore: z.number().int().min(0).max(100).nullable().optional(),
  maxAttempts: z.number().int().positive().nullable().optional(),
  timeLimitMinutes: z.number().int().positive().nullable().optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleOptions: z.boolean().optional(),
});

export const questionFields = z.object({
  type: z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "WRITTEN"]),
  prompt: json,
  explanation: json.optional(),
  points: z.number().int().positive().max(10000).optional(),
});

export const optionFields = z.object({
  content: json,
  isCorrect: z.boolean().optional(),
});

export const saveAnswersInput = z.object({
  attemptId: id,
  answers: z
    .array(
      z.object({
        questionId: id,
        content: json.optional(),
        optionIds: z.array(id).max(100).default([]),
      }),
    )
    .min(1)
    .max(200),
});

export const reviewAttemptInput = z.object({
  attemptId: id,
  answers: z
    .array(
      z.object({
        answerId: id,
        score: z.number().int().min(0),
        feedback: json.optional(),
      }),
    )
    .min(1),
});

export const attemptsNeedingReviewInput = pageInput.extend({
  organizationId: id,
  assessmentId: id.optional(),
  cohortId: id.optional(),
  search: z.string().trim().max(200).optional(),
});

export type CreateQuestionInput = z.infer<typeof questionFields> & {
  assessmentId: string;
};
export type UpdateOptionInput = Partial<z.infer<typeof optionFields>> & {
  optionId: string;
};
export type CreateOptionInput = z.infer<typeof optionFields> & {
  questionId: string;
};
export type SaveAnswersInput = z.infer<typeof saveAnswersInput>;
export type ReviewAttemptInput = z.infer<typeof reviewAttemptInput>;
export type AttemptsNeedingReviewInput = z.infer<
  typeof attemptsNeedingReviewInput
>;
