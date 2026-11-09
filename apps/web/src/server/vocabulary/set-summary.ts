import type { Prisma } from "../../../generated/prisma/client";
import {
  getVocabularyEvidenceForSets,
  type EvidenceDb,
  type VocabularySetEvidence,
} from "./evidence";

/**
 * Where the learner stands with one vocabulary set, in numbers: what the
 * mobile Latihan sheet ranks its suggestions by ("6 kata perlu diulang").
 */
export type VocabularySetSummary = {
  total: number;
  /** Practised but never recalled correctly yet ("perlu dihafal"). */
  memorize: number;
  learned: number;
  mastered: number;
  /** Practised words whose review was due when the summary was made. */
  due: number;
  /**
   * When the other practised words fall due, ISO and ascending, so the app
   * counts due words at any later time without asking the server again.
   */
  upcomingReviews: string[];
  /** The last practice of any word, ISO; null when never practised. */
  lastPracticedAt: string | null;
  /** Words with an example sentence, which Susun makna plays on. */
  withExamples: number;
};

/** Whether an entry's examples hold any sentence (string list or lines). */
export function hasExampleSentence(examples: unknown) {
  const lines = Array.isArray(examples)
    ? examples
    : typeof examples === "string"
      ? examples.split("\n")
      : [];
  return lines.some((line) => typeof line === "string" && line.trim() !== "");
}

export function summarizeVocabularySet(
  evidence: Pick<VocabularySetEvidence, "items" | "counts">,
  now: Date,
  withExamples = 0,
): VocabularySetSummary {
  let lastPracticedAt: Date | null = null;
  const upcoming: Date[] = [];
  let memorize = 0;
  for (const item of evidence.items) {
    if (item.practiced && !item.learned) memorize += 1;
    if (
      item.practicedAt &&
      (!lastPracticedAt || item.practicedAt > lastPracticedAt)
    )
      lastPracticedAt = item.practicedAt;
    if (item.practiced && item.nextReviewAt && item.nextReviewAt > now)
      upcoming.push(item.nextReviewAt);
  }
  return {
    total: evidence.counts.total,
    memorize,
    learned: evidence.counts.learned,
    mastered: evidence.counts.mastered,
    due: evidence.counts.due,
    upcomingReviews: upcoming
      .sort((a, b) => a.getTime() - b.getTime())
      .map((date) => date.toISOString()),
    lastPracticedAt: lastPracticedAt?.toISOString() ?? null,
    withExamples,
  };
}

/** Summaries of the vocabulary sets placed at the given course items, by item. */
export async function getVocabularySetSummaries(
  db: EvidenceDb & Pick<Prisma.TransactionClient, "courseItem">,
  userId: string,
  courseItemIds: readonly string[],
  now = new Date(),
) {
  const byCourseItem: Record<string, VocabularySetSummary> = {};
  if (courseItemIds.length === 0) return byCourseItem;
  const placements = await db.courseItem.findMany({
    where: {
      id: { in: [...new Set(courseItemIds)] },
      type: "VOCABULARY_SET",
      vocabularySetId: { not: null },
    },
    select: { id: true, vocabularySetId: true },
  });
  const setIds = placements.flatMap((placement) =>
    placement.vocabularySetId ? [placement.vocabularySetId] : [],
  );
  const [evidence, examples] = await Promise.all([
    getVocabularyEvidenceForSets(db, userId, setIds),
    db.vocabularyEntry.findMany({
      where: { vocabularySetId: { in: setIds } },
      select: { vocabularySetId: true, examples: true },
    }),
  ]);
  const withExamples = new Map<string, number>();
  for (const entry of examples) {
    if (!hasExampleSentence(entry.examples)) continue;
    withExamples.set(
      entry.vocabularySetId,
      (withExamples.get(entry.vocabularySetId) ?? 0) + 1,
    );
  }
  for (const placement of placements) {
    const setId = placement.vocabularySetId;
    const setEvidence = setId ? evidence.get(setId) : undefined;
    if (!setId || !setEvidence) continue;
    byCourseItem[placement.id] = summarizeVocabularySet(
      setEvidence,
      now,
      withExamples.get(setId) ?? 0,
    );
  }
  return byCourseItem;
}
