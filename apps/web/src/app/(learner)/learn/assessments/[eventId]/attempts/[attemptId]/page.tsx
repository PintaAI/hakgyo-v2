import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AssessmentAttempt } from "~/components/learner/assessment/assessment-attempt";
import { api } from "~/trpc/server";

export const metadata: Metadata = { title: "Kerjakan tugas" };

/** An event attempt, also for library events whose attempts have no course item. */
export default async function AssessmentEventAttemptPage({
  params,
}: {
  params: Promise<{ eventId: string; attemptId: string }>;
}) {
  const { eventId, attemptId } = await params;
  const attempt = await api.assessment.getMyAttempt({ attemptId });

  const event = attempt.assessmentEvent;
  if (event?.id !== eventId) notFound();
  // Attempts with a course item keep their course item route.
  if (attempt.courseItemId) {
    redirect(
      `/learn/${event.course.id}/items/${attempt.courseItemId}/attempts/${attempt.id}`,
    );
  }

  const assessment = await api.assessment.getForAttempt({ attemptId });

  return (
    <AssessmentAttempt
      courseId={event.course.id}
      courseItemId={null}
      assessment={assessment}
      attempt={attempt}
      serverTime={new Date()}
    />
  );
}
