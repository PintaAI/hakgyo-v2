import { router } from "expo-router";
import { canOpenModule } from "../lib/study";
import { useCourseOutline } from "../sync/hooks";
import { Empty, QueryState, Row } from "./learning-ui";

export function CourseActivities({
  courseId,
  practice = false,
  nextOnly = false,
}: {
  courseId: string;
  practice?: boolean;
  nextOnly?: boolean;
}) {
  const query = useCourseOutline(courseId);
  const items =
    query.data?.modules.flatMap((module) =>
      module.items.map((item) => ({
        ...item,
        available: canOpenModule(module.access),
        module: module.title,
      })),
    ) ?? [];
  const matching = items.filter(
    (item) =>
      (!practice || item.type !== "MATERIAL") &&
      (!nextOnly || (item.available && !item.isCompleted)),
  );
  const visible = nextOnly ? matching.slice(0, 1) : matching;
  return (
    <>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data && visible.length === 0 ? (
        <Empty>
          {nextOnly
            ? "No unlocked activities to continue."
            : "No practice activities published yet."}
        </Empty>
      ) : null}
      {visible.map((item) => (
        <Row
          key={item.id}
          title={item.title}
          disabled={!item.available}
          detail={`${item.isCompleted ? "Completed · " : ""}${item.type === "VOCABULARY_SET" ? "Vocabulary" : item.type === "ASSESSMENT" ? "Assessment" : "Lesson"} · ${item.module}`}
          onPress={() => {
            if (
              item.type === "ASSESSMENT" &&
              item.attempt?.status === "IN_PROGRESS"
            ) {
              router.push({
                pathname:
                  "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]",
                params: {
                  courseId,
                  courseItemId: item.id,
                  attemptId: item.attempt.id,
                },
              });
              return;
            }
            router.push({
              pathname: "/courses/[courseId]/items/[courseItemId]",
              params: { courseId, courseItemId: item.id },
            });
          }}
        />
      ))}
    </>
  );
}
