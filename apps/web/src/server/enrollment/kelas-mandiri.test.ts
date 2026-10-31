import { describe, expect, mock, test } from "bun:test";

import { enrollmentRouter } from "~/server/api/routers/enrollment";
import { createRequestCache } from "~/server/request-cache";

async function rejection(operation: Promise<unknown>) {
  try {
    await operation;
    return null;
  } catch (error) {
    return error as { code: string; message: string };
  }
}

/** An open free course whose Kelas Mandiri the learner has not joined yet. */
function createDatabase(input: {
  runningClass: { id: string; name: string } | null;
}) {
  const joins = mock(() => Promise.resolve({ count: 1 }));
  const db = {
    course: {
      findUnique: () =>
        Promise.resolve({
          status: "PUBLISHED",
          price: 0,
          enrollmentMode: "OPEN",
          organization: { defaultEnrollmentMode: "OPEN" },
        }),
    },
    cohort: { findUnique: () => Promise.resolve({ id: "course-1-mandiri" }) },
    cohortEnrollment: {
      // The existing Kelas Mandiri membership, then the running class.
      findFirst: (args: {
        where: { cohort: { defaultForCourseId: string | null } };
      }) =>
        Promise.resolve(
          args.where.cohort.defaultForCourseId === null && input.runningClass
            ? { cohort: input.runningClass }
            : null,
        ),
      createMany: joins,
      findUniqueOrThrow: () =>
        Promise.resolve({ cohortId: "course-1-mandiri", status: "ACTIVE" }),
    },
    $transaction: (work: (tx: unknown) => Promise<unknown>) => work(db),
  };
  const caller = enrollmentRouter.createCaller({
    db: db as never,
    actorKind: "mcp",
    actorUserId: "user-1",
    session: null,
    headers: new Headers(),
    requestCache: createRequestCache(),
  });
  return { caller, joins };
}

describe("joining the Kelas Mandiri", () => {
  test("joins a learner without a running class of the curriculum", async () => {
    const { caller, joins } = createDatabase({ runningClass: null });

    await caller.enrollOpenCourse({ courseId: "course-1" });
    expect(joins).toHaveBeenCalledTimes(1);
  });

  test("refuses a learner while they are in a running class of the curriculum", async () => {
    const { caller, joins } = createDatabase({
      runningClass: { id: "class-1", name: "Kelas Pagi" },
    });

    const error = await rejection(
      caller.enrollOpenCourse({ courseId: "course-1" }),
    );
    expect(error?.code).toBe("PRECONDITION_FAILED");
    expect(error?.message).toContain("Kelas Pagi");
    expect(joins).not.toHaveBeenCalled();
  });
});
