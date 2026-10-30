import { TRPCError } from "@trpc/server";

import type { Prisma } from "../../../generated/prisma/client";
import { effectiveCohortPrice } from "~/server/payment/cohort-offer";
import {
  hashOrganizationInviteToken,
  organizationInviteStatus,
} from "~/server/organization/invites";
import { normalizeInviteEmail } from "~/server/organization/invites";

type InviteDatabase = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

/** Curriculum items shown in the invite preview. */
const previewItemCount = 6;

function maskEmail(email: string) {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 1)}***@${domain}`;
}

export async function resolveUnifiedInvite(
  db: InviteDatabase,
  token: string,
  now = new Date(),
  userEmail?: string,
) {
  const [organizationInvite, enrollmentInvite] = await Promise.all([
    db.organizationInvite.findUnique({
      where: { tokenHash: hashOrganizationInviteToken(token) },
      select: {
        email: true,
        role: true,
        expiresAt: true,
        acceptedAt: true,
        revokedAt: true,
        organization: { select: { name: true, slug: true } },
      },
    }),
    db.enrollmentInvite.findUnique({
      where: { token },
      select: {
        expiresAt: true,
        maxUses: true,
        useCount: true,
        revokedAt: true,
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            thumbnailUrl: true,
            price: true,
            organization: { select: { name: true, slug: true } },
            modules: {
              where: { items: { some: { isPublished: true } } },
              orderBy: { position: "asc" },
              select: {
                id: true,
                title: true,
                _count: { select: { items: { where: { isPublished: true } } } },
                // Only the first few items overall are previewed, so no
                // module needs to contribute more than that.
                items: {
                  where: { isPublished: true },
                  orderBy: { position: "asc" },
                  take: previewItemCount,
                  select: {
                    id: true,
                    type: true,
                    material: { select: { title: true } },
                    assessment: { select: { title: true } },
                    vocabularySet: { select: { title: true } },
                  },
                },
              },
            },
          },
        },
        cohort: {
          select: {
            id: true,
            name: true,
            status: true,
            startsAt: true,
            endsAt: true,
            price: true,
            _count: {
              select: {
                enrollments: {
                  where: { status: { in: ["ACTIVE", "COMPLETED"] } },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  if (organizationInvite) {
    return {
      type: "ORGANIZATION" as const,
      status: organizationInviteStatus(organizationInvite, now),
      emailHint: maskEmail(organizationInvite.email),
      emailMatches: userEmail
        ? normalizeInviteEmail(userEmail) === organizationInvite.email
        : null,
      role: organizationInvite.role,
      organization: organizationInvite.organization,
    };
  }
  // Course-level invites (no class) were retired and revoked when learners
  // stopped joining curricula directly. Their links still open, as invalid.
  if (enrollmentInvite && !enrollmentInvite.cohort) {
    return {
      type: "RETIRED" as const,
      status: "REVOKED" as const,
      organization: enrollmentInvite.course.organization,
    };
  }
  if (enrollmentInvite?.cohort) {
    const cohort = enrollmentInvite.cohort;
    const curriculumItems = enrollmentInvite.course.modules.flatMap((module) =>
      module.items.map((item) => ({
        id: item.id,
        moduleTitle: module.title,
        type: item.type,
        title:
          item.material?.title ??
          item.assessment?.title ??
          item.vocabularySet?.title ??
          "Aktivitas belajar",
      })),
    );
    const exhausted =
      enrollmentInvite.maxUses !== null &&
      enrollmentInvite.useCount >= enrollmentInvite.maxUses;
    const unavailableCohort =
      (cohort.status !== "OPEN" && cohort.status !== "IN_PROGRESS") ||
      (cohort.endsAt !== null && cohort.endsAt <= now);
    const status =
      enrollmentInvite.revokedAt || unavailableCohort
        ? ("REVOKED" as const)
        : enrollmentInvite.expiresAt && enrollmentInvite.expiresAt <= now
          ? ("EXPIRED" as const)
          : exhausted
            ? ("EXHAUSTED" as const)
            : ("PENDING" as const);
    return {
      type: "COHORT" as const,
      status,
      organization: enrollmentInvite.course.organization,
      course: {
        id: enrollmentInvite.course.id,
        title: enrollmentInvite.course.title,
        description: enrollmentInvite.course.description,
        thumbnailUrl: enrollmentInvite.course.thumbnailUrl,
        moduleCount: enrollmentInvite.course.modules.length,
        itemCount: enrollmentInvite.course.modules.reduce(
          (total, module) => total + module._count.items,
          0,
        ),
        items: curriculumItems.slice(0, previewItemCount),
      },
      cohort: {
        id: cohort.id,
        name: cohort.name,
        status: cohort.status,
        startsAt: cohort.startsAt,
        endsAt: cohort.endsAt,
        // Paid cohorts are joined through checkout with this invite.
        price: effectiveCohortPrice(cohort, enrollmentInvite.course),
      },
      joinedCount: cohort._count.enrollments,
    };
  }

  throw new TRPCError({ code: "NOT_FOUND" });
}
