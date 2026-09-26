import type { Prisma } from "../../../generated/prisma/client";

import { getManagedCourseThumbnailKey } from "~/lib/course-thumbnail";
import { getManagedOrganizationLogoKey } from "~/lib/organization-logo";
import { db } from "~/server/db";
import { deleteR2Objects } from "~/server/r2";

type Transaction = Prisma.TransactionClient;

// Deleting a large organization touches every learner row it owns.
const ORGANIZATION_DELETE_TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 120_000,
};

export async function deleteCourseTree(courseId: string, actorUserId: string) {
  const r2Keys = await collectCourseR2Keys(courseId);

  const deleted = await db.$transaction(async (tx) => {
    const course = await tx.course.findUnique({
      where: { id: courseId },
      select: { id: true, organizationId: true },
    });
    if (!course) return false;

    const modules = await tx.courseModule.findMany({
      where: { courseId },
      select: { id: true },
    });
    const items = await tx.courseItem.findMany({
      where: { moduleId: { in: modules.map(({ id }) => id) } },
      select: { id: true },
    });
    const itemIds = items.map(({ id }) => id);
    const cohorts = await tx.cohort.findMany({
      where: { courseId },
      select: { id: true },
    });
    const cohortIds = cohorts.map(({ id }) => id);

    await deleteCourseChildren(tx, { courseId, itemIds, cohortIds });
    await tx.course.delete({ where: { id: courseId } });
    await tx.adminAuditLog.create({
      data: {
        actorUserId,
        targetId: courseId,
        targetType: "course",
        action: "delete_course_tree",
        outcome: "success",
      },
    });
    return true;
  });

  if (deleted) await deleteR2Objects(r2Keys);
  return deleted;
}

export async function deleteOrganizationTree(
  organizationId: string,
  actorUserId: string,
) {
  const r2Keys = await collectOrganizationR2Keys(organizationId);

  const deleted = await db.$transaction(async (tx) => {
    const organization = await tx.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });
    if (!organization) return false;

    await deleteOrganizationCourses(tx, organizationId);

    await tx.materialAsset.deleteMany({ where: { organizationId } });
    await tx.pdfBook.deleteMany({ where: { organizationId } });
    await tx.assessmentAsset.deleteMany({ where: { organizationId } });
    await tx.materialRequirement.deleteMany({ where: { organizationId } });
    await tx.vocabularyEntry.deleteMany({ where: { organizationId } });
    await tx.material.deleteMany({ where: { organizationId } });
    await tx.assessment.deleteMany({ where: { organizationId } });
    await tx.vocabularySet.deleteMany({ where: { organizationId } });
    await tx.zoomConnection.deleteMany({ where: { organizationId } });
    await tx.asset.deleteMany({ where: { organizationId } });
    await tx.organizationInvite.deleteMany({ where: { organizationId } });
    await tx.organizationMember.deleteMany({ where: { organizationId } });
    await tx.organization.delete({ where: { id: organizationId } });
    await tx.adminAuditLog.create({
      data: {
        actorUserId,
        targetId: organizationId,
        targetType: "organization",
        action: "delete_organization_tree",
        outcome: "success",
      },
    });
    return true;
  }, ORGANIZATION_DELETE_TRANSACTION_OPTIONS);

  if (deleted) await deleteR2Objects(r2Keys);
  return deleted;
}

/**
 * Organization-wide equivalent of running `deleteCourseChildren` and then
 * deleting the course for every course in the organization, as set-based
 * statements in the same dependency order. Rows are matched through their
 * organization (composite foreign keys keep `organizationId` in line with the
 * parent course, module, item, cohort, or attempt) instead of id lists.
 */
async function deleteOrganizationCourses(
  tx: Transaction,
  organizationId: string,
) {
  await tx.assessmentAnswerSelection.deleteMany({
    where: { answer: { organizationId } },
  });
  await tx.assessmentAnswer.deleteMany({ where: { organizationId } });
  await tx.assessmentAttempt.deleteMany({ where: { organizationId } });
  await tx.contentProgress.deleteMany({
    where: { courseItem: { organizationId } },
  });
  await tx.courseItem.deleteMany({ where: { organizationId } });
  await tx.courseModule.deleteMany({ where: { organizationId } });
  await tx.cohortMeeting.deleteMany({ where: { organizationId } });
  await tx.cohortStaff.deleteMany({ where: { organizationId } });
  await tx.cohortEnrollment.deleteMany({
    where: { cohort: { organizationId } },
  });
  await tx.cohort.deleteMany({ where: { organizationId } });
  await tx.courseCollaborator.deleteMany({ where: { organizationId } });
  await tx.enrollmentInvite.deleteMany({ where: { organizationId } });
  await tx.courseEnrollment.deleteMany({
    where: { course: { organizationId } },
  });
  await tx.course.deleteMany({ where: { organizationId } });
}

async function deleteCourseChildren(
  tx: Transaction,
  input: { courseId: string; itemIds: string[]; cohortIds: string[] },
) {
  const attempts = await tx.assessmentAttempt.findMany({
    where: { courseItemId: { in: input.itemIds } },
    select: { id: true },
  });
  const attemptIds = attempts.map(({ id }) => id);
  const answers = await tx.assessmentAnswer.findMany({
    where: { attemptId: { in: attemptIds } },
    select: { id: true },
  });
  await tx.assessmentAnswerSelection.deleteMany({
    where: { answerId: { in: answers.map(({ id }) => id) } },
  });
  await tx.assessmentAnswer.deleteMany({
    where: { attemptId: { in: attemptIds } },
  });
  await tx.assessmentAttempt.deleteMany({ where: { id: { in: attemptIds } } });
  await tx.contentProgress.deleteMany({
    where: { courseItemId: { in: input.itemIds } },
  });
  await tx.courseItem.deleteMany({ where: { id: { in: input.itemIds } } });
  await tx.courseModule.deleteMany({ where: { courseId: input.courseId } });
  await tx.cohortMeeting.deleteMany({
    where: { cohortId: { in: input.cohortIds } },
  });
  await tx.cohortStaff.deleteMany({
    where: { cohortId: { in: input.cohortIds } },
  });
  await tx.cohortEnrollment.deleteMany({
    where: { cohortId: { in: input.cohortIds } },
  });
  await tx.cohort.deleteMany({ where: { id: { in: input.cohortIds } } });
  await tx.courseCollaborator.deleteMany({
    where: { courseId: input.courseId },
  });
  await tx.enrollmentInvite.deleteMany({ where: { courseId: input.courseId } });
  await tx.courseEnrollment.deleteMany({ where: { courseId: input.courseId } });
}

async function collectCourseR2Keys(courseId: string): Promise<string[]> {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { thumbnailUrl: true },
  });
  const key = course?.thumbnailUrl
    ? getManagedCourseThumbnailKey(course.thumbnailUrl, courseId)
    : null;
  return key ? [key] : [];
}

async function collectOrganizationR2Keys(
  organizationId: string,
): Promise<string[]> {
  const [organization, assets, courses] = await Promise.all([
    db.organization.findUnique({
      where: { id: organizationId },
      select: { logoUrl: true },
    }),
    db.asset.findMany({
      where: { organizationId },
      select: { objectKey: true },
    }),
    db.course.findMany({
      where: { organizationId },
      select: { id: true, thumbnailUrl: true },
    }),
  ]);

  const keys: string[] = assets.map((asset) => asset.objectKey);

  const logoKey = organization?.logoUrl
    ? getManagedOrganizationLogoKey(organization.logoUrl, organizationId)
    : null;
  if (logoKey) keys.push(logoKey);

  for (const course of courses) {
    const thumbKey = course.thumbnailUrl
      ? getManagedCourseThumbnailKey(course.thumbnailUrl, course.id)
      : null;
    if (thumbKey) keys.push(thumbKey);
  }

  return keys;
}
