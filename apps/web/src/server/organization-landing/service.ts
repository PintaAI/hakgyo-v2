import { TRPCError } from "@trpc/server";
import { parseOrganizationTheme } from "@hakgyo/shared";
import { Prisma } from "../../../generated/prisma/client";
import type { db } from "~/server/db";
import { organizationBrandSelect } from "~/server/brand/context";
import {
  createDefaultOrganizationLandingConfig,
  organizationLandingConfigSchema,
  organizationPublicSlugSchema,
  type OrganizationLandingConfig,
} from "~/lib/organization-landing";

type LandingDatabase = Pick<
  typeof db,
  "organization" | "organizationMember" | "organizationLandingPage" | "course"
>;
type OwnerInput = {
  db: LandingDatabase;
  organizationId: string;
  actorUserId: string;
};
const courseSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  thumbnailUrl: true,
  price: true,
  currency: true,
} as const;

export async function requireLandingOwner({
  db,
  organizationId,
  actorUserId,
}: OwnerInput) {
  const member = await db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId: actorUserId } },
    select: { role: true },
  });
  if (member?.role !== "OWNER")
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only organization owners can manage the landing page",
    });
}

export function publicLandingCourseWhere(
  organizationId: string,
  selectedCourseIds: string[] = [],
): Prisma.CourseWhereInput {
  return {
    organizationId,
    status: "PUBLISHED",
    ...(selectedCourseIds.length ? { id: { in: selectedCourseIds } } : {}),
    OR: [
      { enrollmentMode: "OPEN" },
      { enrollmentMode: null, organization: { defaultEnrollmentMode: "OPEN" } },
    ],
  };
}

async function getLandingCourses(
  db: LandingDatabase,
  organizationId: string,
  selectedCourseIds: string[] = [],
) {
  const courses = await db.course.findMany({
    where: publicLandingCourseWhere(organizationId, selectedCourseIds),
    select: courseSelect,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
  });
  if (selectedCourseIds.length)
    courses.sort(
      (a, b) =>
        selectedCourseIds.indexOf(a.id) - selectedCourseIds.indexOf(b.id),
    );
  return courses;
}

function publicBrand(organization: {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  theme: unknown;
  themeEnabled: boolean;
}) {
  return {
    ...organization,
    theme: organization.themeEnabled
      ? parseOrganizationTheme(organization.theme)
      : null,
  };
}

export async function getOrganizationLanding(input: OwnerInput) {
  await requireLandingOwner(input);
  const [organization, landing, courses] = await Promise.all([
    input.db.organization.findUniqueOrThrow({
      where: { id: input.organizationId },
      select: organizationBrandSelect,
    }),
    input.db.organizationLandingPage.findUnique({
      where: { organizationId: input.organizationId },
    }),
    getLandingCourses(input.db, input.organizationId),
  ]);
  return {
    organization: publicBrand(organization),
    config: landing
      ? organizationLandingConfigSchema.parse(landing.draft)
      : createDefaultOrganizationLandingConfig(organization.name),
    publishedAt: landing?.publishedAt ?? null,
    updatedAt: landing?.updatedAt ?? null,
    courses,
  };
}

export async function saveOrganizationLandingDraft(
  input: OwnerInput & { config: OrganizationLandingConfig },
) {
  await requireLandingOwner(input);
  const config = organizationLandingConfigSchema.parse(input.config);
  // Validate selection against this tenant's publicly promotable courses, even for drafts.
  if (config.selectedCourseIds.length) {
    const courses = await getLandingCourses(
      input.db,
      input.organizationId,
      config.selectedCourseIds,
    );
    if (courses.length !== config.selectedCourseIds.length)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Select only this organization's published, open-enrollment courses",
      });
  }
  return input.db.organizationLandingPage.upsert({
    where: { organizationId: input.organizationId },
    create: { organizationId: input.organizationId, draft: config },
    update: { draft: config },
    select: { updatedAt: true, publishedAt: true },
  });
}

export async function publishOrganizationLanding(input: OwnerInput) {
  await requireLandingOwner(input);
  const organization = await input.db.organization.findUniqueOrThrow({
    where: { id: input.organizationId },
    select: { slug: true },
  });
  if (!organizationPublicSlugSchema.safeParse(organization.slug).success)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Choose an available organization slug in settings before publishing",
    });
  const landing = await input.db.organizationLandingPage.findUnique({
    where: { organizationId: input.organizationId },
  });
  if (!landing)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Save your landing page before publishing",
    });
  const config = organizationLandingConfigSchema.parse(landing.draft);
  if (
    ((!config.ctaUrl || config.ctaUrl === "#courses") &&
      config.hiddenSections.includes("courses")) ||
    (config.ctaUrl === "#contact" && config.hiddenSections.includes("contact"))
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Your main button links to a hidden section. Show that section or change the button destination before publishing",
    });
  }
  // Optimistic update prevents publishing a stale draft over a concurrent save.
  const publishedAt = new Date();
  const result = await input.db.organizationLandingPage.updateMany({
    where: {
      organizationId: input.organizationId,
      updatedAt: landing.updatedAt,
    },
    data: { published: config, publishedAt },
  });
  if (result.count !== 1)
    throw new TRPCError({
      code: "CONFLICT",
      message: "Your draft changed. Refresh and publish again",
    });
  return { publishedAt };
}

export async function unpublishOrganizationLanding(input: OwnerInput) {
  await requireLandingOwner(input);
  await input.db.organizationLandingPage.updateMany({
    where: { organizationId: input.organizationId },
    data: { published: Prisma.DbNull, publishedAt: null },
  });
  return { publishedAt: null };
}

export async function getPublicOrganizationLanding({
  db,
  slug,
}: {
  db: LandingDatabase;
  slug: string;
}) {
  if (!organizationPublicSlugSchema.safeParse(slug).success) return null;
  const organization = await db.organization.findUnique({
    where: { slug },
    select: {
      ...organizationBrandSelect,
      landingPage: {
        select: { published: true, publishedAt: true, updatedAt: true },
      },
    },
  });
  if (!organization?.landingPage?.publishedAt) return null;
  const parsed = organizationLandingConfigSchema.safeParse(
    organization.landingPage.published,
  );
  if (!parsed.success) return null;
  const { landingPage, ...brand } = organization;
  const courses = parsed.data.hiddenSections.includes("courses")
    ? []
    : await getLandingCourses(
        db,
        organization.id,
        parsed.data.selectedCourseIds,
      );
  const config = {
    ...parsed.data,
    selectedCourseIds: parsed.data.selectedCourseIds.length
      ? courses.map((course) => course.id)
      : [],
  };
  return {
    organization: publicBrand(brand),
    config,
    courses,
    publishedAt: landingPage.publishedAt,
    updatedAt: landingPage.publishedAt,
  };
}

export type PublicOrganizationLanding = NonNullable<
  Awaited<ReturnType<typeof getPublicOrganizationLanding>>
>;
