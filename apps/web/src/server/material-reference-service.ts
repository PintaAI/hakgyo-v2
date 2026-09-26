import { TRPCError } from "@trpc/server";

import type { Prisma } from "../../generated/prisma/client";
import {
  collectMaterialReferenceIds,
  removeInvalidMaterialReferences,
} from "~/lib/blocknote/resource-references";
import {
  getLearnerPdfBooksForSources,
  sanitizePdfPageBlocks,
} from "~/server/pdf-book/service";

type DatabaseClient = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

const emptyDocument = [{ type: "paragraph", content: [] }];

export async function sanitizeMaterialContent(
  db: DatabaseClient,
  organizationId: string,
  content: unknown,
): Promise<Prisma.InputJsonValue> {
  const references = collectMaterialReferenceIds(content);
  const [assessments, vocabularySets] = await Promise.all([
    references.assessmentIds.length
      ? db.assessment.findMany({
          where: {
            id: { in: references.assessmentIds },
            organizationId,
          },
          select: { id: true },
        })
      : [],
    references.vocabularySetIds.length
      ? db.vocabularySet.findMany({
          where: {
            id: { in: references.vocabularySetIds },
            organizationId,
          },
          select: { id: true },
        })
      : [],
  ]);
  const cleaned = await sanitizePdfPageBlocks(
    db,
    organizationId,
    removeInvalidMaterialReferences(content, {
      assessmentIds: new Set(assessments.map(({ id }) => id)),
      vocabularySetIds: new Set(vocabularySets.map(({ id }) => id)),
    }),
  );
  return (cleaned.length ? cleaned : emptyDocument) as Prisma.InputJsonValue;
}

export async function assertPublishedMaterialReferences(
  db: DatabaseClient,
  input: {
    content: unknown;
    moduleId: string;
    organizationId: string;
  },
) {
  const references = collectMaterialReferenceIds(input.content);
  if (!references.assessmentIds.length && !references.vocabularySetIds.length) {
    return;
  }

  const [assessments, assessmentItems, vocabularySets, vocabularyItems] =
    await Promise.all([
      db.assessment.findMany({
        where: {
          id: { in: references.assessmentIds },
          organizationId: input.organizationId,
          status: "PUBLISHED",
        },
        select: { id: true },
      }),
      db.courseItem.findMany({
        where: {
          moduleId: input.moduleId,
          organizationId: input.organizationId,
          isPublished: true,
          assessmentId: { in: references.assessmentIds },
        },
        select: { assessmentId: true },
      }),
      db.vocabularySet.findMany({
        where: {
          id: { in: references.vocabularySetIds },
          organizationId: input.organizationId,
        },
        select: { id: true },
      }),
      db.courseItem.findMany({
        where: {
          moduleId: input.moduleId,
          organizationId: input.organizationId,
          isPublished: true,
          vocabularySetId: { in: references.vocabularySetIds },
        },
        select: { vocabularySetId: true },
      }),
    ]);

  const availableAssessments = new Set(assessments.map(({ id }) => id));
  const attachedAssessments = new Set(
    assessmentItems.flatMap(({ assessmentId }) =>
      assessmentId ? [assessmentId] : [],
    ),
  );
  const availableVocabulary = new Set(vocabularySets.map(({ id }) => id));
  const attachedVocabulary = new Set(
    vocabularyItems.flatMap(({ vocabularySetId }) =>
      vocabularySetId ? [vocabularySetId] : [],
    ),
  );
  const invalidAssessments = references.assessmentIds.filter(
    (id) => !availableAssessments.has(id) || !attachedAssessments.has(id),
  );
  const invalidVocabulary = references.vocabularySetIds.filter(
    (id) => !availableVocabulary.has(id) || !attachedVocabulary.has(id),
  );

  if (invalidAssessments.length || invalidVocabulary.length) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Publish gagal: setiap block vocabulary dan assessment harus merujuk ke item published dalam module yang sama; assessment juga harus berstatus Published.",
    });
  }
}

type ReferenceSource = {
  content: unknown;
  moduleId: string;
  organizationId: string;
};

/**
 * Learner view of the resources embedded in several materials. Vocabulary sets, assessments and PDF
 * book pages are loaded with one query each for all materials, then split per material (same
 * organization, placed in the material's module). A query is skipped when no material embeds
 * that resource kind.
 */
export async function getLearnerMaterialReferencesForSources(
  db: DatabaseClient,
  sources: readonly ReferenceSource[],
) {
  const references = sources.map((source) =>
    collectMaterialReferenceIds(source.content),
  );
  const vocabularySetIds = [
    ...new Set(references.flatMap((reference) => reference.vocabularySetIds)),
  ];
  const assessmentIds = [
    ...new Set(references.flatMap((reference) => reference.assessmentIds)),
  ];
  const moduleIds = [...new Set(sources.map((source) => source.moduleId))];
  const organizationIds = [
    ...new Set(sources.map((source) => source.organizationId)),
  ];
  const [vocabularySets, assessments, pdfBooks] = await Promise.all([
    vocabularySetIds.length === 0
      ? []
      : db.vocabularySet.findMany({
          where: {
            id: { in: vocabularySetIds },
            organizationId: { in: organizationIds },
          },
          select: {
            id: true,
            organizationId: true,
            title: true,
            description: true,
            entries: {
              orderBy: [{ createdAt: "asc" }, { id: "asc" }],
              select: {
                id: true,
                term: true,
                definition: true,
                examples: true,
                audioAsset: { select: { id: true, fileName: true } },
                imageAsset: { select: { id: true, fileName: true } },
              },
            },
            courseItems: {
              where: { moduleId: { in: moduleIds }, isPublished: true },
              select: { id: true, moduleId: true },
            },
          },
        }),
    assessmentIds.length === 0
      ? []
      : db.assessment.findMany({
          where: {
            id: { in: assessmentIds },
            organizationId: { in: organizationIds },
            status: "PUBLISHED",
          },
          select: {
            id: true,
            organizationId: true,
            title: true,
            description: true,
            _count: { select: { questions: true } },
            courseItems: {
              where: { moduleId: { in: moduleIds }, isPublished: true },
              select: { id: true, moduleId: true },
            },
          },
        }),
    getLearnerPdfBooksForSources(db, sources),
  ]);

  return sources.map((source, index) => {
    const reference = references[index]!;
    const setIds = new Set(reference.vocabularySetIds);
    const referencedAssessmentIds = new Set(reference.assessmentIds);
    return {
      pdfBooks: pdfBooks[index]!,
      vocabularySets: vocabularySets.flatMap(
        ({ courseItems, organizationId, ...set }) => {
          const courseItem = courseItems.find(
            (candidate) => candidate.moduleId === source.moduleId,
          );
          return setIds.has(set.id) &&
            organizationId === source.organizationId &&
            courseItem
            ? [{ ...set, courseItemId: courseItem.id }]
            : [];
        },
      ),
      assessments: assessments.flatMap(
        ({ _count, courseItems, organizationId, ...assessment }) => {
          const courseItem = courseItems.find(
            (candidate) => candidate.moduleId === source.moduleId,
          );
          return referencedAssessmentIds.has(assessment.id) &&
            organizationId === source.organizationId &&
            courseItem
            ? [
                {
                  ...assessment,
                  questionCount: _count.questions,
                  courseItemId: courseItem.id,
                },
              ]
            : [];
        },
      ),
    };
  });
}

export async function getLearnerMaterialReferences(
  db: DatabaseClient,
  input: ReferenceSource,
) {
  const [references] = await getLearnerMaterialReferencesForSources(db, [
    input,
  ]);
  return references!;
}
