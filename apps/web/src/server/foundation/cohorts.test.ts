import { describe, expect, test } from "bun:test";

import type { Prisma } from "../../../generated/prisma/client";
import { enrollInFoundationCohorts } from "./cohorts";

function createDb(openCohortIds: string[]) {
  const calls = { where: [] as unknown[], created: [] as unknown[] };
  const db = {
    cohort: {
      findMany: (args: { where: unknown }) => {
        calls.where.push(args.where);
        return Promise.resolve(openCohortIds.map((id) => ({ id })));
      },
    },
    cohortEnrollment: {
      createMany: (args: unknown) => {
        calls.created.push(args);
        return Promise.resolve({ count: openCohortIds.length });
      },
    },
  };
  return { db: db as unknown as Prisma.TransactionClient, calls };
}

describe("enrollInFoundationCohorts", () => {
  test("does nothing without cohort ids", async () => {
    const { db, calls } = createDb([]);
    expect(await enrollInFoundationCohorts(db, "u1", [])).toEqual({
      count: 0,
    });
    expect(calls.where).toHaveLength(0);
  });

  test("joins only open cohorts of published courses, keeping memberships", async () => {
    const { db, calls } = createDb(["c1"]);
    await enrollInFoundationCohorts(db, "u1", ["c1", "closed"]);
    expect(calls.where[0]).toEqual({
      id: { in: ["c1", "closed"] },
      status: { in: ["OPEN", "IN_PROGRESS"] },
      course: { status: "PUBLISHED" },
    });
    expect(calls.created[0]).toEqual({
      data: [
        {
          cohortId: "c1",
          userId: "u1",
          source: "FOUNDATION",
          status: "ACTIVE",
        },
      ],
      skipDuplicates: true,
    });
  });

  test("skips the insert when no listed cohort is open", async () => {
    const { db, calls } = createDb([]);
    await enrollInFoundationCohorts(db, "u1", ["closed"]);
    expect(calls.created).toHaveLength(0);
  });
});
