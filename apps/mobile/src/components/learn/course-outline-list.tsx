import { Text, View } from "react-native";

import {
  assessmentAttemptPresentation,
  latestStandaloneAttemptForItem,
} from "../../lib/assessment-state";
import { getCourseResumeItem } from "../../lib/course-learning-path";
import { authClient } from "../../lib/auth-client";
import { api } from "../../lib/trpc";
import { QueryState } from "../learning-ui";
import { LearningItemRow } from "./learning-item-row";

const itemLabels = {
  MATERIAL: "Materi",
  ASSESSMENT: "Tugas",
  VOCABULARY_SET: "Kosa-kata",
} as const;

export function CourseOutlineList({
  courseId,
  currentItemId,
  onOpenItem,
  showHeader = true,
  showActiveState = true,
}: {
  courseId: string;
  currentItemId?: string;
  onOpenItem: (
    item: { id: string },
    attempt:
      | {
          id: string;
          status: "IN_PROGRESS" | "SUBMITTED" | "IN_REVIEW" | "GRADED";
        }
      | undefined,
  ) => void;
  showHeader?: boolean;
  showActiveState?: boolean;
}) {
  const { data: session } = authClient.useSession();
  const outlineQuery = api.learning.getCourseOutline.useQuery(
    { courseId },
    { enabled: Boolean(session && courseId), retry: false },
  );
  const attemptsQuery = api.assessment.listMyAttempts.useQuery(undefined, {
    enabled: Boolean(session && courseId),
    retry: false,
  });
  const course = outlineQuery.data;
  const resumeItem = course && getCourseResumeItem(course);
  const courseAttempts = attemptsQuery.data?.filter(
    (attempt) => attempt.courseItem.module.courseId === courseId,
  );

  if (outlineQuery.isPending || !course) {
    return (
      <QueryState
        pending={outlineQuery.isPending}
        error={outlineQuery.error}
        retry={() => void outlineQuery.refetch()}
      />
    );
  }

  return (
    <View className="gap-5">
      {showHeader ? (
        <View className="flex-row items-center justify-between gap-4">
          <Text className="text-xl font-bold text-foreground">
            Course materials
          </Text>
          <Text className="text-xs font-semibold text-muted-foreground">
            {course.modules.length} modules
          </Text>
        </View>
      ) : null}

      {course.modules.length === 0 ? (
        <View className="items-center border-y border-border px-6 py-10">
          <Text className="text-base font-bold text-foreground">
            No materials yet
          </Text>
          <Text className="mt-2 text-center text-sm leading-5 text-muted-foreground">
            Published modules will appear here.
          </Text>
        </View>
      ) : (
        course.modules.map((module, moduleIndex) => {
          const locked = module.access === "LOCKED";

          return (
            <View
              className={`${moduleIndex > 0 ? "border-t border-border pt-6" : ""} ${locked ? "opacity-60" : ""}`}
              key={module.id}
            >
              <View className="flex-row items-start gap-3">
                <View
                  className={`size-9 items-center justify-center rounded-md border ${module.isCompleted ? "border-primary bg-primary" : "border-border bg-background"}`}
                >
                  <Text
                    className={`text-xs font-bold tabular-nums ${module.isCompleted ? "text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    {String(moduleIndex + 1).padStart(2, "0")}
                  </Text>
                </View>
                <View className="min-w-0 flex-1 gap-1">
                  <Text
                    className="text-base font-bold text-foreground"
                    numberOfLines={1}
                  >
                    {module.title}
                  </Text>
                  {locked ? (
                    <Text className="text-xs leading-5 text-muted-foreground">
                      Complete the previous modules to unlock.
                    </Text>
                  ) : null}
                  {module.description ? (
                    <Text
                      className="text-sm leading-5 text-muted-foreground"
                      numberOfLines={2}
                    >
                      {module.description}
                    </Text>
                  ) : null}
                </View>
                <Text className="pt-1 text-[10px] font-bold uppercase tracking-[1px] text-muted-foreground">
                  {module.isCompleted
                    ? "Completed"
                    : locked
                      ? "Locked"
                      : `${module.items.filter((item) => item.isCompleted).length}/${module.items.length} done`}
                </Text>
              </View>

              {module.items.length === 0 ? (
                <Text className="py-5 pl-12 text-sm text-muted-foreground">
                  No activities in this module.
                </Text>
              ) : (
                <View className="relative ml-3 mt-6">
                  <View className="absolute -left-1 -top-6 h-10 w-2 rounded-bl-lg border-l border-b border-border" />
                  {module.items.map((item, itemIndex) => {
                    const attempt =
                      item.type === "ASSESSMENT"
                        ? latestStandaloneAttemptForItem(
                            courseAttempts,
                            item.id,
                          )
                        : undefined;
                    const assessmentState =
                      item.type === "ASSESSMENT"
                        ? assessmentAttemptPresentation(attempt)
                        : undefined;
                    const isLast = itemIndex === module.items.length - 1;
                    const isCurrent = item.id === currentItemId;
                    const isNext = !currentItemId && item.id === resumeItem?.id;
                    const status = locked
                      ? "Locked"
                      : (assessmentState?.detail ??
                        (item.isCompleted
                          ? "Completed"
                          : isNext
                            ? "Up next"
                            : "Ready"));

                    return (
                      <LearningItemRow
                        key={item.id}
                        title={item.title}
                        type={item.type}
                        typeLabel={itemLabels[item.type]}
                        statusText={`${status}${attempt && assessmentState?.action ? ` · ${assessmentState.action}` : ""}`}
                        completed={item.isCompleted}
                        locked={locked}
                        highlighted={Boolean(
                          showActiveState && (isCurrent || isNext),
                        )}
                        isLast={isLast}
                        showChevron={!locked && !isCurrent}
                        onPress={() => onOpenItem(item, attempt)}
                        disabled={locked}
                        accessibilityHint={assessmentState?.action}
                      />
                    );
                  })}
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}
