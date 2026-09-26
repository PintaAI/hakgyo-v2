import { parseOrganizationTheme } from "@hakgyo/shared";

import { activeEnrollmentStatuses } from "~/server/authorization";
import type { db } from "~/server/db";
import { accessGrantingCohortStatuses } from "~/server/enrollment/cohort-access";

export const organizationBrandSelect = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  theme: true,
  themeEnabled: true,
} as const;

export type BrandContextSource =
  "cohort" | "course" | "organization" | "default";

type BrandOrganization = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  theme: unknown;
  themeEnabled: boolean;
};

export type ActiveBrandContext = {
  organizationId: string | null;
  name: string;
  slug: string | null;
  logoUrl: string | null;
  theme: ReturnType<typeof parseOrganizationTheme>;
  themeEnabled: boolean;
  isThemed: boolean;
  source: BrandContextSource;
};

export type AvailableBrandContext = ActiveBrandContext & {
  organizationId: string;
  slug: string;
  source: "organization";
};

const defaultBrandContext: ActiveBrandContext = {
  organizationId: null,
  name: "Hakgyo",
  slug: null,
  logoUrl: null,
  theme: null,
  themeEnabled: false,
  isThemed: false,
  source: "default",
};

/**
 * Converts stored organization branding into the client contract. Invalid,
 * disabled, and missing themes deliberately become null so clients use the
 * Hakgyo theme while retaining the organization's identity and logo.
 */
export function resolveBrandContext({
  organization,
  source,
}: {
  organization: BrandOrganization | null;
  source: BrandContextSource;
}): ActiveBrandContext {
  if (!organization || source === "default") return { ...defaultBrandContext };

  const theme = organization.themeEnabled
    ? parseOrganizationTheme(organization.theme)
    : null;

  return {
    organizationId: organization.id,
    name: organization.name,
    slug: organization.slug,
    logoUrl: organization.logoUrl,
    theme,
    themeEnabled: organization.themeEnabled,
    isThemed: theme !== null,
    source,
  };
}

type BrandDatabase = Pick<typeof db, "cohort" | "course">;
type BrandListDatabase = Pick<
  typeof db,
  | "organization"
  | "organizationMember"
  | "courseEnrollment"
  | "cohortEnrollment"
>;

type GetActiveBrandContextInput = {
  db: BrandDatabase;
  actorUserId: string | null;
  cohortId?: string;
  courseId?: string;
  now?: Date;
};

const anonymousUserId = "";

/**
 * Resolves branding from the route resource rather than from a user's global
 * memberships. At most one Prisma query is issued, and inaccessible resources
 * collapse to the default context to avoid disclosing unpublished records.
 */
export async function getActiveBrandContext({
  db: database,
  actorUserId,
  cohortId,
  courseId,
  now = new Date(),
}: GetActiveBrandContextInput): Promise<ActiveBrandContext> {
  const userId = actorUserId ?? anonymousUserId;

  if (cohortId) {
    const cohort = await database.cohort.findUnique({
      where: { id: cohortId },
      select: {
        status: true,
        endsAt: true,
        enrollments: {
          where: {
            userId,
            status: { in: [...activeEnrollmentStatuses] },
          },
          select: { id: true },
          take: 1,
        },
        course: {
          select: {
            status: true,
            organization: {
              select: {
                ...organizationBrandSelect,
                members: {
                  where: { userId },
                  select: { id: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!cohort || cohort.course.status === "ARCHIVED") {
      return resolveBrandContext({ organization: null, source: "default" });
    }

    const isOrganizationMember =
      actorUserId !== null && cohort.course.organization.members.length > 0;
    const isLive =
      (cohort.status === "OPEN" || cohort.status === "IN_PROGRESS") &&
      (cohort.endsAt === null || cohort.endsAt > now);
    const hasEnrollment =
      actorUserId !== null && isLive && cohort.enrollments.length > 0;
    const isPublic =
      cohort.course.status === "PUBLISHED" &&
      cohort.status === "OPEN" &&
      (cohort.endsAt === null || cohort.endsAt > now);

    if (
      !isOrganizationMember &&
      !(cohort.course.status === "PUBLISHED" && hasEnrollment) &&
      !isPublic
    ) {
      return resolveBrandContext({ organization: null, source: "default" });
    }

    return resolveBrandContext({
      organization: cohort.course.organization,
      source: "cohort",
    });
  }

  if (courseId) {
    const course = await database.course.findUnique({
      where: { id: courseId },
      select: {
        status: true,
        organization: {
          select: {
            ...organizationBrandSelect,
            members: {
              where: { userId },
              select: { id: true },
              take: 1,
            },
          },
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
        cohorts: {
          where: {
            status: { in: [...accessGrantingCohortStatuses] },
            OR: [{ endsAt: null }, { endsAt: { gt: now } }],
            enrollments: {
              some: {
                userId,
                status: { in: [...activeEnrollmentStatuses] },
              },
            },
          },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!course || course.status === "ARCHIVED") {
      return resolveBrandContext({ organization: null, source: "default" });
    }

    const isOrganizationMember =
      actorUserId !== null && course.organization.members.length > 0;
    const hasEnrollment =
      actorUserId !== null &&
      (course.enrollments.length > 0 || course.cohorts.length > 0);
    const isPublished = course.status === "PUBLISHED";

    if (
      !isOrganizationMember &&
      !(isPublished && hasEnrollment) &&
      !isPublished
    ) {
      return resolveBrandContext({ organization: null, source: "default" });
    }

    return resolveBrandContext({
      organization: course.organization,
      source: "course",
    });
  }

  return resolveBrandContext({ organization: null, source: "default" });
}

export async function listAvailableBrandContexts({
  db: database,
  actorUserId,
  now = new Date(),
}: {
  db: BrandListDatabase;
  actorUserId: string;
  now?: Date;
}) {
  // Driven from the user's own memberships and enrollments (userId-indexed)
  // instead of evaluating membership/enrollment subqueries for every
  // organization.
  const [memberships, courseEnrollments, cohortEnrollments] = await Promise.all(
    [
      database.organizationMember.findMany({
        where: { userId: actorUserId },
        select: { organizationId: true },
      }),
      database.courseEnrollment.findMany({
        where: {
          userId: actorUserId,
          status: { in: [...activeEnrollmentStatuses] },
          source: { not: "COHORT" },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          course: { status: "PUBLISHED" },
        },
        select: { course: { select: { organizationId: true } } },
      }),
      database.cohortEnrollment.findMany({
        where: {
          userId: actorUserId,
          status: { in: [...activeEnrollmentStatuses] },
          cohort: {
            status: { in: [...accessGrantingCohortStatuses] },
            OR: [{ endsAt: null }, { endsAt: { gt: now } }],
            course: { status: "PUBLISHED" },
          },
        },
        select: { cohort: { select: { organizationId: true } } },
      }),
    ],
  );
  const organizationIds = [
    ...new Set([
      ...memberships.map(({ organizationId }) => organizationId),
      ...courseEnrollments.map(({ course }) => course.organizationId),
      ...cohortEnrollments.map(({ cohort }) => cohort.organizationId),
    ]),
  ];
  if (organizationIds.length === 0) return [];
  const organizations = await database.organization.findMany({
    where: { id: { in: organizationIds } },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: organizationBrandSelect,
  });

  return organizations.map((organization): AvailableBrandContext => ({
    ...resolveBrandContext({ organization, source: "organization" }),
    organizationId: organization.id,
    slug: organization.slug,
    source: "organization",
  }));
}
