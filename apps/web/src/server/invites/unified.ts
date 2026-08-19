import { TRPCError } from "@trpc/server";

import type { Prisma } from "../../../generated/prisma/client";
import {
  hashOrganizationInviteToken,
  organizationInviteStatus,
} from "~/server/organization/invites";
import { normalizeInviteEmail } from "~/server/organization/invites";

type InviteDatabase = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

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
            organization: { select: { name: true, slug: true } },
          },
        },
        cohort: { select: { id: true, name: true } },
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
  if (enrollmentInvite) {
    const exhausted =
      enrollmentInvite.maxUses !== null &&
      enrollmentInvite.useCount >= enrollmentInvite.maxUses;
    const status = enrollmentInvite.revokedAt
      ? ("REVOKED" as const)
      : enrollmentInvite.expiresAt && enrollmentInvite.expiresAt <= now
        ? ("EXPIRED" as const)
        : exhausted
          ? ("EXHAUSTED" as const)
          : ("PENDING" as const);
    const base = {
      status,
      organization: enrollmentInvite.course.organization,
      course: {
        id: enrollmentInvite.course.id,
        title: enrollmentInvite.course.title,
      },
    };
    if (enrollmentInvite.cohort) {
      return {
        ...base,
        type: "COHORT" as const,
        cohort: enrollmentInvite.cohort,
      };
    }
    return { ...base, type: "COURSE" as const, cohort: null };
  }

  throw new TRPCError({ code: "NOT_FOUND" });
}
