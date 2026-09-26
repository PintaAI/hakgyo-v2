import { collectMaterialReferenceIds } from "~/lib/blocknote/resource-references";
import {
  BUNDLE_SCHEMA,
  type BundleAsset,
  type BundleAssessment,
  type BundleMaterial,
  type BundlePdfBook,
  type BundlePlacement,
  type BundleRequirement,
  type BundleStructure,
  type BundleVocabularySet,
  type CourseBundle,
  type SyncRevision,
} from "@hakgyo/shared/mobile-sync";
import { TRPCError } from "@trpc/server";

import type { Prisma } from "../../../generated/prisma/client";
import { learnerAssessmentItemSelect } from "~/server/assessment/learner-view";
import { getCourseRevisions } from "~/server/mobile/sync-log";
import { getLearnerPdfBooksForSources } from "~/server/pdf-book/service";

/** Only `course.findUnique`, `asset.findMany` and `pdfBookPage.findMany` are used. */
export type CourseBundleDb =
  Prisma.TransactionClient | Prisma.DefaultPrismaClient;

function omit<T extends object, K extends keyof T>(
  value: T,
  ...keys: K[]
): Omit<T, K> {
  const copy = { ...value };
  for (const key of keys) delete copy[key];
  return copy;
}

// `learnerAssessmentItemSelect` (what `assessment.getForCourseItem` loads)
// minus the two answer-revealing fields. Derived rather than copied so a new
// learner-visible field reaches the bundle automatically, while `isCorrect`
// and `explanation` can never be selected here.
const learnerAssessmentSelect = learnerAssessmentItemSelect.assessment.select;
const bundleAssessmentSelect = {
  ...omit(learnerAssessmentSelect, "questions"),
  questions: {
    orderBy: learnerAssessmentSelect.questions.orderBy,
    select: {
      ...omit(
        learnerAssessmentSelect.questions.select,
        "explanation",
        "options",
      ),
      options: {
        orderBy: learnerAssessmentSelect.questions.select.options.orderBy,
        select: omit(
          learnerAssessmentSelect.questions.select.options.select,
          "isCorrect",
        ),
      },
    },
  },
} satisfies Prisma.AssessmentSelect;

const assetSelect = {
  id: true,
  fileName: true,
  contentType: true,
  size: true,
} satisfies Prisma.AssetSelect;

const publishedAssetWhere = {
  confirmedAt: { not: null },
  deletedAt: null,
} satisfies Prisma.AssetWhereInput;

// Learner-visible fields of `courseItemDetailSelect` (course-item-detail.ts)
// without the per-user relations (progress, attempts); those come from the
// learner state.
const courseBundleSelect = {
  id: true,
  organizationId: true,
  title: true,
  description: true,
  thumbnailUrl: true,
  status: true,
  progressionMode: true,
  modules: {
    orderBy: { position: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      position: true,
      items: {
        where: { isPublished: true },
        orderBy: { position: "asc" },
        select: {
          id: true,
          organizationId: true,
          type: true,
          position: true,
          materialId: true,
          vocabularySetId: true,
          assessmentId: true,
          material: {
            select: {
              id: true,
              title: true,
              description: true,
              content: true,
              editorSchemaVersion: true,
              requirementPolicy: true,
              completionRequirements: {
                orderBy: { position: "asc" },
                select: {
                  id: true,
                  type: true,
                  minimumScore: true,
                  vocabularySet: { select: { id: true, title: true } },
                  assessment: {
                    select: { id: true, title: true, passingScore: true },
                  },
                },
              },
              assets: {
                where: { asset: publishedAssetWhere },
                select: { asset: { select: assetSelect } },
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
                  audioAssetId: true,
                  imageAssetId: true,
                },
              },
            },
          },
          assessment: { select: bundleAssessmentSelect },
        },
      },
    },
  },
} satisfies Prisma.CourseSelect;

export type CourseBundleSource = Prisma.CourseGetPayload<{
  select: typeof courseBundleSelect;
}>;

/**
 * Builds the shared bundle of a course: the revision is read first so a
 * write landing while the data loads makes the manifest report a newer
 * revision than the bundle, and the client refetches.
 */
export async function buildCourseBundle(
  db: CourseBundleDb & Parameters<typeof getCourseRevisions>[0],
  courseId: string,
): Promise<CourseBundle> {
  const revisions = await getCourseRevisions(db, [courseId]);
  return loadCourseBundle(db, courseId, revisions.get(courseId)?.bundle ?? "0");
}

/** `buildCourseBundle` with the revision already read. */
export async function loadCourseBundle(
  db: CourseBundleDb,
  courseId: string,
  revision: SyncRevision,
): Promise<CourseBundle> {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: courseBundleSelect,
  });
  if (!course) throw new TRPCError({ code: "NOT_FOUND" });

  const shaped = shapeCourseBundle(course);
  const materialSources = shaped.materialSources;
  const pdfBooksBySource = await getLearnerPdfBooksForSources(
    db,
    materialSources.map((source) => source.source),
  );
  const pdfBooks: Record<string, BundlePdfBook> = {};
  materialSources.forEach((source, index) => {
    const placement = shaped.placements[source.courseItemId]!;
    for (const book of pdfBooksBySource[index] ?? []) {
      placement.embedded.pdfBookIds.push(book.id);
      const existing = pdfBooks[book.id];
      if (!existing) {
        pdfBooks[book.id] = {
          id: book.id,
          title: book.title,
          pageOffset: book.pageOffset,
          pages: book.pages.map((page) => ({ ...page })),
        };
        continue;
      }
      const known = new Set(existing.pages.map((page) => page.pageNumber));
      for (const page of book.pages) {
        if (known.has(page.pageNumber)) continue;
        existing.pages.push({ ...page });
        known.add(page.pageNumber);
      }
      existing.pages.sort((a, b) => a.pageNumber - b.pageNumber);
    }
  });
  for (const book of Object.values(pdfBooks)) {
    for (const page of book.pages) shaped.assetIds.add(page.assetId);
  }

  const assetRows = shaped.assetIds.size
    ? await db.asset.findMany({
        where: { id: { in: [...shaped.assetIds] }, ...publishedAssetWhere },
        select: assetSelect,
      })
    : [];
  const assets: Record<string, BundleAsset> = {};
  for (const asset of assetRows) assets[asset.id] = asset;
  // Vocabulary and page assets were filtered by the asset query; material
  // asset lists were filtered in the course query. Keep them consistent.
  for (const material of Object.values(shaped.materials)) {
    material.assetIds = material.assetIds.filter((id) => id in assets);
  }

  return {
    schema: BUNDLE_SCHEMA,
    courseId: course.id,
    organizationId: course.organizationId,
    revision,
    structure: shaped.structure,
    content: {
      placements: shaped.placements,
      materials: shaped.materials,
      vocabularySets: shaped.vocabularySets,
      assessments: shaped.assessments,
      pdfBooks,
      assets,
    },
  };
}

/**
 * Pure shaping of the loaded course record. Embedded references and
 * requirements resolve in memory against the published placements of the
 * same module, following `getLearnerMaterialReferencesForSources`: an
 * embedded vocabulary set or assessment only counts when it is placed as a
 * published item in the material's module, and an embedded assessment must
 * also be PUBLISHED. Course items of one course share the organization, so
 * the same-organization rule holds by construction.
 */
export function shapeCourseBundle(course: CourseBundleSource) {
  const materials: Record<string, BundleMaterial> = {};
  const vocabularySets: Record<string, BundleVocabularySet> = {};
  const assessments: Record<string, BundleAssessment> = {};
  const placements: Record<string, BundlePlacement> = {};
  const assetIds = new Set<string>();
  const materialSources: Array<{
    courseItemId: string;
    source: { organizationId: string; content: unknown };
  }> = [];

  const structure: BundleStructure = {
    title: course.title,
    description: course.description,
    thumbnailUrl: course.thumbnailUrl,
    status: course.status,
    progressionMode: course.progressionMode,
    modules: course.modules.map((module) => ({
      id: module.id,
      title: module.title,
      description: module.description,
      position: module.position,
      items: module.items.map((item) => ({
        id: item.id,
        type: item.type,
        position: item.position,
        title:
          item.material?.title ??
          item.vocabularySet?.title ??
          item.assessment?.title ??
          "Untitled",
        materialId: item.material?.id ?? null,
        vocabularySetId: item.vocabularySet?.id ?? null,
        assessmentId: item.assessment?.id ?? null,
        assessmentPassingScore: item.assessment?.passingScore ?? null,
      })),
    })),
  };

  for (const courseModule of course.modules) {
    // Published placements of this module, by resource id.
    const vocabularyPlacements = new Map<string, string>();
    const assessmentPlacements = new Map<
      string,
      { courseItemId: string; status: string; passingScore: number | null }
    >();
    for (const item of courseModule.items) {
      if (
        item.vocabularySet &&
        !vocabularyPlacements.has(item.vocabularySet.id)
      ) {
        vocabularyPlacements.set(item.vocabularySet.id, item.id);
      }
      if (item.assessment && !assessmentPlacements.has(item.assessment.id)) {
        assessmentPlacements.set(item.assessment.id, {
          courseItemId: item.id,
          status: item.assessment.status,
          passingScore: item.assessment.passingScore,
        });
      }
    }

    for (const item of courseModule.items) {
      if (item.vocabularySet) {
        const set = item.vocabularySet;
        vocabularySets[set.id] ??= {
          id: set.id,
          title: set.title,
          description: set.description,
          entries: set.entries.map((entry) => {
            if (entry.audioAssetId) assetIds.add(entry.audioAssetId);
            if (entry.imageAssetId) assetIds.add(entry.imageAssetId);
            return {
              id: entry.id,
              term: entry.term,
              definition: entry.definition,
              examples: entry.examples,
              metadata: entry.metadata,
              audioAssetId: entry.audioAssetId,
              imageAssetId: entry.imageAssetId,
            };
          }),
        };
      }
      if (item.assessment?.status === "PUBLISHED") {
        const assessment = item.assessment;
        assessments[assessment.id] ??= {
          id: assessment.id,
          title: assessment.title,
          description: assessment.description,
          instructions: assessment.instructions,
          passingScore: assessment.passingScore,
          maxAttempts: assessment.maxAttempts,
          timeLimitMinutes: assessment.timeLimitMinutes,
          shuffleQuestions: assessment.shuffleQuestions,
          shuffleOptions: assessment.shuffleOptions,
          status: assessment.status,
          questionCount: assessment.questions.length,
          questions: assessment.questions.map((question) => ({
            id: question.id,
            type: question.type,
            prompt: question.prompt,
            points: question.points,
            position: question.position,
            options: question.options.map((option) => ({
              id: option.id,
              content: option.content,
              position: option.position,
            })),
          })),
        };
      }
      if (!item.material) continue;
      const material = item.material;
      materials[material.id] ??= {
        id: material.id,
        title: material.title,
        description: material.description,
        content: material.content,
        editorSchemaVersion: material.editorSchemaVersion,
        requirementPolicy: material.requirementPolicy,
        assetIds: material.assets.map(({ asset }) => asset.id),
      };
      for (const { asset } of material.assets) assetIds.add(asset.id);

      const references = collectMaterialReferenceIds(material.content);
      const requirements: BundleRequirement[] =
        material.completionRequirements.flatMap((requirement) => {
          const resource =
            requirement.type === "VOCABULARY_SET"
              ? requirement.vocabularySet
              : requirement.assessment;
          if (!resource) return [];
          const placedAssessment =
            requirement.type === "VOCABULARY_SET"
              ? null
              : (assessmentPlacements.get(resource.id) ?? null);
          const courseItemId =
            requirement.type === "VOCABULARY_SET"
              ? (vocabularyPlacements.get(resource.id) ?? null)
              : (placedAssessment?.courseItemId ?? null);
          return [
            {
              id: requirement.id,
              type: requirement.type,
              minimumScore: requirement.minimumScore,
              resourceId: resource.id,
              title: resource.title,
              courseItemId,
              passingScore:
                requirement.type === "VOCABULARY_SET"
                  ? null
                  : (requirement.assessment?.passingScore ?? null),
            },
          ];
        });
      placements[item.id] = {
        embedded: {
          vocabularySetIds: references.vocabularySetIds.flatMap((id) => {
            const courseItemId = vocabularyPlacements.get(id);
            return courseItemId ? [{ id, courseItemId }] : [];
          }),
          assessmentIds: references.assessmentIds.flatMap((id) => {
            const placed = assessmentPlacements.get(id);
            return placed?.status === "PUBLISHED"
              ? [{ id, courseItemId: placed.courseItemId }]
              : [];
          }),
          pdfBookIds: [],
        },
        requirements,
      };
      materialSources.push({
        courseItemId: item.id,
        source: {
          organizationId: item.organizationId,
          content: material.content,
        },
      });
    }
  }

  return {
    structure,
    materials,
    vocabularySets,
    assessments,
    placements,
    assetIds,
    materialSources,
  };
}
