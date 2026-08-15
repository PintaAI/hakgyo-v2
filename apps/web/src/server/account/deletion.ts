import { db } from "~/server/db";

export async function getAccountDeletionBlockers(userId: string) {
  const memberships = await db.organizationMember.findMany({
    where: { userId },
    select: {
      role: true,
      organization: {
        select: {
          name: true,
          members: {
            where: { role: "OWNER" },
            select: { id: true },
            take: 2,
          },
        },
      },
      _count: {
        select: {
          ownedCourses: true,
          createdMaterials: true,
          createdAssessments: true,
          createdVocabularySets: true,
          createdEnrollmentInvites: true,
          reviewedAssessmentAnswers: true,
          connectedZoomAccounts: true,
          createdCohortMeetings: true,
        },
      },
    },
  });

  const blockers = new Set<string>();
  for (const membership of memberships) {
    if (
      membership.role === "OWNER" &&
      membership.organization.members.length === 1
    ) {
      blockers.add(
        `Transfer ownership of ${membership.organization.name} to another member first.`,
      );
    }

    if (Object.values(membership._count).some((count) => count > 0)) {
      blockers.add(
        "Reassign courses, content, invitations, meetings, reviews, and integrations you created first.",
      );
    }
  }

  return [...blockers];
}
