import type { Prisma } from "../../../generated/prisma/client";
import {
  passesAssessmentRequirement,
  passesRequirementPolicy,
} from "~/server/learning/material-completion";
import {
  emptyVocabularyProgress,
  vocabularyContentHash,
  vocabularyProgressStatus,
  type VocabularyProgressState,
} from "./progress-policy";

export type EvidenceDb = Pick<
  Prisma.TransactionClient,
  "vocabularyEntry" | "material" | "assessmentAttempt"
>;

export type VocabularySetEvidence = ReturnType<
  typeof summarizeVocabularyEvidence
>;

export async function getVocabularyEvidence(
  db: EvidenceDb,
  userId: string,
  vocabularySetId: string,
): Promise<VocabularySetEvidence> {
  const evidence = await getVocabularyEvidenceForSets(db, userId, [
    vocabularySetId,
  ]);
  return evidence.get(vocabularySetId) ?? summarizeVocabularyEvidence([]);
}

/**
 * `getVocabularyEvidence` for several sets in one query. Every requested set id is present in
 * the result; sets without entries report empty, unpracticed evidence.
 */
export async function getVocabularyEvidenceForSets(
  db: EvidenceDb,
  userId: string,
  vocabularySetIds: readonly string[],
): Promise<Map<string, VocabularySetEvidence>> {
  const setIds = [...new Set(vocabularySetIds)];
  const entries = setIds.length
    ? await db.vocabularyEntry.findMany({
        where: { vocabularySetId: { in: setIds } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          vocabularySetId: true,
          term: true,
          definition: true,
          progress: { where: { userId } },
        },
      })
    : [];
  const entriesBySet = new Map<string, typeof entries>(
    setIds.map((setId) => [setId, []]),
  );
  for (const entry of entries)
    entriesBySet.get(entry.vocabularySetId)?.push(entry);
  const now = new Date();
  return new Map(
    [...entriesBySet].map(([setId, setEntries]) => [
      setId,
      summarizeVocabularyEvidence(setEntries, now),
    ]),
  );
}

function summarizeVocabularyEvidence(
  entries: {
    id: string;
    term: string;
    definition: string;
    progress: (VocabularyProgressState & { contentHash: string })[];
  }[],
  now = new Date(),
) {
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
        (state.nextReviewAt === null || state.nextReviewAt <= now),
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
  const requirements = material.completionRequirements;
  const vocabularySetIds = requirements.flatMap((requirement) =>
    requirement.type === "VOCABULARY_SET" && requirement.vocabularySetId
      ? [requirement.vocabularySetId]
      : [],
  );
  const assessmentIds = requirements.flatMap((requirement) =>
    requirement.type !== "VOCABULARY_SET" && requirement.assessmentId
      ? [requirement.assessmentId]
      : [],
  );
  const [vocabularyEvidence, attempts] = await Promise.all([
    getVocabularyEvidenceForSets(db, userId, vocabularySetIds),
    assessmentIds.length
      ? db.assessmentAttempt.findMany({
          where: {
            assessmentId: { in: [...new Set(assessmentIds)] },
            userId,
            status: "GRADED",
          },
          select: {
            assessmentId: true,
            status: true,
            score: true,
            maxScore: true,
          },
        })
      : [],
  ]);
  const results = requirements.map((requirement) => {
    if (requirement.type === "VOCABULARY_SET") {
      return (
        requirement.vocabularySetId !== null &&
        (vocabularyEvidence.get(requirement.vocabularySetId)?.practiced ??
          false)
      );
    }
    if (!requirement.assessmentId) return false;
    return passesAssessmentRequirement(
      attempts.filter(
        (attempt) => attempt.assessmentId === requirement.assessmentId,
      ),
      requirement.minimumScore,
      requirement.assessment?.passingScore ?? null,
    );
  });
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
