import { describe, expect, test } from "bun:test";
import type { Prisma } from "../../../generated/prisma/client";
import { markPaymentPaid, rejectPayment } from "./lifecycle";

const now = new Date("2026-10-02T00:00:00Z");

describe("payment approval reversal", () => {
  for (const status of ["ACTIVE", "COMPLETED"] as const) {
    test(`revokes a ${status} purchase membership after the last paid payment is rejected`, async () => {
      const membership = { status: status as string, source: "PURCHASE" };
      const tx = {
        $executeRaw: async () => 1,
        payment: {
          findUnique: async () => ({ cohortId: "cohort", userId: "learner" }),
          findUniqueOrThrow: async () => ({
            id: "payment",
            cohortId: "cohort",
            userId: "learner",
            status: "PAID",
          }),
          update: async () => ({}),
          count: async () => 0,
        },
        cohortEnrollment: {
          updateMany: async ({
            where,
            data,
          }: {
            where: { status: string | { in: string[] }; source: string };
            data: { status: string };
          }) => {
            const statuses =
              typeof where.status === "string"
                ? [where.status]
                : where.status.in;
            if (
              where.source !== membership.source ||
              !statuses.includes(membership.status)
            )
              return { count: 0 };
            membership.status = data.status;
            return { count: 1 };
          },
        },
      } as unknown as Prisma.TransactionClient;
      const result = await rejectPayment(tx, {
        paymentId: "payment",
        reviewerUserId: "staff",
        reason: "Incorrect payment",
        now,
      });
      expect(result.deactivated).toBe(true);
      expect(membership.status).toBe("CANCELLED");
    });
  }
});

describe("payment approval", () => {
  test("moves the learner out of the course's Kelas Mandiri", async () => {
    const membershipUpdates: unknown[] = [];
    const tx = {
      $executeRaw: async () => 1,
      payment: {
        findUnique: async () => ({ cohortId: "class", userId: "learner" }),
        findUniqueOrThrow: async () => ({
          id: "payment",
          reference: "HKG-TEST",
          cohortId: "class",
          userId: "learner",
          status: "SUBMITTED",
        }),
        update: async () => ({}),
        updateMany: async () => ({ count: 0 }),
      },
      cohort: { findFirst: async () => ({ courseId: "course" }) },
      cohortEnrollment: {
        findUnique: async () => null,
        upsert: async () => ({}),
        updateMany: async (args: unknown) => {
          membershipUpdates.push(args);
          return { count: 1 };
        },
      },
    } as unknown as Prisma.TransactionClient;

    const result = await markPaymentPaid(tx, { paymentId: "payment", now });
    expect(result.activated).toBe(true);
    expect(membershipUpdates).toEqual([
      {
        where: {
          userId: "learner",
          status: "ACTIVE",
          cohort: { defaultForCourseId: "course" },
        },
        data: { status: "CANCELLED" },
      },
    ]);
  });
});
