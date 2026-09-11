import type { Prisma } from "../../../generated/prisma/client";
import {
  passesAssessmentRequirement,
  passesRequirementPolicy,
} from "~/server/learning/material-completion";
import { emptyMemory, vocabularyContentHash } from "./recall-policy";

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
      memory: { where: { userId } },
    },
  });
  const items = entries.map((entry) => {
    const saved = entry.memory[0];
    const state =
      saved?.contentHash === vocabularyContentHash(entry)
        ? saved
        : emptyMemory();
    return {
      entryId: entry.id,
      passStreak: state.passStreak,
      failStreak: state.failStreak,
      rememberedAt: state.rememberedAt,
      nextReviewAt: state.nextReviewAt,
      remembered: state.rememberedAt !== null,
    };
  });
  return {
    items,
    remembered: items.length > 0 && items.every((item) => item.remembered),
  };
}

export async function isVocabularySetRemembered(
  db: EvidenceDb,
  userId: string,
  vocabularySetId: string,
) {
  return (await getVocabularyEvidence(db, userId, vocabularySetId)).remembered;
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
          isVocabularySetRemembered(db, userId, requirement.vocabularySetId)
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

// Vocabulary recall and manual content completion writers share this lock.
// Locking per learner also serializes different words completing the same set.
export async function lockLearnerProgress(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`vocabulary-progress:${userId}`}, 0))::text`;
}
