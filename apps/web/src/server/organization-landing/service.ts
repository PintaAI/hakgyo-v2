import { TRPCError } from "@trpc/server";
import { parseOrganizationTheme } from "@hakgyo/shared";
import type {
  Prisma,
  LandingRevisionSource,
} from "../../../generated/prisma/client";
import { env } from "~/env";
import { appHandoffPath, mobileAppStoreLinks } from "~/lib/mobile-app";
import { organizationPublicSlugSchema } from "~/lib/organization-landing";
import { getPublicR2Url } from "~/lib/profile-image";
import type { db } from "~/server/db";
import { organizationBrandSelect } from "~/server/brand/context";
import { createDefaultLandingHtml } from "./default-template";
import { landingEditorBridge } from "./editor-bridge";
import {
  applyLandingCopy,
  extractLandingFields,
  extractLandingMetadata,
  renderLandingDocument,
  validateLandingHtml,
  type LandingCourse,
  type LandingIssue,
  type LandingUrlPolicy,
} from "./html";

type LandingDatabase = typeof db;
type OwnerInput = {
  db: LandingDatabase;
  organizationId: string;
  actorUserId: string;
};

const MAX_REVISIONS = 50;
const DEFAULT_PRIMARY_COLOR = "#27272A";

export async function requireLandingOwner({
  db,
  organizationId,
  actorUserId,
}: Pick<OwnerInput, "organizationId" | "actorUserId"> & {
  db: Pick<LandingDatabase, "organizationMember">;
}) {
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
): Prisma.CourseWhereInput {
  return {
    organizationId,
    status: "PUBLISHED",
    OR: [
      { enrollmentMode: "OPEN" },
      { enrollmentMode: null, organization: { defaultEnrollmentMode: "OPEN" } },
    ],
  };
}

function appUrl(path: string) {
  return new URL(path, env.APP_URL).toString();
}

async function getLandingCourses(
  db: LandingDatabase,
  organizationId: string,
): Promise<LandingCourse[]> {
  const courses = await db.course.findMany({
    where: publicLandingCourseWhere(organizationId),
    select: {
      id: true,
      title: true,
      description: true,
      thumbnailUrl: true,
      price: true,
      currency: true,
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
  });
  return courses.map((course) => ({
    ...course,
    url: appUrl(`/catalog/${encodeURIComponent(course.id)}`),
  }));
}

async function loadOrganization(db: LandingDatabase, organizationId: string) {
  return db.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: {
      ...organizationBrandSelect,
      landingPage: {
        select: {
          draftHtml: true,
          draftRevisionId: true,
          publishedRevisionId: true,
          publishedAt: true,
          imageUrls: true,
          updatedAt: true,
        },
      },
    },
  });
}
type LandingOrganization = Awaited<ReturnType<typeof loadOrganization>>;

function brandColors(organization: LandingOrganization) {
  const theme = organization.themeEnabled
    ? parseOrganizationTheme(organization.theme)
    : null;
  return theme
    ? {
        primary: theme.primary,
        secondary: theme.secondary,
        accent: theme.accent,
      }
    : null;
}

function defaultHtml(organization: LandingOrganization) {
  return createDefaultLandingHtml({
    name: organization.name,
    logoUrl: organization.logoUrl,
    primaryColor: brandColors(organization)?.primary ?? DEFAULT_PRIMARY_COLOR,
  });
}

function httpsOrigin(url: string | null) {
  try {
    const parsed = url ? new URL(url) : null;
    return parsed?.protocol === "https:" ? parsed.origin : null;
  } catch {
    return null;
  }
}

/** The links and asset origins a landing document may use, with labels for the AI. */
function buildLandingPolicy(
  organization: LandingOrganization,
  courses: readonly LandingCourse[],
) {
  const links = [
    { url: appUrl(`/${organization.slug}`), label: "This landing page" },
    { url: appUrl("/catalog"), label: "Hakgyo course catalog" },
    { url: appUrl("/auth"), label: "Sign in or create a Hakgyo account" },
    ...courses.flatMap((course) => [
      { url: course.url, label: `Course page: ${course.title}` },
      {
        url: appUrl(appHandoffPath(course.id)),
        label: `Open in the Hakgyo app: ${course.title}`,
      },
    ]),
    ...(mobileAppStoreLinks.appStore
      ? [{ url: mobileAppStoreLinks.appStore, label: "App Store" }]
      : []),
    ...(mobileAppStoreLinks.playStore
      ? [{ url: mobileAppStoreLinks.playStore, label: "Google Play" }]
      : []),
  ];
  const assetOrigins = [
    ...new Set(
      [
        env.APP_URL,
        getPublicR2Url(""),
        organization.logoUrl,
        ...courses.map((course) => course.thumbnailUrl),
        ...(organization.landingPage?.imageUrls ?? []),
      ].flatMap((url) => httpsOrigin(url) ?? []),
    ),
  ];
  const policy: LandingUrlPolicy = {
    appOrigin: new URL(env.APP_URL).origin,
    links: links.map((link) => link.url),
    assetOrigins,
  };
  return { links, policy };
}

function editorUrl(slug: string) {
  return appUrl(`/workspace/${encodeURIComponent(slug)}/landing-page`);
}

export async function getLandingContext(input: OwnerInput) {
  await requireLandingOwner(input);
  const [organization, courses] = await Promise.all([
    loadOrganization(input.db, input.organizationId),
    getLandingCourses(input.db, input.organizationId),
  ]);
  const { links, policy } = buildLandingPolicy(organization, courses);
  return {
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logoUrl: organization.logoUrl,
      colors: brandColors(organization),
    },
    courses: courses.map((course) => ({
      ...course,
      appHandoffUrl: appUrl(appHandoffPath(course.id)),
    })),
    images: organization.landingPage?.imageUrls ?? [],
    links,
    assetOrigins: policy.assetOrigins,
    publicUrl: appUrl(`/${organization.slug}`),
    editorUrl: editorUrl(organization.slug),
    isPublished: !!organization.landingPage?.publishedAt,
  };
}

function draftOf(organization: LandingOrganization) {
  const landing = organization.landingPage;
  return {
    html: landing?.draftHtml ?? defaultHtml(organization),
    revisionId: landing?.draftRevisionId ?? null,
  };
}

export async function getLandingDraft(input: OwnerInput) {
  await requireLandingOwner(input);
  const organization = await loadOrganization(input.db, input.organizationId);
  const landing = organization.landingPage;
  const draft = draftOf(organization);
  return {
    ...draft,
    fields: extractLandingFields(draft.html),
    isStarterTemplate: !landing?.draftHtml,
    publishedRevisionId: landing?.publishedRevisionId ?? null,
    publishedAt: landing?.publishedAt ?? null,
    updatedAt: landing?.updatedAt ?? null,
    images: landing?.imageUrls ?? [],
    organization: { name: organization.name, slug: organization.slug },
    publicUrl: appUrl(`/${organization.slug}`),
  };
}

/** Cheap change marker the web editor polls to pick up MCP edits. */
export async function getLandingStatus(input: OwnerInput) {
  await requireLandingOwner(input);
  const landing = await input.db.organizationLandingPage.findUnique({
    where: { organizationId: input.organizationId },
    select: {
      draftRevisionId: true,
      publishedRevisionId: true,
      publishedAt: true,
    },
  });
  return {
    revisionId: landing?.draftRevisionId ?? null,
    publishedRevisionId: landing?.publishedRevisionId ?? null,
    publishedAt: landing?.publishedAt ?? null,
  };
}

export type SaveLandingDraftResult =
  | {
      ok: true;
      revisionId: string;
      warnings: LandingIssue[];
      editorUrl: string;
    }
  | { ok: false; errors: LandingIssue[]; warnings: LandingIssue[] };

function conflict() {
  return new TRPCError({
    code: "CONFLICT",
    message:
      "The landing page draft changed since you loaded it. Load the latest draft and try again",
  });
}

/**
 * Validates and stores a new draft revision. `baseRevisionId`, when given,
 * must match the current draft revision (`null` for the starter template).
 */
export async function saveLandingDraft(
  input: OwnerInput & {
    html: string;
    source: LandingRevisionSource;
    summary?: string;
    baseRevisionId?: string | null;
  },
): Promise<SaveLandingDraftResult> {
  await requireLandingOwner(input);
  const [organization, courses] = await Promise.all([
    loadOrganization(input.db, input.organizationId),
    getLandingCourses(input.db, input.organizationId),
  ]);
  const { policy } = buildLandingPolicy(organization, courses);
  const { errors, warnings } = validateLandingHtml(input.html, policy);
  if (errors.length) return { ok: false, errors, warnings };

  const revisionId = await input.db.$transaction(async (tx) => {
    const landing = await tx.organizationLandingPage.upsert({
      where: { organizationId: input.organizationId },
      create: { organizationId: input.organizationId },
      update: {},
      select: { draftRevisionId: true },
    });
    if (
      input.baseRevisionId !== undefined &&
      input.baseRevisionId !== landing.draftRevisionId
    )
      throw conflict();
    const revision = await tx.organizationLandingRevision.create({
      data: {
        organizationId: input.organizationId,
        html: input.html,
        source: input.source,
        summary: input.summary?.trim().slice(0, 500) ?? null,
        createdByUserId: input.actorUserId,
      },
      select: { id: true },
    });
    // Compare-and-swap so two concurrent saves cannot both win.
    const updated = await tx.organizationLandingPage.updateMany({
      where: {
        organizationId: input.organizationId,
        draftRevisionId: landing.draftRevisionId,
      },
      data: { draftHtml: input.html, draftRevisionId: revision.id },
    });
    if (updated.count !== 1) throw conflict();
    const stale = await tx.organizationLandingRevision.findMany({
      where: { organizationId: input.organizationId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: MAX_REVISIONS,
      select: { id: true },
    });
    if (stale.length)
      await tx.organizationLandingRevision.deleteMany({
        where: { id: { in: stale.map(({ id }) => id) } },
      });
    return revision.id;
  });
  return {
    ok: true,
    revisionId,
    warnings,
    editorUrl: editorUrl(organization.slug),
  };
}

function assertLandingSaved(result: SaveLandingDraftResult) {
  if (result.ok) return result;
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: result.errors.map((issue) => issue.message).join("\n"),
  });
}

export async function updateLandingCopy(
  input: OwnerInput & {
    copy: Record<string, string>;
    baseRevisionId: string | null;
  },
) {
  await requireLandingOwner(input);
  const organization = await loadOrganization(input.db, input.organizationId);
  const draft = draftOf(organization);
  if (draft.revisionId !== input.baseRevisionId) throw conflict();
  let html: string;
  try {
    html = applyLandingCopy(draft.html, input.copy);
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error instanceof Error ? error.message : "Invalid copy",
    });
  }
  const keys = Object.keys(input.copy);
  return assertLandingSaved(
    await saveLandingDraft({
      ...input,
      html,
      source: "EDITOR",
      summary: `Edited copy: ${keys.join(", ")}`,
      baseRevisionId: input.baseRevisionId,
    }),
  );
}

export async function listLandingRevisions(
  input: OwnerInput & { limit: number },
) {
  await requireLandingOwner(input);
  return input.db.organizationLandingRevision.findMany({
    where: { organizationId: input.organizationId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: input.limit,
    select: {
      id: true,
      source: true,
      summary: true,
      createdAt: true,
      createdBy: { select: { name: true } },
    },
  });
}

export async function restoreLandingRevision(
  input: OwnerInput & { revisionId: string },
) {
  await requireLandingOwner(input);
  const revision = await input.db.organizationLandingRevision.findFirst({
    where: { id: input.revisionId, organizationId: input.organizationId },
    select: { html: true, createdAt: true },
  });
  if (!revision) throw new TRPCError({ code: "NOT_FOUND" });
  return saveLandingDraft({
    ...input,
    html: revision.html,
    source: "RESTORE",
    summary: `Restored the revision from ${revision.createdAt.toISOString()}`,
  });
}

export async function publishLandingPage(
  input: OwnerInput & { revisionId: string | null },
) {
  await requireLandingOwner(input);
  const organization = await loadOrganization(input.db, input.organizationId);
  if (!organizationPublicSlugSchema.safeParse(organization.slug).success)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Choose an available organization slug in settings before publishing",
    });
  const draft = draftOf(organization);
  if (draft.revisionId !== input.revisionId) throw conflict();

  let revisionId = draft.revisionId;
  if (!revisionId) {
    // Publishing the starter template records it as the first revision.
    revisionId = assertLandingSaved(
      await saveLandingDraft({
        ...input,
        html: draft.html,
        source: "EDITOR",
        summary: "Published the starter template",
        baseRevisionId: null,
      }),
    ).revisionId;
  } else {
    // Course and image changes since the last save can invalidate links.
    const courses = await getLandingCourses(input.db, input.organizationId);
    const { policy } = buildLandingPolicy(organization, courses);
    const { errors } = validateLandingHtml(draft.html, policy);
    if (errors.length)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: errors.map((issue) => issue.message).join("\n"),
      });
  }

  const publishedAt = new Date();
  const result = await input.db.organizationLandingPage.updateMany({
    where: {
      organizationId: input.organizationId,
      draftRevisionId: revisionId,
    },
    data: {
      publishedHtml: draft.html,
      publishedRevisionId: revisionId,
      publishedAt,
    },
  });
  if (result.count !== 1) throw conflict();
  return { publishedAt, publishedRevisionId: revisionId };
}

export async function unpublishLandingPage(input: OwnerInput) {
  await requireLandingOwner(input);
  await input.db.organizationLandingPage.updateMany({
    where: { organizationId: input.organizationId },
    data: { publishedHtml: null, publishedRevisionId: null, publishedAt: null },
  });
  return { publishedAt: null };
}

export async function addLandingImage(
  input: OwnerInput & { imageUrl: string },
) {
  await requireLandingOwner(input);
  const landing = await input.db.organizationLandingPage.upsert({
    where: { organizationId: input.organizationId },
    create: {
      organizationId: input.organizationId,
      imageUrls: [input.imageUrl],
    },
    update: {},
    select: { imageUrls: true },
  });
  if (!landing.imageUrls.includes(input.imageUrl))
    await input.db.organizationLandingPage.update({
      where: { organizationId: input.organizationId },
      data: { imageUrls: { push: input.imageUrl } },
    });
}

/** Removes an image from the library unless the draft or live page still uses it. */
export async function removeLandingImage(
  input: OwnerInput & { imageUrl: string },
) {
  await requireLandingOwner(input);
  const landing = await input.db.organizationLandingPage.findUnique({
    where: { organizationId: input.organizationId },
    select: { draftHtml: true, publishedHtml: true, imageUrls: true },
  });
  if (
    landing?.draftHtml?.includes(input.imageUrl) ||
    landing?.publishedHtml?.includes(input.imageUrl)
  )
    throw new TRPCError({
      code: "CONFLICT",
      message: "The landing image is currently in use",
    });
  if (landing)
    await input.db.organizationLandingPage.update({
      where: { organizationId: input.organizationId },
      data: {
        imageUrls: landing.imageUrls.filter((url) => url !== input.imageUrl),
      },
    });
}

export async function getPublishedLanding({
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
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      landingPage: { select: { publishedHtml: true, publishedAt: true } },
    },
  });
  const html = organization?.landingPage?.publishedHtml;
  if (!organization || !html || !organization.landingPage?.publishedAt)
    return null;
  return {
    organization,
    html,
    publishedAt: organization.landingPage.publishedAt,
    metadata: extractLandingMetadata(html),
  };
}

/** The served public document, with course slots filled from live data. */
export async function renderPublishedLanding(input: {
  db: LandingDatabase;
  slug: string;
}) {
  const landing = await getPublishedLanding(input);
  if (!landing) return null;
  const [organization, courses] = await Promise.all([
    loadOrganization(input.db, landing.organization.id),
    getLandingCourses(input.db, landing.organization.id),
  ]);
  return {
    html: renderLandingDocument(landing.html, { courses }),
    assetOrigins: buildLandingPolicy(organization, courses).policy.assetOrigins,
  };
}

/** Owner preview; `editable` adds the in-place copy editing bridge. */
export async function renderDraftLanding(
  input: OwnerInput & { editable: boolean },
) {
  await requireLandingOwner(input);
  const [organization, courses] = await Promise.all([
    loadOrganization(input.db, input.organizationId),
    getLandingCourses(input.db, input.organizationId),
  ]);
  const html = renderLandingDocument(draftOf(organization).html, { courses });
  // The serializer always emits </body>, after any document content.
  const end = html.lastIndexOf("</body>");
  return {
    html: input.editable
      ? `${html.slice(0, end)}${landingEditorBridge}${html.slice(end)}`
      : html,
    assetOrigins: buildLandingPolicy(organization, courses).policy.assetOrigins,
  };
}
