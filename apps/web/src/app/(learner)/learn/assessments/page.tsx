import type { Metadata } from "next";

import { PracticeHub } from "~/components/learner/practice/practice-hub";

export const metadata: Metadata = { title: "Latihan" };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const courseId = first(params.courseId);
  const sourceCourseItemId = first(params.sourceCourseItemId);

  return (
    <PracticeHub
      preselectedSource={
        courseId && sourceCourseItemId
          ? {
              courseId,
              sourceCourseItemId,
              vocabularySetId: first(params.vocabularySetId) || undefined,
              title: first(params.vocabularyTitle) || undefined,
            }
          : undefined
      }
    />
  );
}
