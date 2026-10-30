import { describe, expect, test } from "bun:test";

import type { Prisma } from "../../../generated/prisma/client";
import { liveClassCohortWhere } from "./cohort-access";
import {
  assertNoRunningClassForKelasMandiri,
  leaveKelasMandiriForClass,
} from "./kelas-mandiri";

const now = new Date("2026-10-30T00:00:00.000Z");

async function rejection(operation: Promise<unknown>) {
  try {
    await operation;
    return null;
  } catch (error) {
    return error as { code: string; message: string };
  }
}

function createDatabase(input: {
  runningClass: { courseId: string } | null;
  otherClass?: { id: string; name: string } | null;
}) {
  const calls = { cohortLookups: [] as unknown[], updates: [] as unknown[] };
  const db = {
    cohort: {
      findFirst: (args: unknown) => {
        calls.cohortLookups.push(args);
        return Promise.resolve(input.runningClass);
      },
    },
    cohortEnrollment: {
      findFirst: () =>
        Promise.resolve(input.otherClass ? { cohort: input.otherClass } : null),
      updateMany: (args: unknown) => {
        calls.updates.push(args);
        return Promise.resolve({ count: 1 });
      },
    },
  } as unknown as Prisma.TransactionClient;
  return { db, calls };
}

describe("moving out of the Kelas Mandiri", () => {
  test("cancels the active Kelas Mandiri membership when joining a running class", async () => {
    const { db, calls } = createDatabase({
      runningClass: { courseId: "course-1" },
    });

    await leaveKelasMandiriForClass(db, {
      cohortId: "class-1",
      userId: "user-1",
      now,
    });

    expect(calls.cohortLookups).toEqual([
      {
        where: { id: "class-1", ...liveClassCohortWhere(now) },
        select: { courseId: true },
      },
    ]);
    expect(calls.updates).toEqual([
      {
        where: {
          userId: "user-1",
          status: "ACTIVE",
          cohort: { defaultForCourseId: "course-1" },
        },
        data: { status: "CANCELLED" },
      },
    ]);
  });

  test("keeps the Kelas Mandiri for cohorts that are not running classes", async () => {
    const { db, calls } = createDatabase({ runningClass: null });

    const result = await leaveKelasMandiriForClass(db, {
      cohortId: "ended-class",
      userId: "user-1",
      now,
    });

    expect(result).toEqual({ count: 0 });
    expect(calls.updates).toEqual([]);
  });
});

describe("joining the Kelas Mandiri", () => {
  const input = { courseId: "course-1", userId: "user-1", now };

  test("allows it without a running class", async () => {
    const { db } = createDatabase({ runningClass: null, otherClass: null });

    expect(
      await rejection(
        assertNoRunningClassForKelasMandiri(db, { ...input, by: "learner" }),
      ),
    ).toBeNull();
  });

  test("refuses the learner while they are in a running class", async () => {
    const { db } = createDatabase({
      runningClass: null,
      otherClass: { id: "class-1", name: "Kelas Pagi" },
    });

    const error = await rejection(
      assertNoRunningClassForKelasMandiri(db, { ...input, by: "learner" }),
    );
    expect(error?.code).toBe("PRECONDITION_FAILED");
    expect(error?.message).toContain("Kelas Pagi");
  });

  test("refuses staff with the staff wording", async () => {
    const { db } = createDatabase({
      runningClass: null,
      otherClass: { id: "class-1", name: "Kelas Pagi" },
    });

    const error = await rejection(
      assertNoRunningClassForKelasMandiri(db, { ...input, by: "staff" }),
    );
    expect(error?.code).toBe("CONFLICT");
    expect(error?.message).toStartWith("Learner ini masih aktif di Kelas Pagi");
  });
});
