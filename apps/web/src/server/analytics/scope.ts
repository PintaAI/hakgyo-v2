import { Prisma } from "../../../generated/prisma/client";
import type { OrganizationRole } from "../../../generated/prisma/enums";
import {
  hasPermission,
  requireOrganizationMembership,
  requireOrganizationPermission,
} from "~/server/authorization";
import { getOrganizationCohortScope } from "~/server/authorization/cohort-scope";

export type AnalyticsDb = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

/**
 * Which classes an analytics viewer sees. Owners and admins see the whole
 * organization, including the self-paced "Belajar mandiri" cohorts.
 * Teachers see the class cohorts they are staff on (and, in ADVANCED mode,
 * the classes of courses they own), never self-paced learners.
 */
export type AnalyticsScope = {
  organizationId: string;
  role: OrganizationRole;
  /** Null means every cohort of the organization. */
  cohortIds: string[] | null;
  canViewRevenue: boolean;
};

export async function resolveAnalyticsScope(
  db: AnalyticsDb,
  input: { organizationId: string; userId: string },
): Promise<AnalyticsScope> {
  const membership = await requireOrganizationMembership(input);
  const canViewRevenue = hasPermission(membership.role, "organization.manage");
  if (membership.role !== "TEACHER") {
    return {
      organizationId: input.organizationId,
      role: membership.role,
      cohortIds: null,
      canViewRevenue,
    };
  }

  const cohorts = await db.cohort.findMany({
    where: {
      organizationId: input.organizationId,
      defaultForCourseId: null,
      ...getOrganizationCohortScope({
        membershipId: membership.id,
        permissionMode: membership.organization.permissionMode,
        role: membership.role,
      }),
    },
    select: { id: true },
  });

  return {
    organizationId: input.organizationId,
    role: membership.role,
    cohortIds: cohorts.map((cohort) => cohort.id),
    canViewRevenue,
  };
}

/** Revenue is limited to members who manage the organization's payments. */
export async function requireRevenueViewer(input: {
  organizationId: string;
  userId: string;
}) {
  await requireOrganizationPermission({
    ...input,
    permission: "organization.manage",
  });
}

/**
 * `AND <column> = ANY(<cohorts>)` for a scoped viewer, nothing otherwise.
 * Rows without a cohort (self-paced attempts) drop out of a scoped view.
 */
export function cohortFilter(scope: AnalyticsScope, column: Prisma.Sql) {
  if (scope.cohortIds === null) return Prisma.empty;
  return Prisma.sql`AND ${column} = ANY(${scope.cohortIds}::text[])`;
}
