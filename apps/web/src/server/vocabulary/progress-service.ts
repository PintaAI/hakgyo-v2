import { TRPCError } from "@trpc/server";
import { Prisma, type PrismaClient } from "../../../generated/prisma/client";
import { collectMaterialReferenceIds } from "~/lib/blocknote/resource-references";
import { recordGamificationActivities } from "~/server/gamification/record-activity";
import {
  getVocabularyEvidence,
  getVocabularyEvidenceForSets,
  lockLearnerProgress,
} from "./evidence";
import {
  advanceVocabularyProgress,
  emptyVocabularyProgress,
  vocabularyContentHash,
  type VocabularyEvidence,
  type VocabularyProgressState,
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
    // The source is only used once the access check has passed; loading it
    // alongside saves a round trip.
    const [, source] = await Promise.all([
      authorize({ courseItemId: scope.sourceCourseItemId, userId }),
      db.courseItem.findUnique({
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
      }),
    ]);
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

    const sourceIsPlacement =
      source.type === "VOCABULARY_SET" &&
      source.isPublished &&
      source.vocabularySetId === scope.vocabularySetId;
    const placement = sourceIsPlacement
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
    // The source item was authorized above.
    if (!sourceIsPlacement) {
      await authorize({ courseItemId: placement.id, userId });
    }
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
      // Scopes are authorized concurrently; the first failing scope (in input
      // order) decides the error, as with sequential checks.
      const scopeEntries = [...scopes];
      const scopeResults = await Promise.allSettled(
        scopeEntries.map(([, scope]) => requireScope(userId, scope)),
      );
      const authorized = new Map<
        string,
        { organizationId: string; placementId: string }
      >();
      for (const [index, result] of scopeResults.entries()) {
        if (result.status === "rejected") throw result.reason;
        authorized.set(scopeEntries[index]![0], result.value);
      }

      return db.$transaction(async (tx) => {
        await lockLearnerProgress(tx, userId);
        const now = new Date();
        const entryIds = [
          ...new Set(attempts.map((attempt) => attempt.entryId)),
        ];
        const [existingAttempts, entries, savedProgress] = await Promise.all([
          tx.vocabularyPracticeAttempt.findMany({
            where: {
              userId,
              OR: [
                { id: { in: attempts.map((attempt) => attempt.attemptId) } },
                ...attempts.map((attempt) => ({
                  sessionId: attempt.sessionId,
                  entryId: attempt.entryId,
                })),
              ],
            },
            select: { id: true, sessionId: true, entryId: true },
          }),
          tx.vocabularyEntry.findMany({
            where: { id: { in: entryIds } },
            select: {
              id: true,
              vocabularySetId: true,
              term: true,
              definition: true,
            },
          }),
          tx.vocabularyProgress.findMany({
            where: { userId, entryId: { in: entryIds } },
            select: {
              entryId: true,
              contentHash: true,
              practicedAt: true,
              masteredAt: true,
              nextReviewAt: true,
              correctRecallCount: true,
            },
          }),
        ]);

        // Replays the attempts in order against in-memory state, so later
        // attempts see earlier ones exactly like one-by-one writes would.
        const recordedIds = new Set(existingAttempts.map(({ id }) => id));
        const recordedPairs = new Set(
          existingAttempts.map(
            ({ sessionId, entryId }) => `${sessionId}\u0000${entryId}`,
          ),
        );
        const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
        const progressByEntry = new Map<
          string,
          VocabularyProgressState & { contentHash: string }
        >(savedProgress.map(({ entryId, ...saved }) => [entryId, saved]));
        const acceptedAttempts: VocabularyAttemptInput[] = [];
        const progressWrites = new Map<
          string,
          VocabularyProgressState & { contentHash: string }
        >();
        let duplicates = 0;
        let skipped = 0;

        for (const attempt of attempts) {
          const pair = `${attempt.sessionId}\u0000${attempt.entryId}`;
          if (recordedIds.has(attempt.attemptId) || recordedPairs.has(pair)) {
            duplicates += 1;
            continue;
          }

          const entry = entriesById.get(attempt.entryId);
          // An entry deleted since the (offline) attempt has nothing left to
          // record progress on; skip it instead of rejecting the whole batch.
          if (!entry) {
            skipped += 1;
            continue;
          }
          // An existing entry must belong to the authorized set.
          if (entry.vocabularySetId !== attempt.vocabularySetId) {
            throw new TRPCError({ code: "NOT_FOUND" });
          }

          const contentHash = vocabularyContentHash(entry);
          const saved = progressByEntry.get(attempt.entryId);
          const current =
            saved?.contentHash === contentHash
              ? saved
              : emptyVocabularyProgress();
          const next = {
            contentHash,
            ...advanceVocabularyProgress(current, attempt, now),
          };
          progressByEntry.set(attempt.entryId, next);
          progressWrites.set(attempt.entryId, next);
          recordedIds.add(attempt.attemptId);
          recordedPairs.add(pair);
          acceptedAttempts.push(attempt);
        }

        if (acceptedAttempts.length) {
          await tx.vocabularyPracticeAttempt.createMany({
            data: acceptedAttempts.map((attempt) => ({
              id: attempt.attemptId,
              sessionId: attempt.sessionId,
              entryId: attempt.entryId,
              userId,
              sourceCourseItemId: attempt.sourceCourseItemId,
              gameKey: attempt.gameKey,
              evidence: attempt.evidence,
              result: attempt.result,
            })),
          });
          await tx.$executeRaw(
            buildVocabularyProgressUpsert(userId, progressWrites, now),
          );
        }

        const correctAttempts = acceptedAttempts.filter(
          (attempt) => attempt.result === "CORRECT",
        );
        if (correctAttempts.length) {
          await recordGamificationActivities(tx, {
            action: "VOCABULARY_REVIEWED",
            activities: correctAttempts.map((attempt) => ({
              idempotencyKey: `vocabulary-attempt:${userId}:${attempt.attemptId}`,
              metadata: {
                entryId: attempt.entryId,
                evidence: attempt.evidence,
                gameKey: attempt.gameKey,
                sourceCourseItemId: attempt.sourceCourseItemId,
              },
              organizationId: authorized.get(
                `${attempt.sourceCourseItemId}:${attempt.vocabularySetId}`,
              )!.organizationId,
            })),
            timeZone,
            userId,
          });
        }

        const evidenceBySet = await getVocabularyEvidenceForSets(
          tx,
          userId,
          [...scopes.values()].map((scope) => scope.vocabularySetId),
        );
        const completedPlacementIds = new Set<string>();
        const sets = [...scopes].map(([key, scope]) => {
          const evidence = evidenceBySet.get(scope.vocabularySetId)!;
          if (evidence.practiced) {
            completedPlacementIds.add(authorized.get(key)!.placementId);
          }
          return { vocabularySetId: scope.vocabularySetId, ...evidence };
        });
        if (completedPlacementIds.size) {
          // Completion is durable: missing rows are created completed, and
          // only rows that are not completed yet get a completion time.
          const courseItemIds = [...completedPlacementIds];
          await tx.contentProgress.createMany({
            data: courseItemIds.map((courseItemId) => ({
              courseItemId,
              userId,
              status: "COMPLETED" as const,
              completedAt: now,
            })),
            skipDuplicates: true,
          });
          await tx.contentProgress.updateMany({
            where: {
              userId,
              courseItemId: { in: courseItemIds },
              status: { not: "COMPLETED" },
            },
            data: { status: "COMPLETED", completedAt: now },
          });
        }

        return {
          accepted: acceptedAttempts.length,
          duplicates,
          skipped,
          sets,
        };
      });
    },
  };
}

function buildVocabularyProgressUpsert(
  userId: string,
  progress: Map<string, VocabularyProgressState & { contentHash: string }>,
  now: Date,
) {
  const timestamp = (date: Date | null) => date?.toISOString() ?? null;
  const rows = Prisma.join(
    [...progress].map(
      ([entryId, state]) => Prisma.sql`(
        ${entryId},
        ${userId},
        ${state.contentHash},
        ${timestamp(state.practicedAt)}::timestamp,
        ${timestamp(state.masteredAt)}::timestamp,
        ${timestamp(state.nextReviewAt)}::timestamp,
        ${state.correctRecallCount}::integer,
        ${now.toISOString()}::timestamp
      )`,
    ),
  );
  return Prisma.sql`
    INSERT INTO "VocabularyProgress" (
      "entryId",
      "userId",
      "contentHash",
      "practicedAt",
      "masteredAt",
      "nextReviewAt",
      "correctRecallCount",
      "updatedAt"
    )
    VALUES ${rows}
    ON CONFLICT ("entryId", "userId") DO UPDATE SET
      "contentHash" = EXCLUDED."contentHash",
      "practicedAt" = EXCLUDED."practicedAt",
      "masteredAt" = EXCLUDED."masteredAt",
      "nextReviewAt" = EXCLUDED."nextReviewAt",
      "correctRecallCount" = EXCLUDED."correctRecallCount",
      "updatedAt" = EXCLUDED."updatedAt"
  `;
}
