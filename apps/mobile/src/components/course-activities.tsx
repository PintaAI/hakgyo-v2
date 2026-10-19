import { openCourseItem } from "../lib/navigation";
import { canOpenModule } from "../lib/study";
import { useCourseOutline } from "../sync/hooks";
import { Empty, QueryState, Row } from "./learning-ui";
import { getLearningItemTypeMeta } from "../lib/learning-item-type";

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
            ? "Belum ada aktivitas terbuka untuk dilanjutkan."
            : "Belum ada aktivitas latihan yang dipublikasikan."}
        </Empty>
      ) : null}
      {visible.map((item) => (
        <Row
          key={item.id}
          title={item.title}
          disabled={!item.available}
          detail={`${item.isCompleted ? "Selesai · " : ""}${getLearningItemTypeMeta(item.type).label} · ${item.module}`}
          onPress={() =>
            openCourseItem({
              courseId,
              courseItemId: item.id,
              attempt: item.attempt,
            })
          }
        />
      ))}
    </>
  );
}
