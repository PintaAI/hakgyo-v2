import { TRPCError } from "@trpc/server";

import type { Prisma } from "../../../generated/prisma/client";
import {
  findOtherRunningClass,
  otherRunningClassMessage,
} from "~/server/enrollment/cohort-access";

// One class per curriculum on Belajar: while a learner is in a running
// scheduled class of a course, its Kelas Mandiri is paused, not cancelled.
// The membership and its access stay; only the card is hidden until the class
// ends or they leave it (see `learnerClassCohortWhere`). Progress belongs to
// the learner and the course item, so nothing is lost either way.

/**
 * Refuses a learner joining the course's Kelas Mandiri while they are in a
 * running class of it: the joined Kelas Mandiri would stay paused and show
 * nothing. Staff may still add them; the membership simply waits.
 */
export async function assertNoRunningClassForKelasMandiri(
  db: Pick<Prisma.TransactionClient, "cohortEnrollment">,
  input: { courseId: string; userId: string; now: Date },
) {
  const otherClass = await findOtherRunningClass(db, input);
  if (!otherClass) return;
  throw new TRPCError({
    code: "PRECONDITION_FAILED",
    message: otherRunningClassMessage(otherClass.name),
  });
}
