import type { Prisma } from "../../../generated/prisma/client";
import {
  canAccessLearningContent,
  canManageContent,
} from "~/server/authorization/permissions";
import { courseAccessCohortWhere } from "~/server/enrollment/cohort-access";
import {
  getCourseOutlineForUser,
  getCourseOutlinesForUser,
} from "~/server/learning/course-outline";
import {
  collectMaterialLinkTargets,
  materialExcerpt,
  materialLinkSections,
  type ResolvedMaterialLink,
} from "@hakgyo/shared/material-links";

type DatabaseClient = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

type LinkSource = {
  content: unknown;
  courseId: string;
  organizationId: string;
};

// A lesson links a handful of materials; anything past this is ignored rather
// than loading an unbounded number of documents.
const MAX_LINKED_MATERIALS = 100;

function candidateItemSelect(userId: string, now: Date) {
  return {
    id: true,
    materialId: true,
    isPublished: true,
    position: true,
    module: {
      select: {
        id: true,
        position: true,
        course: {
          select: {
            id: true,
            status: true,
            progressionMode: true,
            owner: { select: { userId: true } },
            collaborators: {
              where: { role: "EDITOR", organizationMember: { userId } },
              select: { id: true },
              take: 1,
            },
            organization: {
              select: {
                permissionMode: true,
                members: {
                  where: { userId },
                  select: { role: true },
                  take: 1,
                },
              },
            },
            cohorts: {
              where: { staff: { some: { organizationMember: { userId } } } },
              select: { id: true },
              take: 1,
            },
            _count: {
              select: {
                cohorts: { where: courseAccessCohortWhere(userId, now) },
              },
            },
          },
        },
      },
    },
  } satisfies Prisma.CourseItemSelect;
}

/**
 * Resolves the material links (`hakgyo-material:` hrefs) in several materials to course items the
 * viewer can open, with the same rules as `requireCourseItemAccess`: an item in the source's own
 * course is preferred, otherwise any item the viewer may study in another course (published item
 * of a published course they belong to through a cohort, or any item of a course they manage or
 * teach). Items in locked modules of sequential courses are skipped. Unresolvable targets are
 * omitted. Two queries for all sources, plus an outline load (request-memoized for a single course)
 * when a sequential course is involved.
 */
export async function resolveMaterialLinksForSources(
  db: DatabaseClient,
  userId: string,
  sources: readonly LinkSource[],
): Promise<ResolvedMaterialLink[][]> {
  const targets = sources.map((source) =>
    collectMaterialLinkTargets(source.content),
  );
  const materialIds = [
    ...new Set(targets.flatMap((list) => list.map((t) => t.materialId))),
  ].slice(0, MAX_LINKED_MATERIALS);
  if (materialIds.length === 0) return sources.map(() => []);
  const organizationIds = [
    ...new Set(sources.map((source) => source.organizationId)),
  ];

  const now = new Date();
  const [materials, items] = await Promise.all([
    db.material.findMany({
      where: {
        id: { in: materialIds },
        organizationId: { in: organizationIds },
      },
      select: {
        id: true,
        organizationId: true,
        title: true,
        description: true,
        content: true,
      },
    }),
    db.courseItem.findMany({
      where: {
        materialId: { in: materialIds },
        organizationId: { in: organizationIds },
      },
      select: candidateItemSelect(userId, now),
    }),
  ]);

  const openable = items.filter((item) => {
    const course = item.module.course;
    return canAccessLearningContent({
      ...courseScope(course, userId),
      hasActiveEnrollment: course._count.cohorts > 0,
      isCoursePublished: course.status === "PUBLISHED",
      isItemPublished: item.isPublished,
    });
  });

  // Learners of sequential courses can only open items in unlocked modules.
  const sequentialCourseIds = [
    ...new Set(
      openable.flatMap(({ module: { course } }) => {
        const scope = courseScope(course, userId);
        return course.progressionMode === "SEQUENTIAL" &&
          !canManageContent(scope) &&
          !scope.isCohortStaff
          ? [course.id]
          : [];
      }),
    ),
  ];
  const sequentialLearnerCourseIds = new Set(sequentialCourseIds);
  const unlockedItemIds = new Set<string>();
  if (sequentialCourseIds.length) {
    // Usually only the item's own course, whose outline the access check has
    // already loaded for this request; several courses load in one batch.
    const outlines =
      sequentialCourseIds.length === 1
        ? await getCourseOutlineForUser(sequentialCourseIds[0]!, userId).then(
            (outline) => [outline],
            () => [],
          )
        : await getCourseOutlinesForUser(
            { id: { in: sequentialCourseIds } },
            userId,
            { managementAccess: false },
          );
    for (const outline of outlines) {
      for (const outlineModule of outline.modules) {
        if (outlineModule.access === "LOCKED") continue;
        for (const outlineItem of outlineModule.items) {
          unlockedItemIds.add(outlineItem.id);
        }
      }
    }
  }
  const reachable = openable
    .filter(
      (item) =>
        !sequentialLearnerCourseIds.has(item.module.course.id) ||
        unlockedItemIds.has(item.id),
    )
    .sort(
      (a, b) =>
        a.module.course.id.localeCompare(b.module.course.id) ||
        a.module.position - b.module.position ||
        a.position - b.position,
    );

  const materialById = new Map(materials.map((m) => [m.id, m]));
  return sources.map((source, index) => {
    const anchorsByMaterial = new Map<string, string[]>();
    for (const target of targets[index]!) {
      const anchors = anchorsByMaterial.get(target.materialId) ?? [];
      if (target.anchor) anchors.push(target.anchor);
      anchorsByMaterial.set(target.materialId, anchors);
    }
    return [...anchorsByMaterial].flatMap(([materialId, anchors]) => {
      const material = materialById.get(materialId);
      if (material?.organizationId !== source.organizationId) {
        return [];
      }
      const candidates = reachable.filter(
        (item) => item.materialId === materialId,
      );
      const item =
        candidates.find(
          (candidate) => candidate.module.course.id === source.courseId,
        ) ?? candidates[0];
      if (!item) return [];
      return [
        {
          materialId,
          courseId: item.module.course.id,
          courseItemId: item.id,
          title: material.title,
          // Falls back to the start of the content for an empty description.
          description:
            [
              material.description?.trim(),
              materialExcerpt(material.content),
            ].find(Boolean) ?? null,
          sections: materialLinkSections(material.content, anchors),
        } satisfies ResolvedMaterialLink,
      ];
    });
  });
}

function courseScope(
  course: Prisma.CourseItemGetPayload<{
    select: ReturnType<typeof candidateItemSelect>;
  }>["module"]["course"],
  userId: string,
) {
  return {
    organizationRole: course.organization.members[0]?.role,
    permissionMode: course.organization.permissionMode,
    isCourseOwner: course.owner.userId === userId,
    isCourseEditor: course.collaborators.length > 0,
    isCohortStaff: course.cohorts.length > 0,
  };
}
