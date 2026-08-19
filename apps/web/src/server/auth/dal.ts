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

export const requireSession = cache(async () => {
  const session = await getSession();
  if (!session?.user) redirect(routeAccess.signInPath);
  return session;
});

export const getSignedInDestination = cache(async (userId: string) => {
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

  const enrollment = await db.course.findFirst({
    where: {
      status: "PUBLISHED",
      OR: [
        {
          enrollments: {
            some: { userId, status: { in: ["ACTIVE", "COMPLETED"] } },
          },
        },
        {
          cohorts: {
            some: {
              enrollments: {
                some: { userId, status: { in: ["ACTIVE", "COMPLETED"] } },
              },
            },
          },
        },
      ],
    },
    select: { id: true },
  });

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
