import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AssessmentIntroduction } from "~/components/learner/assessment/assessment-introduction";
import { LearnerCourseItem } from "~/components/learner-course-item";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = { title: "Aktivitas belajar" };

export default async function CourseItemPage({
  params,
}: {
  params: Promise<{ courseId: string; courseItemId: string }>;
}) {
  const { courseId, courseItemId } = await params;
  // Most items are materials or vocabulary, so load the item alongside the
  // outline. Its access check reuses the request-memoized outline. Errors are
  // only surfaced once the outline confirms the item is a learner activity.
  const itemPromise = api.learning.getCourseItem({ courseItemId });
  itemPromise.catch(() => undefined);
  // The learning footer reads the outline too; prefetching it ships it with
  // the page instead of a later request. Both calls share one
  // request-memoized load.
  await api.learning.getCourseOutline.prefetch({ courseId });
  const outline = await api.learning.getCourseOutline({ courseId });
  const outlineItem = outline.modules
    .flatMap((module) => module.items)
    .find((item) => item.id === courseItemId);

  if (!outlineItem) notFound();

  if (outlineItem.type === "ASSESSMENT") {
    const assessment = await api.assessment.getForCourseItem({ courseItemId });
    return (
      <HydrateClient>
        <AssessmentIntroduction
          courseId={courseId}
          courseItemId={courseItemId}
          assessment={assessment}
        />
      </HydrateClient>
    );
  }

  const item = await itemPromise;
  if (!item) notFound();

  return (
    <HydrateClient>
      <LearnerCourseItem
        courseId={courseId}
        courseItemId={courseItemId}
        item={item}
      />
    </HydrateClient>
  );
}
