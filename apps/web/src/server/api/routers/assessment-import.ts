import { TRPCError } from "@trpc/server";
import { questionPointsSchema } from "@hakgyo/shared";
import { plainTextToBlockNote } from "~/lib/blocknote/document";
import { z } from "zod";

import type { Prisma } from "../../../../generated/prisma/client";
import { extractAssessmentQuestionsFromImage } from "~/server/ai/assessment-extraction";
import { aiExtractionError, aiImageInputFields } from "~/server/ai/image-input";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { requireContentAuthor } from "~/server/authorization";
import { LOCKED_MESSAGE } from "~/server/assessment/access";
import { assertAssessmentNotLive } from "~/server/assessment/live-status";
import {
  MAX_ASSESSMENT_OPTIONS,
  MIN_ASSESSMENT_OPTIONS,
} from "~/lib/assessment-options";

const id = z.string().min(1);

async function requireAssessmentAuthor(
  db: Prisma.DefaultPrismaClient,
  assessmentId: string,
  userId: string,
) {
  const assessment = await db.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      title: true,
      organizationId: true,
      createdByMembershipId: true,
      contentLocked: true,
    },
  });
  if (!assessment) throw new TRPCError({ code: "NOT_FOUND" });
  if (assessment.contentLocked) {
    throw new TRPCError({ code: "BAD_REQUEST", message: LOCKED_MESSAGE });
  }
  await requireContentAuthor({
    organizationId: assessment.organizationId,
    userId,
    createdByMembershipId: assessment.createdByMembershipId,
  });
  return assessment;
}

/** Plain text → BlockNote paragraphs, one per non-empty line. */
function textToDocument(text: string): Prisma.InputJsonValue {
  return plainTextToBlockNote(text);
}

const importedQuestion = z
  .object({
    type: z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "WRITTEN"]),
    prompt: z.string().trim().min(1).max(20000),
    explanation: z.string().trim().max(20000),
    points: questionPointsSchema,
    options: z
      .array(
        z.object({
          text: z.string().trim().min(1).max(5000),
          isCorrect: z.boolean(),
        }),
      )
      .max(MAX_ASSESSMENT_OPTIONS),
  })
  .superRefine((question, context) => {
    if (question.type === "WRITTEN") {
      if (question.options.length) {
        context.addIssue({
          code: "custom",
          message: "Soal tertulis tidak memiliki opsi.",
        });
      }
      return;
    }
    if (question.options.length < MIN_ASSESSMENT_OPTIONS) {
      context.addIssue({
        code: "custom",
        message: "Soal pilihan harus memiliki minimal dua opsi.",
      });
    }
    if (
      question.type === "SINGLE_CHOICE" &&
      question.options.filter((option) => option.isCorrect).length > 1
    ) {
      context.addIssue({
        code: "custom",
        message: "Soal pilihan tunggal hanya boleh punya satu jawaban benar.",
      });
    }
  });

export const assessmentImportRouter = createTRPCRouter({
  // Reads a screenshot of questions. Nothing is written: the author adjusts
  // the result and saves it through `createQuestions`.
  extractQuestionsFromImage: protectedProcedure
    .input(z.object({ assessmentId: id, ...aiImageInputFields }))
    .mutation(async ({ ctx, input }) => {
      const assessment = await requireAssessmentAuthor(
        ctx.db,
        input.assessmentId,
        ctx.actorUserId,
      );
      await assertAssessmentNotLive(ctx.db, input.assessmentId);
      try {
        return {
          questions: await extractAssessmentQuestionsFromImage({
            imageBase64: input.imageBase64,
            mediaType: input.mediaType,
            assessmentTitle: assessment.title,
          }),
        };
      } catch (error) {
        throw aiExtractionError(error);
      }
    }),
  createQuestions: protectedProcedure
    .input(
      z.object({
        assessmentId: id,
        questions: z.array(importedQuestion).min(1).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAssessmentAuthor(
        ctx.db,
        input.assessmentId,
        ctx.actorUserId,
      );
      await assertAssessmentNotLive(ctx.db, input.assessmentId);
      // Lock the assessment so concurrent creates cannot compute the same
      // next position, then append the questions in reviewed order.
      const created = await ctx.db.$transaction(async (tx) => {
        await tx.$queryRaw`
          SELECT "id" FROM "Assessment" WHERE "id" = ${input.assessmentId} FOR UPDATE
        `;
        const position = await tx.assessmentQuestion.aggregate({
          where: { assessmentId: input.assessmentId },
          _max: { position: true },
        });
        let nextPosition = (position._max.position ?? -1) + 1;
        // With sections, imported questions join the last one, like "Tambah soal".
        const lastSection = await tx.assessmentSection.findFirst({
          where: { assessmentId: input.assessmentId },
          orderBy: { position: "desc" },
          select: { id: true },
        });
        for (const question of input.questions) {
          await tx.assessmentQuestion.create({
            data: {
              assessmentId: input.assessmentId,
              sectionId: lastSection?.id ?? null,
              type: question.type,
              prompt: textToDocument(question.prompt),
              explanation: question.explanation
                ? textToDocument(question.explanation)
                : undefined,
              points: question.points,
              position: nextPosition++,
              options: {
                create: question.options.map((option, index) => ({
                  content: textToDocument(option.text),
                  isCorrect: option.isCorrect,
                  position: index,
                })),
              },
            },
          });
        }
        return input.questions.length;
      });
      return { created };
    }),
});
