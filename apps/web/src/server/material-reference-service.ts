import { TRPCError } from "@trpc/server";

import type { Prisma } from "../../generated/prisma/client";
import {
  collectMaterialReferenceIds,
  removeInvalidMaterialReferences,
} from "~/lib/blocknote/resource-references";

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
  const cleaned = removeInvalidMaterialReferences(content, {
    assessmentIds: new Set(assessments.map(({ id }) => id)),
    vocabularySetIds: new Set(vocabularySets.map(({ id }) => id)),
  });
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

export async function getLearnerMaterialReferences(
  db: DatabaseClient,
  input: {
    content: unknown;
    moduleId: string;
    organizationId: string;
  },
) {
  const references = collectMaterialReferenceIds(input.content);
  const [vocabularySets, assessments] = await Promise.all([
    db.vocabularySet.findMany({
      where: {
        id: { in: references.vocabularySetIds },
        organizationId: input.organizationId,
      },
      select: {
        id: true,
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
          where: { moduleId: input.moduleId, isPublished: true },
          select: { id: true },
          take: 1,
        },
      },
    }),
    db.assessment.findMany({
      where: {
        id: { in: references.assessmentIds },
        organizationId: input.organizationId,
        status: "PUBLISHED",
      },
      select: {
        id: true,
        title: true,
        description: true,
        _count: { select: { questions: true } },
        courseItems: {
          where: { moduleId: input.moduleId, isPublished: true },
          select: { id: true },
          take: 1,
        },
      },
    }),
  ]);

  return {
    vocabularySets: vocabularySets.flatMap(({ courseItems, ...set }) =>
      courseItems[0] ? [{ ...set, courseItemId: courseItems[0].id }] : [],
    ),
    assessments: assessments.flatMap(
      ({ _count, courseItems, ...assessment }) =>
        courseItems[0]
          ? [
              {
                ...assessment,
                questionCount: _count.questions,
                courseItemId: courseItems[0].id,
              },
            ]
          : [],
    ),
  };
}
