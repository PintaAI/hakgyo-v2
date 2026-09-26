import { TRPCError } from "@trpc/server";

import type { Prisma } from "../../../generated/prisma/client";
import { EnrollmentStatus } from "../../../generated/prisma/enums";
import { canManageContent } from "~/server/authorization/permissions";
import { db } from "~/server/db";
import { accessGrantingCohortStatuses } from "~/server/enrollment/cohort-access";
import { memoizeForRequest } from "~/server/request-cache";
import {
  evaluateOpenModules,
  evaluateSequentialModules,
  hasPassedAssessment,
} from "./sequential-access";

const activeEnrollmentStatuses = [
  EnrollmentStatus.ACTIVE,
  EnrollmentStatus.COMPLETED,
] as const;

type OutlineOptions = { managementAccess?: boolean };

function courseOutlineSelect(userId: string, now: Date) {
  return {
    id: true,
    title: true,
    description: true,
    thumbnailUrl: true,
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
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        theme: true,
        themeEnabled: true,
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
    enrollments: {
      where: {
        userId,
        status: { in: [...activeEnrollmentStatuses] },
        source: { not: "COHORT" },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { id: true },
      take: 1,
    },
    // Active cohort enrollment, folded in as a filtered count because
    // `cohorts` is already selected for staff scope.
    _count: {
      select: {
        cohorts: {
          where: {
            status: { in: [...accessGrantingCohortStatuses] },
            OR: [{ endsAt: null }, { endsAt: { gt: now } }],
            enrollments: {
              some: { userId, status: { in: [...activeEnrollmentStatuses] } },
            },
          },
        },
      },
    },
    modules: {
      orderBy: { position: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        position: true,
        items: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            isPublished: true,
            type: true,
            position: true,
            material: { select: { id: true, title: true } },
            vocabularySet: { select: { id: true, title: true } },
            assessment: {
              select: {
                id: true,
                title: true,
                passingScore: true,
                // Only the latest attempt is shown; pass/fail comes from the
                // graded attempts loaded separately.
                attempts: {
                  where: { userId, assessmentEventId: null },
                  orderBy: { attemptNumber: "desc" },
                  take: 1,
                  select: {
                    id: true,
                    attemptNumber: true,
                    status: true,
                    score: true,
                    maxScore: true,
                    startedAt: true,
                  },
                },
              },
            },
            progress: {
              where: { userId, status: "COMPLETED" },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    },
  } satisfies Prisma.CourseSelect;
}

type CourseOutlineRecord = Prisma.CourseGetPayload<{
  select: ReturnType<typeof courseOutlineSelect>;
}>;

type PassEvidence = {
  status: string;
  score: number | null;
  maxScore: number | null;
};

// Only graded attempts with a usable score can pass an assessment (see
// hasPassedAssessment), so the rest never need to leave the database.
async function loadPassEvidence(
  userId: string,
  courseWhere: Prisma.CourseWhereInput,
) {
  const attempts = await db.assessmentAttempt.findMany({
    where: {
      userId,
      assessmentEventId: null,
      status: "GRADED",
      score: { not: null },
      maxScore: { gt: 0 },
      assessment: {
        courseItems: { some: { module: { course: courseWhere } } },
      },
    },
    select: { assessmentId: true, status: true, score: true, maxScore: true },
  });
  const byAssessment = new Map<string, PassEvidence[]>();
  for (const { assessmentId, ...attempt } of attempts) {
    const list = byAssessment.get(assessmentId);
    if (list) list.push(attempt);
    else byAssessment.set(assessmentId, [attempt]);
  }
  return byAssessment;
}

function buildCourseOutline(
  course: CourseOutlineRecord,
  userId: string,
  passEvidence: Map<string, PassEvidence[]>,
  options: OutlineOptions,
) {
  const scope = {
    organizationRole: course.organization.members[0]?.role,
    permissionMode: course.organization.permissionMode,
    isCourseOwner: course.owner.userId === userId,
    isCourseEditor: course.collaborators.length > 0,
    isCohortStaff: course.cohorts.length > 0,
  };
  const canManage = canManageContent(scope) || scope.isCohortStaff;
  const managementAccess = canManage && options.managementAccess !== false;
  const hasEnrollment =
    course.enrollments.length > 0 || course._count.cohorts > 0;

  if (!canManage && (course.status !== "PUBLISHED" || !hasEnrollment)) {
    return null;
  }

  const moduleCompletion = course.modules.map((module) => ({
    ...module,
    items: module.items
      .filter((item) => managementAccess || item.isPublished)
      .map((item) => ({
        id: item.id,
        type: item.type,
        position: item.position,
        title:
          item.material?.title ??
          item.vocabularySet?.title ??
          item.assessment?.title ??
          "Untitled",
        attempt: item.assessment?.attempts[0] ?? null,
        isCompleted:
          item.type === "ASSESSMENT"
            ? hasPassedAssessment(
                (item.assessment && passEvidence.get(item.assessment.id)) ?? [],
                item.assessment?.passingScore ?? null,
              )
            : item.progress.length > 0,
      })),
  }));
  const modules =
    course.progressionMode === "SEQUENTIAL"
      ? evaluateSequentialModules(moduleCompletion)
      : evaluateOpenModules(moduleCompletion);

  return {
    id: course.id,
    title: course.title,
    description: course.description,
    thumbnailUrl: course.thumbnailUrl,
    organization: {
      id: course.organization.id,
      name: course.organization.name,
      slug: course.organization.slug,
      logoUrl: course.organization.logoUrl,
      theme: course.organization.theme,
      themeEnabled: course.organization.themeEnabled,
    },
    status: course.status,
    progressionMode: course.progressionMode,
    canManage,
    modules: managementAccess
      ? modules.map((module) => ({ ...module, access: "AVAILABLE" as const }))
      : modules,
  };
}

export type CourseOutline = NonNullable<ReturnType<typeof buildCourseOutline>>;

/**
 * Course outline with per-learner completion and module access. Memoized per request, so the
 * access check in `requireCourseItemAccess` and a page fetching the same outline share one load.
 * Throws NOT_FOUND for a missing course and FORBIDDEN when the user can neither manage nor learn it.
 */
export function getCourseOutlineForUser(
  courseId: string,
  userId: string,
  options: OutlineOptions = {},
): Promise<CourseOutline> {
  const managementAccess = options.managementAccess !== false;
  return memoizeForRequest(
    `courseOutline:${courseId}:${userId}:${managementAccess}`,
    async () => {
      const [course, passEvidence] = await Promise.all([
        db.course.findUnique({
          where: { id: courseId },
          select: courseOutlineSelect(userId, new Date()),
        }),
        loadPassEvidence(userId, { id: courseId }),
      ]);

      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      const outline = buildCourseOutline(course, userId, passEvidence, options);
      if (!outline) throw new TRPCError({ code: "FORBIDDEN" });
      return outline;
    },
  );
}

/**
 * Batched `getCourseOutlineForUser` for every course matching `courseWhere`, in two queries
 * regardless of the course count. Courses the user cannot access are omitted instead of throwing.
 * Results keep `orderBy` order (title ascending by default).
 */
export async function getCourseOutlinesForUser(
  courseWhere: Prisma.CourseWhereInput,
  userId: string,
  options: OutlineOptions & {
    orderBy?: Prisma.CourseOrderByWithRelationInput;
  } = {},
): Promise<CourseOutline[]> {
  const [courses, passEvidence] = await Promise.all([
    db.course.findMany({
      where: courseWhere,
      orderBy: options.orderBy ?? { title: "asc" },
      select: courseOutlineSelect(userId, new Date()),
    }),
    loadPassEvidence(userId, courseWhere),
  ]);

  return courses
    .map((course) => buildCourseOutline(course, userId, passEvidence, options))
    .filter((outline) => outline !== null);
}

/**
 * `getCourseOutlinesForUser` returning both the default view (management access for staff) and
 * the learner view (`managementAccess: false`) of each course from the same two queries. The
 * views only differ for users who can manage the course.
 */
export async function getCourseOutlineViewsForUser(
  courseWhere: Prisma.CourseWhereInput,
  userId: string,
  options: { orderBy?: Prisma.CourseOrderByWithRelationInput } = {},
): Promise<Array<{ outline: CourseOutline; learnerOutline: CourseOutline }>> {
  const [courses, passEvidence] = await Promise.all([
    db.course.findMany({
      where: courseWhere,
      orderBy: options.orderBy ?? { title: "asc" },
      select: courseOutlineSelect(userId, new Date()),
    }),
    loadPassEvidence(userId, courseWhere),
  ]);

  return courses.flatMap((course) => {
    const outline = buildCourseOutline(course, userId, passEvidence, {});
    const learnerOutline = buildCourseOutline(course, userId, passEvidence, {
      managementAccess: false,
    });
    return outline && learnerOutline ? [{ outline, learnerOutline }] : [];
  });
}
