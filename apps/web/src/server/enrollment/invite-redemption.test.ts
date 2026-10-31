import { describe, expect, test } from "bun:test";

import type { Prisma } from "../../../generated/prisma/client";
import {
  consumeEnrollmentInvite,
  redeemEnrollmentInvite,
} from "./invite-redemption";

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

/** A one-time invite to a free open class. */
function createTransaction(cohortId = "cohort-1") {
  let useCount = 0;
  const invite = {
    id: "invite-1",
    courseId: "course-1",
    organizationId: "organization-1",
    cohortId,
    createdByMembershipId: "membership-1",
    token: "one-time-token-that-is-long-enough",
    expiresAt: null,
    maxUses: 1,
    revokedAt: null,
    createdAt: now,
    cohort: { status: "OPEN", endsAt: null, price: null },
  };

  const tx = {
    $executeRaw: () => Promise.resolve(1),
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

  test("rejects an invite after its cohort has ended", async () => {
    let updateCount = 0;
    const tx = {
      enrollmentInvite: {
        findUnique: () =>
          Promise.resolve({
            id: "invite-1",
            cohortId: "cohort-1",
            revokedAt: null,
            expiresAt: null,
            maxUses: null,
            useCount: 0,
            cohort: { status: "COMPLETED" },
          }),
        updateMany: () => {
          updateCount += 1;
          return Promise.resolve({ count: 1 });
        },
      },
    } as unknown as Prisma.TransactionClient;

    expect(
      await rejectionCode(
        consumeEnrollmentInvite(tx, "ended-cohort-token-long-enough", now),
      ),
    ).toBe("BAD_REQUEST");
    expect(updateCount).toBe(0);
  });

  test("rejects a retired course-level invite", async () => {
    let updateCount = 0;
    const tx = {
      enrollmentInvite: {
        findUnique: () =>
          Promise.resolve({
            id: "invite-1",
            courseId: "course-1",
            cohortId: null,
            revokedAt: null,
            expiresAt: null,
            maxUses: null,
            useCount: 0,
            cohort: null,
          }),
        updateMany: () => {
          updateCount += 1;
          return Promise.resolve({ count: 1 });
        },
      },
    } as unknown as Prisma.TransactionClient;

    for (const operation of [
      consumeEnrollmentInvite(tx, "course-invite-token-long-enough", now),
      redeemEnrollmentInvite(tx, {
        token: "course-invite-token-long-enough",
        userId: "user-1",
        now,
      }),
    ]) {
      expect(await rejectionCode(operation)).toBe("BAD_REQUEST");
    }
    expect(updateCount).toBe(0);
  });

  test("does not consume a use when the learner is already enrolled", async () => {
    const { tx, getUseCount } = createTransaction();
    const writes: unknown[] = [];
    Object.assign(tx, {
      cohortEnrollment: {
        findUnique: () =>
          Promise.resolve({
            id: "membership-1",
            status: "ACTIVE",
            expiresAt: null,
          }),
        upsert: (args: unknown) => {
          writes.push(args);
          return Promise.resolve({});
        },
      },
    });

    const result = await redeemEnrollmentInvite(tx, {
      token: "one-time-token-that-is-long-enough",
      userId: "user-1",
      now,
    });
    expect(result).toEqual({
      type: "COHORT",
      courseId: "course-1",
      cohortId: "cohort-1",
    });
    expect(getUseCount()).toBe(0);
    expect(writes).toHaveLength(0);
  });

  test("sends invites to a paid cohort to checkout without consuming a use", async () => {
    let updateCount = 0;
    const tx = {
      $executeRaw: () => Promise.resolve(1),
      enrollmentInvite: {
        findUnique: () =>
          Promise.resolve({
            id: "invite-1",
            courseId: "course-1",
            cohortId: "cohort-1",
            revokedAt: null,
            expiresAt: null,
            maxUses: null,
            useCount: 0,
            cohort: { status: "OPEN", endsAt: null, price: 350000 },
          }),
        updateMany: () => {
          updateCount += 1;
          return Promise.resolve({ count: 1 });
        },
      },
      cohortEnrollment: { findUnique: () => Promise.resolve(null) },
    } as unknown as Prisma.TransactionClient;

    expect(
      await rejectionCode(
        redeemEnrollmentInvite(tx, {
          token: "paid-cohort-token-long-enough",
          userId: "user-1",
          now,
        }),
      ),
    ).toBe("PRECONDITION_FAILED");
    expect(updateCount).toBe(0);
  });

  for (const target of [
    { name: "another class", cohortId: "cohort-2" },
    { name: "the Kelas Mandiri", cohortId: "course-1-mandiri" },
  ]) {
    test(`refuses an invite to ${target.name} while the learner takes a running class of the course`, async () => {
      const { tx, getUseCount } = createTransaction(target.cohortId);
      const lookups: Array<{ where: Record<string, unknown> }> = [];
      Object.assign(tx, {
        cohortEnrollment: {
          // Not a member of the invited class, but active in a running one.
          findUnique: () => Promise.resolve(null),
          findFirst: (args: { where: Record<string, unknown> }) => {
            lookups.push(args);
            return Promise.resolve({
              cohort: { id: "cohort-1", name: "Kelas Pagi" },
            });
          },
        },
      });

      expect(
        await rejectionCode(
          redeemEnrollmentInvite(tx, {
            token: "one-time-token-that-is-long-enough",
            userId: "user-1",
            now,
          }),
        ),
      ).toBe("PRECONDITION_FAILED");
      expect(lookups[0]?.where.cohortId).toEqual({ not: target.cohortId });
      expect(getUseCount()).toBe(0);
    });
  }

  test("consumes a use and joins the invited class", async () => {
    const { tx, getUseCount } = createTransaction();
    const memberships: unknown[] = [];
    Object.assign(tx, {
      cohortEnrollment: {
        findUnique: () => Promise.resolve(null),
        findFirst: () => Promise.resolve(null),
        upsert: (args: { create: unknown }) => {
          memberships.push(args.create);
          return Promise.resolve({});
        },
      },
    });

    await redeemEnrollmentInvite(tx, {
      token: "one-time-token-that-is-long-enough",
      userId: "user-1",
      now,
    });
    expect(getUseCount()).toBe(1);
    expect(memberships).toEqual([
      {
        cohortId: "cohort-1",
        userId: "user-1",
        status: "ACTIVE",
        source: "INVITE",
        completedAt: null,
        expiresAt: null,
      },
    ]);
  });
});
