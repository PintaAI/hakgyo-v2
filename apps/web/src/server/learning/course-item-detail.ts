import type { Prisma } from "../../../generated/prisma/client";
import { passesAssessmentRequirement } from "~/server/learning/material-completion";
import { getLearnerMaterialReferencesForSources } from "~/server/material-reference-service";
import { getVocabularyEvidenceForSets } from "~/server/vocabulary/evidence";

type DatabaseClient = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

function courseItemDetailSelect(userId: string) {
  return {
    id: true,
    moduleId: true,
    organizationId: true,
    type: true,
    position: true,
    module: { select: { courseId: true } },
    material: {
      select: {
        id: true,
        title: true,
        description: true,
        content: true,
        editorSchemaVersion: true,
        completionRequirements: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            type: true,
            minimumScore: true,
            vocabularySet: {
              select: {
                id: true,
                title: true,
                courseItems: {
                  where: { isPublished: true },
                  orderBy: [{ position: "asc" }, { id: "asc" }],
                  select: { id: true, moduleId: true },
                },
              },
            },
            assessment: {
              select: {
                id: true,
                title: true,
                passingScore: true,
                attempts: {
                  where: { userId, status: "GRADED" },
                  select: { status: true, score: true, maxScore: true },
                },
                courseItems: {
                  where: { isPublished: true },
                  orderBy: [{ position: "asc" }, { id: "asc" }],
                  select: { id: true, moduleId: true },
                },
              },
            },
          },
        },
        assets: {
          where: {
            asset: { confirmedAt: { not: null }, deletedAt: null },
          },
          select: {
            asset: {
              select: {
                id: true,
                fileName: true,
                contentType: true,
                size: true,
              },
            },
          },
        },
      },
    },
    vocabularySet: {
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
            metadata: true,
            audioAsset: {
              select: {
                id: true,
                fileName: true,
                contentType: true,
                size: true,
              },
            },
            imageAsset: {
              select: {
                id: true,
                fileName: true,
                contentType: true,
                size: true,
              },
            },
          },
        },
      },
    },
    assessment: {
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        _count: { select: { questions: true } },
      },
    },
    progress: {
      where: { userId },
      select: { status: true, startedAt: true, completedAt: true },
      take: 1,
    },
  } satisfies Prisma.CourseItemSelect;
}

/**
 * Learner view of course items (`learning.getCourseItem`), batched: one item query, one query per
 * embedded resource kind, and one vocabulary-evidence query regardless of the item count.
 * Callers must authorize every item first. Missing items are omitted.
 */
export async function getCourseItemDetails(
  db: DatabaseClient,
  userId: string,
  courseItemIds: readonly string[],
) {
  const ids = [...new Set(courseItemIds)];
  const items = ids.length
    ? await db.courseItem.findMany({
        where: { id: { in: ids } },
        select: courseItemDetailSelect(userId),
      })
    : [];
  const materialItems = items.flatMap((item) =>
    item.material
      ? [
          {
            id: item.id,
            source: {
              content: item.material.content,
              moduleId: item.moduleId,
              organizationId: item.organizationId,
            },
          },
        ]
      : [],
  );
  const [references, vocabularyEvidence] = await Promise.all([
    getLearnerMaterialReferencesForSources(
      db,
      materialItems.map(({ source }) => source),
    ),
    getVocabularyEvidenceForSets(
      db,
      userId,
      items.flatMap((item) =>
        (item.material?.completionRequirements ?? []).flatMap((requirement) =>
          requirement.type === "VOCABULARY_SET" && requirement.vocabularySet
            ? [requirement.vocabularySet.id]
            : [],
        ),
      ),
    ),
  ]);
  const referencesByItem = new Map(
    materialItems.map(({ id }, index) => [id, references[index]!]),
  );

  const details = items.map((item) => {
    const selectedMaterial = item.material;
    const embeddedResources = referencesByItem.get(item.id) ?? {
      pdfBooks: [],
      vocabularySets: [],
      assessments: [],
    };
    const learnerMaterial = selectedMaterial
      ? (() => {
          const { completionRequirements, ...material } = selectedMaterial;
          const requiredActivities = completionRequirements
            .map((requirement) => {
              const completed =
                requirement.type === "VOCABULARY_SET"
                  ? !!requirement.vocabularySet &&
                    (vocabularyEvidence.get(requirement.vocabularySet.id)
                      ?.practiced ??
                      false)
                  : !!requirement.assessment &&
                    passesAssessmentRequirement(
                      requirement.assessment.attempts,
                      requirement.minimumScore,
                      requirement.assessment.passingScore,
                    );
              if (completed) return null;
              const resource =
                requirement.type === "VOCABULARY_SET"
                  ? requirement.vocabularySet
                  : requirement.assessment;
              const courseItem = resource?.courseItems.find(
                (candidate) => candidate.moduleId === item.moduleId,
              );
              return resource && courseItem
                ? {
                    id: requirement.id,
                    type: requirement.type,
                    resourceId: resource.id,
                    courseItemId: courseItem.id,
                    title: resource.title,
                  }
                : null;
            })
            .filter((activity) => activity !== null);
          return { ...material, requiredActivities };
        })()
      : null;
    return {
      ...item,
      material: learnerMaterial,
      embeddedResources: {
        ...embeddedResources,
        courseId: item.module.courseId,
        sourceCourseItemId: item.id,
      },
    };
  });
  return new Map(details.map((detail) => [detail.id, detail]));
}

export type CourseItemDetail = NonNullable<
  ReturnType<Awaited<ReturnType<typeof getCourseItemDetails>>["get"]>
>;
