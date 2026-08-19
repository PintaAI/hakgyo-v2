import { createHash, randomBytes } from "node:crypto";

import { TRPCError } from "@trpc/server";

import type { Prisma } from "../../../generated/prisma/client";

export const ORGANIZATION_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function normalizeInviteEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashOrganizationInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createOrganizationInviteToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashOrganizationInviteToken(token) };
}

export function organizationInviteStatus(
  input: {
    acceptedAt: Date | null;
    expiresAt: Date;
    revokedAt: Date | null;
  },
  now = new Date(),
) {
  if (input.acceptedAt) return "ACCEPTED" as const;
  if (input.revokedAt) return "REVOKED" as const;
  if (input.expiresAt <= now) return "EXPIRED" as const;
  return "PENDING" as const;
}

export async function acceptOrganizationInvite(
  tx: Prisma.TransactionClient,
  input: { token: string; userId: string; userEmail: string; now: Date },
) {
  const invite = await tx.organizationInvite.findUnique({
    where: { tokenHash: hashOrganizationInviteToken(input.token) },
    include: { organization: { select: { id: true, name: true, slug: true } } },
  });
  if (!invite) throw new TRPCError({ code: "NOT_FOUND" });
  if (organizationInviteStatus(invite, input.now) !== "PENDING") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invitation is no longer valid",
    });
  }
  if (normalizeInviteEmail(input.userEmail) !== invite.email) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Sign in with the email address that received this invitation",
    });
  }
  if (invite.role === "OWNER") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  const existingMembership = await tx.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: invite.organizationId,
        userId: input.userId,
      },
    },
    select: { id: true },
  });
  if (existingMembership) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You are already a member of this organization",
    });
  }

  const consumed = await tx.organizationInvite.updateMany({
    where: {
      id: invite.id,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: input.now },
      pendingKey: { not: null },
    },
    data: {
      acceptedAt: input.now,
      acceptedByUserId: input.userId,
      pendingKey: null,
    },
  });
  if (consumed.count !== 1) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Invitation was already consumed",
    });
  }

  const membership = await tx.organizationMember.create({
    data: {
      organizationId: invite.organizationId,
      userId: input.userId,
      role: invite.role,
    },
    select: { id: true, role: true },
  });

  return { inviteId: invite.id, membership, organization: invite.organization };
}
