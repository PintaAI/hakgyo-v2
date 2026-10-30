import { TRPCError } from "@trpc/server";

import type { Prisma } from "../../../generated/prisma/client";
import {
  findOtherRunningClass,
  liveClassCohortWhere,
  otherRunningClassMessage,
  staffOtherRunningClassMessage,
} from "~/server/enrollment/cohort-access";

// One class per curriculum: a learner studies a course either in one running
// scheduled class or in its Kelas Mandiri, never both. Progress belongs to
// the learner and the course item, so moving between them loses nothing.

type KelasMandiriDb = Pick<
  Prisma.TransactionClient,
  "cohort" | "cohortEnrollment"
>;

/**
 * Ends the learner's Kelas Mandiri membership once they are active in a
 * running scheduled class of the same course. Call it in the transaction that
 * activates the class membership; it does nothing for other cohorts.
 */
export async function leaveKelasMandiriForClass(
  db: KelasMandiriDb,
  input: { cohortId: string; userId: string; now: Date },
) {
  const cohort = await db.cohort.findFirst({
    where: { id: input.cohortId, ...liveClassCohortWhere(input.now) },
    select: { courseId: true },
  });
  if (!cohort) return { count: 0 };
  return db.cohortEnrollment.updateMany({
    where: {
      userId: input.userId,
      status: "ACTIVE",
      cohort: { defaultForCourseId: cohort.courseId },
    },
    data: { status: "CANCELLED" },
  });
}

/**
 * Refuses joining the course's Kelas Mandiri while the learner is in a
 * running class of it. `by` picks the wording: the learner or staff.
 */
export async function assertNoRunningClassForKelasMandiri(
  db: Pick<Prisma.TransactionClient, "cohortEnrollment">,
  input: {
    courseId: string;
    userId: string;
    now: Date;
    by: "learner" | "staff";
  },
) {
  const otherClass = await findOtherRunningClass(db, input);
  if (!otherClass) return;
  throw input.by === "staff"
    ? new TRPCError({
        code: "CONFLICT",
        message: staffOtherRunningClassMessage(otherClass.name),
      })
    : new TRPCError({
        code: "PRECONDITION_FAILED",
        message: otherRunningClassMessage(otherClass.name),
      });
}
