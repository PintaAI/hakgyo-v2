import { TRPCError } from "@trpc/server";

import { EnrollmentStatus } from "../../../generated/prisma/enums";
import { canManageContent } from "~/server/authorization/permissions";
import { db } from "~/server/db";
import {
  evaluateOpenModules,
  evaluateSequentialModules,
  hasPassedAssessment,
} from "./sequential-access";

const activeEnrollmentStatuses = [
  EnrollmentStatus.ACTIVE,
  EnrollmentStatus.COMPLETED,
] as const;

export async function getCourseOutlineForUser(
  courseId: string,
  userId: string,
) {
  const now = new Date();
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      status: true,
      progressionMode: true,
      owner: { select: { userId: true } },
      organization: {
        select: {
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
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        select: { id: true },
        take: 1,
      },
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
              type: true,
              position: true,
              material: { select: { title: true } },
              vocabularySet: { select: { title: true } },
              assessment: {
                select: {
                  title: true,
                  passingScore: true,
                  attempts: {
                    where: { userId },
                    select: { status: true, score: true, maxScore: true },
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
    },
  });

  if (!course) throw new TRPCError({ code: "NOT_FOUND" });

  const scope = {
    organizationRole: course.organization.members[0]?.role,
    isCourseOwner: course.owner.userId === userId,
    isCohortStaff: course.cohorts.length > 0,
  };
  const canManage = canManageContent(scope) || scope.isCohortStaff;
  const cohortEnrollment = await db.cohortEnrollment.findFirst({
    where: {
      userId,
      status: { in: [...activeEnrollmentStatuses] },
      cohort: { courseId },
    },
    select: { id: true },
  });
  const hasEnrollment =
    course.enrollments.length > 0 || Boolean(cohortEnrollment);

  if (!canManage && (course.status !== "PUBLISHED" || !hasEnrollment)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  const moduleCompletion = course.modules.map((module) => ({
    ...module,
    items: module.items.map((item) => ({
      id: item.id,
      type: item.type,
      position: item.position,
      title:
        item.material?.title ??
        item.vocabularySet?.title ??
        item.assessment?.title ??
        "Untitled",
      isCompleted:
        item.type === "ASSESSMENT"
          ? hasPassedAssessment(
              item.assessment?.attempts ?? [],
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
    status: course.status,
    progressionMode: course.progressionMode,
    canManage,
    modules: canManage
      ? modules.map((module) => ({ ...module, access: "AVAILABLE" as const }))
      : modules,
  };
}
