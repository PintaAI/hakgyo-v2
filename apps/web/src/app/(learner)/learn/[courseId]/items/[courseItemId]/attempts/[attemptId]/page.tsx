import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AssessmentAttempt } from "~/components/learner/assessment/assessment-attempt";
import { api } from "~/trpc/server";

export const metadata: Metadata = { title: "Kerjakan tugas" };

export default async function AttemptPage({
  params,
}: {
  params: Promise<{
    courseId: string;
    courseItemId: string;
    attemptId: string;
  }>;
}) {
  const { courseId, courseItemId, attemptId } = await params;
  const [assessment, attempt] = await Promise.all([
    api.assessment.getForCourseItem({ courseItemId, attemptId }),
    api.assessment.getMyAttempt({ attemptId }),
  ]);

  if (attempt.courseItemId !== courseItemId) notFound();

  // Like the app, a finished attempt has no screen of its own: its tugas or
  // event screen shows the result in full (also for a "Nilai keluar" link).
  if (attempt.status !== "IN_PROGRESS") {
    redirect(
      assessment.event
        ? `/learn/assessments/${assessment.event.id}`
        : `/learn/${courseId}/items/${courseItemId}`,
    );
  }

  return (
    <AssessmentAttempt
      courseId={courseId}
      courseItemId={courseItemId}
      assessment={assessment}
      attempt={attempt}
      serverTime={new Date()}
    />
  );
}
