import { Prisma } from "../../../generated/prisma/client";
import { db } from "~/server/db";

/**
 * Memberships that still own or created records which block deletion.
 * Existence checks per membership (each backed by the foreign-key index)
 * instead of relation counts, which Prisma compiles into aggregates over
 * the whole child tables.
 */
async function getMembershipsWithCreatedContent(userId: string) {
  const rows = await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT m."id"
    FROM "OrganizationMember" m
    WHERE m."userId" = ${userId}
      AND (EXISTS (SELECT 1 FROM "Course" WHERE "ownerMembershipId" = m."id")
      OR EXISTS (SELECT 1 FROM "Material" WHERE "createdByMembershipId" = m."id")
      OR EXISTS (SELECT 1 FROM "Assessment" WHERE "createdByMembershipId" = m."id")
      OR EXISTS (SELECT 1 FROM "VocabularySet" WHERE "createdByMembershipId" = m."id")
      OR EXISTS (SELECT 1 FROM "EnrollmentInvite" WHERE "createdByMembershipId" = m."id")
      OR EXISTS (SELECT 1 FROM "AssessmentAnswer" WHERE "reviewedByMembershipId" = m."id")
      OR EXISTS (SELECT 1 FROM "ZoomConnection" WHERE "connectedByMembershipId" = m."id")
      OR EXISTS (SELECT 1 FROM "CohortMeeting" WHERE "createdByMembershipId" = m."id"))
  `);
  return new Set(rows.map((row) => row.id));
}

export async function getAccountDeletionBlockers(userId: string) {
  const [memberships, membershipsWithContent] = await Promise.all([
    db.organizationMember.findMany({
      where: { userId },
      select: {
        id: true,
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
      },
    }),
    getMembershipsWithCreatedContent(userId),
  ]);

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

    if (membershipsWithContent.has(membership.id)) {
      blockers.add(
        "Reassign courses, content, invitations, meetings, reviews, and integrations you created first.",
      );
    }
  }

  return [...blockers];
}
