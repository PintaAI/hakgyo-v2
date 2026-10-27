import { z } from "zod";

import {
  questionPointsSchema,
  questionTagsSchema,
  scoreBandsSchema,
  scoreValueSchema,
} from "@hakgyo/shared";

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
  /** Named thresholds in percent, e.g. EPS-TOPIK "Manufaktur" 60 and "Sektor lain" 45. */
  /** An empty list removes every band. */
  scoreBands: scoreBandsSchema.optional(),
  maxAttempts: z.number().int().positive().nullable().optional(),
  timeLimitMinutes: z.number().int().positive().nullable().optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleOptions: z.boolean().optional(),
});

export const questionFields = z.object({
  type: z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "WRITTEN"]),
  prompt: json,
  explanation: json.optional(),
  /** Up to two decimals, e.g. 2.5. */
  points: questionPointsSchema.optional(),
  /** Labels such as `eps:R2`, `topik:k3`, `level:sedang` or `bab:3` for per-type reports. */
  tags: questionTagsSchema.optional(),
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
        score: scoreValueSchema,
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
  /** With sections: the section to add to (default the last one). */
  sectionId?: string;
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
