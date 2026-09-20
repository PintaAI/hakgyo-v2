import type { Prisma } from "../../../generated/prisma/client";
import {
  passesAssessmentRequirement,
  passesRequirementPolicy,
} from "~/server/learning/material-completion";
import {
  emptyVocabularyProgress,
  vocabularyContentHash,
  vocabularyProgressStatus,
} from "./progress-policy";

export type EvidenceDb = Pick<
  Prisma.TransactionClient,
  "vocabularyEntry" | "material" | "assessmentAttempt"
>;

export async function getVocabularyEvidence(
  db: EvidenceDb,
  userId: string,
  vocabularySetId: string,
) {
  const entries = await db.vocabularyEntry.findMany({
    where: { vocabularySetId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      term: true,
      definition: true,
      progress: { where: { userId } },
    },
  });
  const items = entries.map((entry) => {
    const saved = entry.progress[0];
    const current = saved?.contentHash === vocabularyContentHash(entry);
    const state = current ? saved : emptyVocabularyProgress();
    const status = vocabularyProgressStatus(state);
    return {
      entryId: entry.id,
      status,
      practicedAt: state.practicedAt,
      masteredAt: state.masteredAt,
      nextReviewAt: state.nextReviewAt,
      correctRecallCount: state.correctRecallCount,
      practiced: state.practicedAt !== null,
      mastered: state.masteredAt !== null,
      due:
        state.practicedAt !== null &&
        (state.nextReviewAt === null || state.nextReviewAt <= new Date()),
    };
  });
  return {
    items,
    practiced: items.length > 0 && items.every((item) => item.practiced),
    mastered: items.length > 0 && items.every((item) => item.mastered),
    counts: {
      total: items.length,
      new: items.filter((item) => item.status === "NEW").length,
      learning: items.filter((item) => item.status === "LEARNING").length,
      mastered: items.filter((item) => item.status === "MASTERED").length,
      due: items.filter((item) => item.due).length,
    },
  };
}

export async function isVocabularySetPracticed(
  db: EvidenceDb,
  userId: string,
  vocabularySetId: string,
) {
  return (await getVocabularyEvidence(db, userId, vocabularySetId)).practiced;
}

export async function meetsMaterialRequirements(
  db: EvidenceDb,
  userId: string,
  materialId: string,
) {
  const material = await db.material.findUnique({
    where: { id: materialId },
    select: {
      requirementPolicy: true,
      completionRequirements: {
        include: { assessment: { select: { passingScore: true } } },
      },
    },
  });
  if (!material) return false;
  const results = await Promise.all(
    material.completionRequirements.map(async (requirement) => {
      if (requirement.type === "VOCABULARY_SET") {
        return (
          requirement.vocabularySetId !== null &&
          isVocabularySetPracticed(db, userId, requirement.vocabularySetId)
        );
      }
      if (!requirement.assessmentId) return false;
      const attempts = await db.assessmentAttempt.findMany({
        where: {
          assessmentId: requirement.assessmentId,
          userId,
          status: "GRADED",
        },
        select: { status: true, score: true, maxScore: true },
      });
      return passesAssessmentRequirement(
        attempts,
        requirement.minimumScore,
        requirement.assessment?.passingScore ?? null,
      );
    }),
  );
  return passesRequirementPolicy(material.requirementPolicy, results);
}

// Vocabulary attempts and manual content completion writers share this lock.
// Locking per learner also serializes different words completing the same set.
export async function lockLearnerProgress(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`vocabulary-progress:${userId}`}, 0))::text`;
}
