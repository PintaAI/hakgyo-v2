import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CardsSession } from "~/components/learner/practice/cards-session";
import { api } from "~/trpc/server";

export const metadata: Metadata = { title: "Kartu" };

export default async function CardsPage({
  params,
}: {
  params: Promise<{ courseItemId: string }>;
}) {
  const { courseItemId } = await params;
  const item = await api.learning
    .getCourseItem({ courseItemId })
    .catch(() => null);
  const vocabulary = item?.vocabularySet;
  if (!item || !vocabulary) notFound();

  return (
    <CardsSession
      courseId={item.module.courseId}
      sourceCourseItemId={courseItemId}
      vocabularySetId={vocabulary.id}
      title={vocabulary.title}
      words={vocabulary.entries.map((entry) => ({
        id: entry.id,
        term: entry.term,
        definition: entry.definition,
        imageAssetId: entry.imageAsset?.id,
      }))}
    />
  );
}
