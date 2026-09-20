import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "../../../generated/prisma/client";
import { collectMaterialReferenceIds } from "~/lib/blocknote/resource-references";
import { recordGamificationActivity } from "~/server/gamification/record-activity";
import { getVocabularyEvidence, lockLearnerProgress } from "./evidence";
import {
  advanceVocabularyProgress,
  emptyVocabularyProgress,
  vocabularyContentHash,
  type VocabularyEvidence,
  type VocabularyResult,
} from "./progress-policy";

export type VocabularyAttemptInput = {
  attemptId: string;
  sessionId: string;
  sourceCourseItemId: string;
  vocabularySetId: string;
  entryId: string;
  gameKey: string;
  evidence: VocabularyEvidence;
  result: VocabularyResult;
};

type Authorize = (input: {
  courseItemId: string;
  userId: string;
}) => Promise<unknown>;

export function createVocabularyProgressService(
  db: PrismaClient,
  authorize: Authorize,
) {
  async function requireScope(
    userId: string,
    scope: { sourceCourseItemId: string; vocabularySetId: string },
  ) {
    await authorize({ courseItemId: scope.sourceCourseItemId, userId });
    const source = await db.courseItem.findUnique({
      where: { id: scope.sourceCourseItemId },
      select: {
        organizationId: true,
        moduleId: true,
        isPublished: true,
        type: true,
        vocabularySetId: true,
        material: {
          select: {
            content: true,
            completionRequirements: {
              where: { type: "VOCABULARY_SET" },
              select: { vocabularySetId: true },
            },
          },
        },
      },
    });
    const linked =
      source !== null &&
      (source.vocabularySetId === scope.vocabularySetId ||
        source.material?.completionRequirements.some(
          (requirement) =>
            requirement.vocabularySetId === scope.vocabularySetId,
        ) === true ||
        (source.material
          ? collectMaterialReferenceIds(
              source.material.content,
            ).vocabularySetIds.includes(scope.vocabularySetId)
          : false));
    if (!source || !linked) throw new TRPCError({ code: "NOT_FOUND" });

    const placement =
      source.type === "VOCABULARY_SET" &&
      source.isPublished &&
      source.vocabularySetId === scope.vocabularySetId
        ? { id: scope.sourceCourseItemId }
        : await db.courseItem.findFirst({
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
    return { organizationId: source.organizationId, placementId: placement.id };
  }

  return {
    async getProgress(
      userId: string,
      scope: { sourceCourseItemId: string; vocabularySetId: string },
    ) {
      await requireScope(userId, scope);
      return getVocabularyEvidence(db, userId, scope.vocabularySetId);
    },

    async recordAttempts(
      userId: string,
      attempts: VocabularyAttemptInput[],
      timeZone?: string,
    ) {
      const scopes = new Map<
        string,
        { sourceCourseItemId: string; vocabularySetId: string }
      >();
      for (const attempt of attempts) {
        scopes.set(
          `${attempt.sourceCourseItemId}:${attempt.vocabularySetId}`,
          attempt,
        );
      }
      const authorized = new Map<
        string,
        { organizationId: string; placementId: string }
      >();
      for (const [key, scope] of scopes) {
        authorized.set(key, await requireScope(userId, scope));
      }

      return db.$transaction(async (tx) => {
        await lockLearnerProgress(tx, userId);
        const now = new Date();
        let accepted = 0;
        let duplicates = 0;

        for (const attempt of attempts) {
          const existing = await tx.vocabularyPracticeAttempt.findFirst({
            where: {
              userId,
              OR: [
                { id: attempt.attemptId },
                {
                  sessionId: attempt.sessionId,
                  entryId: attempt.entryId,
                },
              ],
            },
          });
          if (existing) {
            duplicates += 1;
            continue;
          }

          const entry = await tx.vocabularyEntry.findFirst({
            where: {
              id: attempt.entryId,
              vocabularySetId: attempt.vocabularySetId,
            },
            select: { id: true, term: true, definition: true },
          });
          if (!entry) throw new TRPCError({ code: "NOT_FOUND" });

          const contentHash = vocabularyContentHash(entry);
          const saved = await tx.vocabularyProgress.findUnique({
            where: {
              entryId_userId: { entryId: attempt.entryId, userId },
            },
          });
          const current =
            saved?.contentHash === contentHash
              ? saved
              : emptyVocabularyProgress();
          const next = advanceVocabularyProgress(current, attempt, now);

          await tx.vocabularyPracticeAttempt.create({
            data: {
              id: attempt.attemptId,
              sessionId: attempt.sessionId,
              entryId: attempt.entryId,
              userId,
              sourceCourseItemId: attempt.sourceCourseItemId,
              gameKey: attempt.gameKey,
              evidence: attempt.evidence,
              result: attempt.result,
            },
          });
          await tx.vocabularyProgress.upsert({
            where: {
              entryId_userId: { entryId: attempt.entryId, userId },
            },
            create: {
              entryId: attempt.entryId,
              userId,
              contentHash,
              ...next,
            },
            update: { contentHash, ...next },
          });
          accepted += 1;

          if (attempt.result === "CORRECT") {
            const scopeKey = `${attempt.sourceCourseItemId}:${attempt.vocabularySetId}`;
            const scope = authorized.get(scopeKey)!;
            await recordGamificationActivity(tx, {
              action: "VOCABULARY_REVIEWED",
              idempotencyKey: `vocabulary-attempt:${userId}:${attempt.attemptId}`,
              metadata: {
                entryId: attempt.entryId,
                evidence: attempt.evidence,
                gameKey: attempt.gameKey,
                sourceCourseItemId: attempt.sourceCourseItemId,
              },
              organizationId: scope.organizationId,
              timeZone,
              userId,
            });
          }
        }

        const sets = [];
        for (const scope of scopes.values()) {
          const evidence = await getVocabularyEvidence(
            tx,
            userId,
            scope.vocabularySetId,
          );
          const authorization = authorized.get(
            `${scope.sourceCourseItemId}:${scope.vocabularySetId}`,
          )!;
          if (evidence.practiced) {
            const progressKey = {
              courseItemId: authorization.placementId,
              userId,
            };
            const existingProgress = await tx.contentProgress.findUnique({
              where: { courseItemId_userId: progressKey },
              select: { status: true },
            });
            if (!existingProgress) {
              await tx.contentProgress.create({
                data: {
                  ...progressKey,
                  status: "COMPLETED",
                  completedAt: now,
                },
              });
            } else if (existingProgress.status !== "COMPLETED") {
              await tx.contentProgress.update({
                where: { courseItemId_userId: progressKey },
                data: {
                  status: "COMPLETED",
                  completedAt: now,
                },
              });
            }
          }
          sets.push({ vocabularySetId: scope.vocabularySetId, ...evidence });
        }

        return { accepted, duplicates, sets };
      });
    },
  };
}
