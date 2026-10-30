import { describe, expect, test } from "bun:test";

import type { Prisma } from "../../../generated/prisma/client";
import { loadCohortCheckout } from "~/server/payment/checkout";

const now = new Date("2026-10-30T00:00:00.000Z");

type Lookup = { where: Record<string, unknown> };

/**
 * A learner who is not yet in the target class and may be active in a
 * running scheduled class ("Kelas Pagi") of the same curriculum.
 */
function createDatabase(input: {
  target: { id: string; defaultForCourseId: string | null };
  runningClass: boolean;
}) {
  const runningClassLookups: Lookup[] = [];
  const db = {
    cohort: {
      findUnique: () =>
        Promise.resolve({
          id: input.target.id,
          name: input.target.defaultForCourseId ? "Kelas Mandiri" : "Kelas B",
          description: null,
          status: "OPEN",
          startsAt: null,
          endsAt: null,
          capacity: null,
          price: null,
          enrollmentMode: null,
          defaultForCourseId: input.target.defaultForCourseId,
          organizationId: "organization-1",
          course: {
            id: "course-1",
            title: "TOPIK I",
            thumbnailUrl: null,
            status: "PUBLISHED",
            organization: { name: "Hakgyo", defaultEnrollmentMode: "OPEN" },
          },
        }),
    },
    cohortEnrollment: {
      count: () => Promise.resolve(0),
      findUnique: () => Promise.resolve(null),
      findFirst: (args: Lookup) => {
        runningClassLookups.push(args);
        return Promise.resolve(
          input.runningClass
            ? { cohort: { id: "class-1", name: "Kelas Pagi" } }
            : null,
        );
      },
    },
    payment: { findFirst: () => Promise.resolve(null) },
    organizationQris: { findUnique: () => Promise.resolve(null) },
    organizationBankAccount: { findMany: () => Promise.resolve([]) },
    enrollmentInvite: { findUnique: () => Promise.resolve(null) },
  } as unknown as Prisma.TransactionClient;
  return { db, runningClassLookups };
}

const kelasMandiri = { id: "course-1-mandiri", defaultForCourseId: "course-1" };

describe("checkout of a Kelas Mandiri", () => {
  test("checkout refuses it while the learner is in a running class of the curriculum", async () => {
    const { db, runningClassLookups } = createDatabase({
      target: kelasMandiri,
      runningClass: true,
    });

    const checkout = await loadCohortCheckout(db, {
      cohortId: kelasMandiri.id,
      userId: "user-1",
      now,
    });
    expect(checkout.blocker).toBe("IN_OTHER_CLASS");
    expect(checkout.blockerMessage).toContain("Kelas Pagi");
    expect(checkout.cohort.selfPaced).toBe(true);
    // Only running scheduled classes count, never the Kelas Mandiri itself.
    expect(runningClassLookups[0]?.where.cohort).toMatchObject({
      courseId: "course-1",
      defaultForCourseId: null,
    });
  });

  test("checkout lets a learner without a running class join it", async () => {
    const { db } = createDatabase({
      target: kelasMandiri,
      runningClass: false,
    });

    const checkout = await loadCohortCheckout(db, {
      cohortId: kelasMandiri.id,
      userId: "user-1",
      now,
    });
    expect(checkout.blocker).toBeNull();
  });
});
