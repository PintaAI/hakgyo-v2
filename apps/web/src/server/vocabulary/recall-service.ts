import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "../../../generated/prisma/client";
import { collectMaterialReferenceIds } from "~/lib/blocknote/resource-references";
import {
  getVocabularyEvidence,
  lockLearnerProgress,
  meetsMaterialRequirements,
} from "./evidence";
import {
  advanceMemory,
  emptyMemory,
  gradeRecallAnswer,
  vocabularyContentHash,
  vocabularyRecallPolicy,
} from "./recall-policy";

export type VocabularyRecallScope = {
  sourceCourseItemId: string;
  vocabularySetId: string;
};
type Authorize = (input: {
  courseItemId: string;
  userId: string;
}) => Promise<unknown>;

/** Reusable server boundary. userId must come from the authenticated principal. */
export function createVocabularyRecallService(
  db: PrismaClient,
  authorize: Authorize,
) {
  async function requireScope(userId: string, scope: VocabularyRecallScope) {
    await authorize({ courseItemId: scope.sourceCourseItemId, userId });
    const source = await db.courseItem.findUnique({
      where: { id: scope.sourceCourseItemId },
      select: {
        organizationId: true,
        moduleId: true,
        vocabularySetId: true,
        material: { select: { content: true } },
      },
    });
    if (
      !source ||
      (source.vocabularySetId !== scope.vocabularySetId &&
        (!source.material ||
          !collectMaterialReferenceIds(
            source.material.content,
          ).vocabularySetIds.includes(scope.vocabularySetId)))
    ) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    const placement = await db.courseItem.findFirst({
      where: {
        vocabularySetId: scope.vocabularySetId,
        organizationId: source.organizationId,
        moduleId: source.moduleId,
        isPublished: true,
        type: "VOCABULARY_SET",
      },
      orderBy: [{ position: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    if (!placement) throw new TRPCError({ code: "NOT_FOUND" });
    await authorize({ courseItemId: placement.id, userId });
  }

  return {
    async getStatus(userId: string, scope: VocabularyRecallScope) {
      await requireScope(userId, scope);
      return {
        ...(await getVocabularyEvidence(db, userId, scope.vocabularySetId)),
        policy: vocabularyRecallPolicy,
        serverTime: new Date(),
      };
    },

    async start(
      userId: string,
      input: VocabularyRecallScope & { entryId: string },
    ) {
      await requireScope(userId, input);
      return db.$transaction(async (tx) => {
        await lockLearnerProgress(tx, userId);
        const now = new Date();
        const entry = await tx.vocabularyEntry.findFirst({
          where: { id: input.entryId, vocabularySetId: input.vocabularySetId },
        });
        if (!entry) throw new TRPCError({ code: "NOT_FOUND" });
        const contentHash = vocabularyContentHash(entry);
        const memory = await tx.vocabularyMemory.findUnique({
          where: { entryId_userId: { entryId: entry.id, userId } },
        });
        if (
          memory?.contentHash === contentHash &&
          memory.nextReviewAt &&
          memory.nextReviewAt > now
        ) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "This word is not due for recall yet; refresh getStatus for nextReviewAt",
          });
        }
        const existing = await tx.vocabularyRecallChallenge.findFirst({
          where: {
            entryId: entry.id,
            userId,
            sourceCourseItemId: input.sourceCourseItemId,
            contentHash,
            submittedAt: null,
            expiresAt: { gt: now },
          },
        });
        // One outstanding challenge across all entry points; switching context invalidates the old one.
        if (!existing)
          await tx.vocabularyRecallChallenge.updateMany({
            where: {
              entryId: entry.id,
              userId,
              submittedAt: null,
              expiresAt: { gt: now },
            },
            data: { expiresAt: now },
          });
        const challenge =
          existing ??
          (await tx.vocabularyRecallChallenge.create({
            data: {
              entryId: entry.id,
              userId,
              sourceCourseItemId: input.sourceCourseItemId,
              contentHash,
              prompt: entry.definition,
              expectedAnswer: entry.term,
              expiresAt: new Date(
                now.getTime() + vocabularyRecallPolicy.challengeLifetimeMs,
              ),
            },
          }));
        return {
          challengeId: challenge.id,
          entryId: entry.id,
          kind: "TYPE_TERM" as const,
          prompt: challenge.prompt,
          expiresAt: challenge.expiresAt,
          serverTime: now,
        };
      });
    },

    async submit(
      userId: string,
      input: { challengeId: string; answer: string },
    ) {
      if (input.answer.length > 500)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Answer must be at most 500 characters",
        });
      const issued = await db.vocabularyRecallChallenge.findFirst({
        where: { id: input.challengeId, userId },
        select: {
          sourceCourseItemId: true,
          entry: { select: { vocabularySetId: true } },
        },
      });
      if (!issued) throw new TRPCError({ code: "NOT_FOUND" });
      await requireScope(userId, {
        sourceCourseItemId: issued.sourceCourseItemId,
        vocabularySetId: issued.entry.vocabularySetId,
      });
      return db.$transaction(async (tx) => {
        await lockLearnerProgress(tx, userId);
        const now = new Date();
        const challenge = await tx.vocabularyRecallChallenge.findFirst({
          where: { id: input.challengeId, userId },
          include: { entry: true },
        });
        if (!challenge) throw new TRPCError({ code: "NOT_FOUND" });
        if (challenge.submittedAt) {
          return {
            correct: challenge.correct!,
            applied: false,
            ...(await getVocabularyEvidence(
              tx,
              userId,
              challenge.entry.vocabularySetId,
            )),
          };
        }
        if (
          challenge.expiresAt <= now ||
          challenge.contentHash !== vocabularyContentHash(challenge.entry)
        ) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Recall challenge expired or vocabulary changed; start a new challenge",
          });
        }
        const key = { entryId: challenge.entryId, userId };
        const saved = await tx.vocabularyMemory.findUnique({
          where: { entryId_userId: key },
        });
        const state =
          saved?.contentHash === challenge.contentHash ? saved : emptyMemory();
        if (state.nextReviewAt && state.nextReviewAt > now)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "This word is not due for recall yet",
          });
        const correct = gradeRecallAnswer(
          input.answer,
          challenge.expectedAnswer,
        );
        const next = advanceMemory(state, correct, now);
        await tx.vocabularyRecallChallenge.update({
          where: { id: challenge.id },
          data: { correct, submittedAt: now },
        });
        await tx.vocabularyMemory.upsert({
          where: { entryId_userId: key },
          create: { ...key, contentHash: challenge.contentHash, ...next },
          update: { contentHash: challenge.contentHash, ...next },
        });
        const evidence = await getVocabularyEvidence(
          tx,
          userId,
          challenge.entry.vocabularySetId,
        );
        if (!evidence.remembered) {
          await tx.contentProgress.updateMany({
            where: {
              userId,
              status: "COMPLETED",
              courseItem: { vocabularySetId: challenge.entry.vocabularySetId },
            },
            data: { status: "IN_PROGRESS", completedAt: null },
          });
          const dependent = await tx.contentProgress.findMany({
            where: {
              userId,
              status: "COMPLETED",
              courseItem: {
                material: {
                  completionRequirements: {
                    some: { vocabularySetId: challenge.entry.vocabularySetId },
                  },
                },
              },
            },
            select: { id: true, courseItem: { select: { materialId: true } } },
          });
          for (const progress of dependent) {
            if (
              progress.courseItem.materialId &&
              !(await meetsMaterialRequirements(
                tx,
                userId,
                progress.courseItem.materialId,
              ))
            ) {
              await tx.contentProgress.update({
                where: { id: progress.id },
                data: { status: "IN_PROGRESS", completedAt: null },
              });
            }
          }
        }
        return { correct, applied: true, ...evidence };
      });
    },
  };
}
