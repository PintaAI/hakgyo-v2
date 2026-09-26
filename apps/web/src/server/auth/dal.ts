import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import {
  getWorkspaceFallback,
  routeAccess,
  type OrganizationRole,
} from "~/lib/access";
import { getSession } from "~/server/better-auth/server";
import { db } from "~/server/db";
import { accessGrantingCohortStatuses } from "~/server/enrollment/cohort-access";
import { getSuperadminUser } from "~/server/authorization/superadmin";

export const requireSession = cache(async () => {
  const session = await getSession();
  if (!session?.user) redirect(routeAccess.signInPath);
  if (session.user.suspendedAt || session.user.deletedAt) {
    redirect(routeAccess.signInPath);
  }
  return session;
});

export const requireSuperadminSession = cache(async () => {
  const session = await requireSession();
  return getSuperadminUser(session.user.id, session.user);
});

export const getSignedInDestination = cache(async (userId: string) => {
  const now = new Date();
  const memberships = await db.organizationMember.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      organization: { select: { slug: true } },
    },
  });
  const membership =
    memberships.find(({ role }) => role === "OWNER" || role === "ADMIN") ??
    memberships[0];
  if (membership) {
    return getWorkspaceFallback(membership.organization.slug, membership.role);
  }

  // Driven from the user's own enrollments (userId-indexed) rather than
  // evaluating enrollment subqueries against every published course.
  const [directEnrollment, cohortEnrollment] = await Promise.all([
    db.courseEnrollment.findFirst({
      where: {
        userId,
        status: { in: ["ACTIVE", "COMPLETED"] },
        source: { not: "COHORT" },
        course: { status: "PUBLISHED" },
      },
      select: { id: true },
    }),
    db.cohortEnrollment.findFirst({
      where: {
        userId,
        status: { in: ["ACTIVE", "COMPLETED"] },
        cohort: {
          status: { in: [...accessGrantingCohortStatuses] },
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
          course: { status: "PUBLISHED" },
        },
      },
      select: { id: true },
    }),
  ]);
  const enrollment = directEnrollment ?? cohortEnrollment;

  return enrollment ? "/learn/courses" : routeAccess.signedInFallbackPath;
});

export const requireOrganizationMembershipBySlug = cache(
  async (organizationSlug: string) => {
    const session = await requireSession();
    const membership = await db.organizationMember.findFirst({
      where: {
        userId: session.user.id,
        organization: { slug: organizationSlug },
      },
      select: {
        id: true,
        organizationId: true,
        role: true,
        userId: true,
        organization: {
          select: {
            name: true,
            slug: true,
            logoUrl: true,
            theme: true,
            themeEnabled: true,
            permissionMode: true,
            teacherCanCreateCourse: true,
          },
        },
      },
    });
    if (!membership) redirect(await getSignedInDestination(session.user.id));
    return membership;
  },
);

export async function requireOrganizationRole(
  organizationSlug: string,
  allowedRoles: readonly OrganizationRole[],
) {
  const membership =
    await requireOrganizationMembershipBySlug(organizationSlug);
  if (!allowedRoles.includes(membership.role)) {
    redirect(getWorkspaceFallback(organizationSlug, membership.role));
  }
  return membership;
}
