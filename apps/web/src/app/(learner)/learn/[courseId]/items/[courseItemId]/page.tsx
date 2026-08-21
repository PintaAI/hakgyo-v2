import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AssessmentIntroduction } from "~/components/learner-assessment";
import { LearnerCourseItem } from "~/components/learner-course-item";
import { api } from "~/trpc/server";

export const metadata: Metadata = { title: "Aktivitas belajar" };

export default async function CourseItemPage({
  params,
}: {
  params: Promise<{ courseId: string; courseItemId: string }>;
}) {
  const { courseId, courseItemId } = await params;
  const outline = await api.learning.getCourseOutline({ courseId });
  const outlineItem = outline.modules
    .flatMap((module) => module.items)
    .find((item) => item.id === courseItemId);

  if (!outlineItem) notFound();

  if (outlineItem.type === "ASSESSMENT") {
    const assessment = await api.assessment.getForCourseItem({ courseItemId });
    return (
      <AssessmentIntroduction
        courseId={courseId}
        courseItemId={courseItemId}
        assessment={assessment}
      />
    );
  }

  const item = await api.learning.getCourseItem({ courseItemId });
  if (!item) notFound();

  return (
    <LearnerCourseItem
      courseId={courseId}
      courseItemId={courseItemId}
      item={item}
    />
  );
}
