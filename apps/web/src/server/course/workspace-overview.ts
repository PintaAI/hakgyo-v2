import { TRPCError } from "@trpc/server";

import { evaluateCourseAccess } from "~/server/authorization/permissions";
import { db } from "~/server/db";
import { fetchStats } from "~/server/foundation/fetch-stats";

export async function getCourseWorkspaceOverview(input: {
  courseId: string;
  organizationSlug: string;
  userId: string;
}) {
  const courseRecord = await db.course.findFirst({
    where: {
      id: input.courseId,
      organization: { slug: input.organizationSlug },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      thumbnailUrl: true,
      price: true,
      currency: true,
      enrollmentMode: true,
      status: true,
      progressionMode: true,
      owner: {
        select: {
          userId: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      collaborators: {
        where: {
          role: "EDITOR",
          organizationMember: { userId: input.userId },
        },
        select: { id: true },
        take: 1,
      },
      cohorts: {
        where: {
          staff: { some: { organizationMember: { userId: input.userId } } },
        },
        select: { id: true },
        take: 1,
      },
      organization: {
        select: {
          id: true,
          slug: true,
          permissionMode: true,
          members: {
            where: { userId: input.userId },
            select: { role: true },
            take: 1,
          },
        },
      },
      modules: {
        orderBy: { position: "asc" },
        take: 5,
        select: {
          id: true,
          title: true,
          _count: { select: { items: true } },
        },
      },
      _count: { select: { modules: true } },
    },
  });

  if (!courseRecord) throw new TRPCError({ code: "NOT_FOUND" });

  const evaluation = evaluateCourseAccess({
    organizationRole: courseRecord.organization.members[0]?.role,
    permissionMode: courseRecord.organization.permissionMode,
    isCourseOwner: courseRecord.owner.userId === input.userId,
    isCourseEditor: courseRecord.collaborators.length > 0,
    isCohortStaff: courseRecord.cohorts.length > 0,
  });
  if (!evaluation.allowed.view) throw new TRPCError({ code: "FORBIDDEN" });

  const overview = evaluation.allowed.manage
    ? await getManagerOverview({
        courseId: courseRecord.id,
        userId: input.userId,
        canViewCohorts: evaluation.access.canViewCohorts,
        canViewAllCohorts: evaluation.access.canViewAllCohorts,
        moduleCount: courseRecord._count.modules,
        modules: courseRecord.modules,
      })
    : null;

  return {
    organization: {
      id: courseRecord.organization.id,
      slug: courseRecord.organization.slug,
    },
    course: {
      id: courseRecord.id,
      title: courseRecord.title,
      slug: courseRecord.slug,
      description: courseRecord.description,
      thumbnailUrl: courseRecord.thumbnailUrl,
      price: courseRecord.price,
      currency: courseRecord.currency,
      enrollmentMode: courseRecord.enrollmentMode,
      status: courseRecord.status,
      progressionMode: courseRecord.progressionMode,
      owner: { user: courseRecord.owner.user },
    },
    access: evaluation.access,
    overview,
  };
}

async function getManagerOverview(input: {
  courseId: string;
  userId: string;
  canViewCohorts: boolean;
  canViewAllCohorts: boolean;
  moduleCount: number;
  modules: Array<{
    id: string;
    title: string;
    _count: { items: number };
  }>;
}) {
  const now = new Date();
  const stats = await fetchStats({
    itemCount: () =>
      db.courseItem.count({ where: { module: { courseId: input.courseId } } }),
    cohortCount: () =>
      input.canViewCohorts
        ? db.cohort.count({
            where: {
              courseId: input.courseId,
              ...(input.canViewAllCohorts
                ? {}
                : {
                    staff: {
                      some: {
                        organizationMember: { userId: input.userId },
                      },
                    },
                  }),
            },
          })
        : Promise.resolve(0),
    activeLearnerCount: () =>
      db.courseEnrollment.count({
        where: { courseId: input.courseId, status: "ACTIVE" },
      }),
    activeInviteCount: () =>
      db.enrollmentInvite.count({
        where: {
          courseId: input.courseId,
          revokedAt: null,
          AND: [
            { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
            {
              OR: [
                { maxUses: null },
                { useCount: { lt: db.enrollmentInvite.fields.maxUses } },
              ],
            },
          ],
        },
      }),
  });

  return {
    stats: { moduleCount: input.moduleCount, ...stats },
    modules: input.modules.map((module) => ({
      id: module.id,
      title: module.title,
      itemCount: module._count.items,
    })),
  };
}
