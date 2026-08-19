import { describe, expect, test } from "bun:test";

import type { Prisma } from "../../../generated/prisma/client";
import { consumeEnrollmentInvite } from "./invite-redemption";

const now = new Date("2026-08-17T00:00:00.000Z");

async function rejectionCode(operation: Promise<unknown>) {
  try {
    await operation;
    return null;
  } catch (error) {
    return error && typeof error === "object" && "code" in error
      ? error.code
      : null;
  }
}

function createTransaction() {
  let useCount = 0;
  const invite = {
    id: "invite-1",
    courseId: "course-1",
    organizationId: "organization-1",
    cohortId: null,
    createdByMembershipId: "membership-1",
    token: "one-time-token-that-is-long-enough",
    expiresAt: null,
    maxUses: 1,
    revokedAt: null,
    createdAt: now,
  };

  const tx = {
    enrollmentInvite: {
      findUnique: () => Promise.resolve({ ...invite, useCount }),
      updateMany: () => {
        if (useCount >= invite.maxUses) return Promise.resolve({ count: 0 });
        useCount += 1;
        return Promise.resolve({ count: 1 });
      },
    },
  } as unknown as Prisma.TransactionClient;

  return { tx, getUseCount: () => useCount };
}

describe("invite redemption", () => {
  test("automatically exhausts a one-time invite after its first use", async () => {
    const { tx, getUseCount } = createTransaction();

    const redeemed = await consumeEnrollmentInvite(
      tx,
      "one-time-token-that-is-long-enough",
      now,
    );
    expect(redeemed).toMatchObject({ id: "invite-1", maxUses: 1 });
    expect(getUseCount()).toBe(1);

    expect(
      await rejectionCode(
        consumeEnrollmentInvite(tx, "one-time-token-that-is-long-enough", now),
      ),
    ).toBe("BAD_REQUEST");
    expect(getUseCount()).toBe(1);
  });

  test("rejects a concurrent claim that loses the conditional update", async () => {
    const { tx } = createTransaction();
    const delegate = tx.enrollmentInvite as unknown as {
      updateMany: () => Promise<{ count: number }>;
    };
    delegate.updateMany = () => Promise.resolve({ count: 0 });

    expect(
      await rejectionCode(
        consumeEnrollmentInvite(tx, "one-time-token-that-is-long-enough", now),
      ),
    ).toBe("CONFLICT");
  });
});
