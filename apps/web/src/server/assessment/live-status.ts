import { TRPCError } from "@trpc/server";

import type { Prisma } from "../../../generated/prisma/client";

type DatabaseClient = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

export type AssessmentLiveStatus = {
  isLive: boolean;
  /** Visible items in published courses that place the assessment. */
  placements: Array<{
    courseItemId: string;
    courseId: string;
    courseTitle: string;
    moduleId: string;
    moduleTitle: string;
  }>;
  /** SCHEDULED or OPEN assessment events (tryouts/exams) on the assessment. */
  openEvents: Array<{
    eventId: string;
    title: string;
    scheduled: boolean;
    courseId: string;
    courseTitle: string;
    courseItemId: string;
  }>;
  /** Public quizzes visitors can currently start. */
  openPublicQuizzes: Array<{ quizId: string; title: string }>;
};

/**
 * An assessment is live while learners can take it: a visible item of a published course places
 * it, a SCHEDULED or OPEN assessment event uses it, or an open public quiz uses it. Live assessments cannot be edited; authors hide the
 * item(s) or duplicate the assessment instead.
 */
export async function getAssessmentLiveStatus(
  db: DatabaseClient,
  assessmentId: string,
): Promise<AssessmentLiveStatus> {
  const now = new Date();
  const [items, events, publicQuizzes] = await Promise.all([
    db.courseItem.findMany({
      where: {
        assessmentId,
        isPublished: true,
        module: { course: { status: "PUBLISHED" } },
      },
      orderBy: [{ module: { position: "asc" } }, { position: "asc" }],
      select: {
        id: true,
        module: {
          select: {
            id: true,
            title: true,
            course: { select: { id: true, title: true } },
          },
        },
      },
    }),
    db.assessmentEvent.findMany({
      // Scheduled events open automatically, so they lock the assessment as well.
      where: {
        status: { in: ["SCHEDULED", "OPEN"] },
        courseItem: { assessmentId },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        status: true,
        courseItemId: true,
        course: { select: { id: true, title: true } },
      },
    }),
    db.publicQuiz.findMany({
      where: {
        assessmentId,
        status: "OPEN",
        OR: [{ closesAt: null }, { closesAt: { gt: now } }],
      },
      select: { id: true, title: true },
    }),
  ]);
  const placements = items.map((item) => ({
    courseItemId: item.id,
    courseId: item.module.course.id,
    courseTitle: item.module.course.title,
    moduleId: item.module.id,
    moduleTitle: item.module.title,
  }));
  const openEvents = events.map((event) => ({
    eventId: event.id,
    title: event.title,
    scheduled: event.status === "SCHEDULED",
    courseId: event.course.id,
    courseTitle: event.course.title,
    courseItemId: event.courseItemId,
  }));
  const openPublicQuizzes = publicQuizzes.map((quiz) => ({
    quizId: quiz.id,
    title: quiz.title,
  }));
  return {
    isLive:
      placements.length > 0 ||
      openEvents.length > 0 ||
      openPublicQuizzes.length > 0,
    placements,
    openEvents,
    openPublicQuizzes,
  };
}

export function describeLiveLocations(status: AssessmentLiveStatus) {
  const locations = [
    ...status.placements.map(
      (placement) => `${placement.courseTitle} › ${placement.moduleTitle}`,
    ),
    ...status.openEvents.map(
      (event) =>
        `${event.courseTitle} › ${event.title} (${event.scheduled ? "terjadwal" : "sedang berlangsung"})`,
    ),
    ...status.openPublicQuizzes.map((quiz) => `quiz publik "${quiz.title}"`),
  ];
  return [...new Set(locations)].join(", ");
}

/** Rejects any write to a live assessment. */
export async function assertAssessmentNotLive(
  db: DatabaseClient,
  assessmentId: string,
) {
  const status = await getAssessmentLiveStatus(db, assessmentId);
  if (!status.isLive) return;
  throw new TRPCError({
    code: "PRECONDITION_FAILED",
    message: `Tugas ini sedang tayang di ${describeLiveLocations(status)}. Sembunyikan item, tutup quiz publik, atau duplikat tugas untuk mengubahnya.`,
  });
}
