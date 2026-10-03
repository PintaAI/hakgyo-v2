"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ArrowLeftIcon, HouseIcon } from "lucide-react";

import type { HakgyoPartialBlock } from "~/components/editor/block-note-schema";
import { DynamicLearnerBlockNoteDocument } from "~/components/editor/dynamic-learner-block-note-document";
import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";
import {
  CourseLearningFooter,
  type LearningRequirementAction,
} from "./learner/learn/course-learning-footer";
import { VocabularySetDetail } from "./learner/learn/vocabulary-set-detail";

type CourseItem = NonNullable<RouterOutputs["learning"]["getCourseItem"]>;

export function LearnerCourseItem({
  courseId,
  courseItemId,
  item,
}: {
  courseId: string;
  courseItemId: string;
  item: CourseItem;
}) {
  const markProgress = api.learning.markContentProgress.useMutation();
  const { resolvedTheme } = useTheme();
  const material = item.material;
  const vocabulary = item.vocabularySet;

  // Opening an item starts it; completing it happens in the learning footer.
  useEffect(() => {
    if (!item.progress.length) {
      markProgress.mutate({ courseItemId, status: "IN_PROGRESS" });
    }
    // Progress creation is an idempotent one-time action for this item.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseItemId, item.progress.length]);

  const vocabularyActions = (setId: string) =>
    `/learn/vocabulary/${setId}?source=${courseItemId}`;
  const requirementActions: LearningRequirementAction[] = material
    ? material.requiredActivities.map((activity) => ({
        id: activity.id,
        type: activity.type,
        title: activity.title,
        href:
          activity.type === "VOCABULARY_SET"
            ? vocabularyActions(activity.resourceId)
            : `/learn/${courseId}/items/${activity.courseItemId}`,
      }))
    : vocabulary
      ? [
          {
            id: vocabulary.id,
            type: "VOCABULARY_SET",
            title: vocabulary.title,
            href: vocabularyActions(vocabulary.id),
          },
        ]
      : [];
  const footer = (
    <CourseLearningFooter
      key={courseItemId}
      courseId={courseId}
      courseItemId={courseItemId}
      requirementActions={requirementActions}
    />
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <nav className="flex items-center justify-between gap-3">
        <Link
          href={`/learn/${courseId}`}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "text-muted-foreground -ml-2",
          )}
        >
          <ArrowLeftIcon /> Kembali ke kursus
        </Link>
        <Link
          href="/learn"
          aria-label="Buka Hari Ini"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <HouseIcon />
        </Link>
      </nav>

      {material ? (
        <>
          <DynamicLearnerBlockNoteDocument
            content={material.content as HakgyoPartialBlock[]}
            resources={item.embeddedResources}
            theme={resolvedTheme === "dark" ? "dark" : "light"}
          />
          <div className="border-border mt-6 border-t pt-8">{footer}</div>
        </>
      ) : vocabulary ? (
        <VocabularySetDetail
          courseId={courseId}
          courseItemId={courseItemId}
          vocabulary={vocabulary}
          footer={footer}
        />
      ) : (
        <p className="text-muted-foreground py-16 text-center text-sm">
          Aktivitas ini belum tersedia.
        </p>
      )}
    </div>
  );
}
