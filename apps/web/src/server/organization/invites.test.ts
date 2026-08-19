import { describe, expect, mock, test } from "bun:test";

import type { Prisma } from "../../../generated/prisma/client";
import {
  acceptOrganizationInvite,
  createOrganizationInviteToken,
  hashOrganizationInviteToken,
  normalizeInviteEmail,
  organizationInviteStatus,
} from "./invites";

const now = new Date("2026-08-18T12:00:00.000Z");

function transaction(options?: {
  consumed?: number;
  email?: string;
  existingMembership?: boolean;
  role?: "ADMIN" | "TEACHER";
}) {
  const organizationMemberCreate = mock(() =>
    Promise.resolve({ id: "membership-1", role: options?.role ?? "TEACHER" }),
  );
  const organizationInviteUpdateMany = mock(() =>
    Promise.resolve({ count: options?.consumed ?? 1 }),
  );
  const tx = {
    organizationInvite: {
      findUnique: mock(() =>
        Promise.resolve({
          id: "invite-1",
          organizationId: "organization-1",
          email: options?.email ?? "teacher@example.com",
          role: options?.role ?? "TEACHER",
          acceptedAt: null,
          revokedAt: null,
          expiresAt: new Date("2026-08-25T12:00:00.000Z"),
          pendingKey: "organization-1:teacher@example.com",
          organization: {
            id: "organization-1",
            name: "Hakgyo Academy",
            slug: "hakgyo-academy",
          },
        }),
      ),
      updateMany: organizationInviteUpdateMany,
    },
    organizationMember: {
      findUnique: mock(() =>
        Promise.resolve(
          options?.existingMembership ? { id: "existing-member" } : null,
        ),
      ),
      create: organizationMemberCreate,
    },
  } as unknown as Prisma.TransactionClient;

  return { tx, organizationInviteUpdateMany, organizationMemberCreate };
}

async function expectCode(promise: Promise<unknown>, code: string) {
  try {
    await promise;
    throw new Error("Expected promise to reject");
  } catch (error) {
    expect(error).toMatchObject({ code });
  }
}

describe("organization invitation tokens", () => {
  test("creates opaque tokens and stores only deterministic hashes", () => {
    const first = createOrganizationInviteToken();
    const second = createOrganizationInviteToken();
    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).toBe(hashOrganizationInviteToken(first.token));
    expect(first.tokenHash).not.toContain(first.token);
    expect(normalizeInviteEmail(" Teacher@Example.COM ")).toBe(
      "teacher@example.com",
    );
  });

  test("derives pending, expired, revoked, and accepted states", () => {
    const pending = {
      acceptedAt: null,
      revokedAt: null,
      expiresAt: new Date("2026-08-19T12:00:00.000Z"),
    };
    expect(organizationInviteStatus(pending, now)).toBe("PENDING");
    expect(
      organizationInviteStatus(
        { ...pending, expiresAt: new Date("2026-08-17T12:00:00.000Z") },
        now,
      ),
    ).toBe("EXPIRED");
    expect(
      organizationInviteStatus({ ...pending, revokedAt: now }, now),
    ).toBe("REVOKED");
    expect(
      organizationInviteStatus({ ...pending, acceptedAt: now }, now),
    ).toBe("ACCEPTED");
  });
});

describe("acceptOrganizationInvite", () => {
  test("atomically consumes the invite and creates the requested membership", async () => {
    const { tx, organizationInviteUpdateMany, organizationMemberCreate } =
      transaction({ role: "ADMIN", email: "admin@example.com" });
    const result = await acceptOrganizationInvite(tx, {
      token: "valid-organization-invite-token",
      userId: "user-1",
      userEmail: "ADMIN@example.com",
      now,
    });

    expect(organizationInviteUpdateMany).toHaveBeenCalledTimes(1);
    expect(organizationMemberCreate).toHaveBeenCalledTimes(1);
    expect(result.membership.role).toBe("ADMIN");
    expect(result.organization.slug).toBe("hakgyo-academy");
  });

  test("rejects a different account email before consuming", async () => {
    const { tx, organizationInviteUpdateMany, organizationMemberCreate } =
      transaction();
    await expectCode(
      acceptOrganizationInvite(tx, {
        token: "valid-organization-invite-token",
        userId: "user-1",
        userEmail: "other@example.com",
        now,
      }),
      "FORBIDDEN",
    );
    expect(organizationInviteUpdateMany).not.toHaveBeenCalled();
    expect(organizationMemberCreate).not.toHaveBeenCalled();
  });

  test("rejects an existing organization member", async () => {
    const { tx, organizationInviteUpdateMany } = transaction({
      existingMembership: true,
    });
    await expectCode(
      acceptOrganizationInvite(tx, {
        token: "valid-organization-invite-token",
        userId: "user-1",
        userEmail: "teacher@example.com",
        now,
      }),
      "CONFLICT",
    );
    expect(organizationInviteUpdateMany).not.toHaveBeenCalled();
  });

  test("rejects a concurrent second acceptance", async () => {
    const { tx, organizationMemberCreate } = transaction({ consumed: 0 });
    await expectCode(
      acceptOrganizationInvite(tx, {
        token: "valid-organization-invite-token",
        userId: "user-1",
        userEmail: "teacher@example.com",
        now,
      }),
      "CONFLICT",
    );
    expect(organizationMemberCreate).not.toHaveBeenCalled();
  });
});
