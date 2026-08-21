import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AssessmentAttempt } from "~/components/learner-assessment";
import { api } from "~/trpc/server";

export const metadata: Metadata = { title: "Kerjakan assessment" };

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
