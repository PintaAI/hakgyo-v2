import type { ReactNode } from "react";
import { LockIcon } from "lucide-react";

import {
  assessmentAttemptPresentation,
  type LearnerAttemptStatus,
} from "~/lib/learner/assessment-state";
import {
  getCourseResumeItem,
  type LearningPathCourse,
} from "~/lib/learner/course-learning-path";
import { learningItemHref } from "~/lib/learner/hrefs";
import { cn } from "~/lib/utils";
import { LearningItemRow } from "./learning-item-row";

const itemLabels = {
  MATERIAL: "Materi",
  ASSESSMENT: "Tugas",
  VOCABULARY_SET: "Kosakata",
} as const;

type OutlineItem = LearningPathCourse["modules"][number]["items"][number] & {
  type: keyof typeof itemLabels;
  attempt?: {
    id: string;
    status: LearnerAttemptStatus;
    score: number | null;
    maxScore: number | null;
  } | null;
};
type OutlineModule = Omit<LearningPathCourse["modules"][number], "items"> & {
  description?: string | null;
  items: OutlineItem[];
};

export function CourseOutlineList({
  courseId,
  modules,
  currentItemId,
  showHeader = true,
  showActiveState = true,
  header,
}: {
  courseId: string;
  modules: OutlineModule[];
  currentItemId?: string;
  showHeader?: boolean;
  showActiveState?: boolean;
  header?: ReactNode;
}) {
  const resumeItem = getCourseResumeItem({ modules });

  return (
    <div className="flex flex-col gap-5">
      {showHeader ? (
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold">{header ?? "Materi kursus"}</h2>
          <span className="text-muted-foreground text-xs font-semibold">
            {modules.length} bab
          </span>
        </div>
      ) : null}

      {modules.length === 0 ? (
        <div className="border-border flex flex-col items-center border-y px-6 py-10 text-center">
          <p className="font-bold">Belum ada materi</p>
          <p className="text-muted-foreground mt-2 text-sm">
            Bab yang dipublikasikan akan muncul di sini.
          </p>
        </div>
      ) : (
        modules.map((module, moduleIndex) => {
          const locked = module.access === "LOCKED";
          const done = module.items.filter((item) => item.isCompleted).length;
          return (
            <section
              key={module.id}
              aria-label={module.title}
              className={cn(
                moduleIndex > 0 && "border-border border-t pt-6",
                locked && "opacity-60",
              )}
            >
              <div
                className={cn(
                  "flex gap-3",
                  locked || module.description ? "items-start" : "items-center",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-md border text-xs font-bold tabular-nums",
                    module.isCompleted
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground",
                  )}
                >
                  {String(moduleIndex + 1).padStart(2, "0")}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <h3 className="truncate text-base font-bold">
                    {module.title}
                  </h3>
                  {/* One line only, so long descriptions never push the row. */}
                  {locked || module.description ? (
                    <p className="text-muted-foreground truncate text-sm">
                      {locked
                        ? "Selesaikan bab sebelumnya dulu."
                        : module.description}
                    </p>
                  ) : null}
                </div>
                {locked ? (
                  <LockIcon
                    className="text-muted-foreground mt-1 size-4 shrink-0"
                    aria-label="Terkunci"
                  />
                ) : (
                  <span className="text-muted-foreground shrink-0 pt-1 text-[10px] font-bold tracking-[1px] uppercase">
                    {module.isCompleted
                      ? "Selesai"
                      : `${done}/${module.items.length} selesai`}
                  </span>
                )}
              </div>

              {module.items.length === 0 ? (
                <p className="text-muted-foreground py-5 pl-12 text-sm">
                  Belum ada aktivitas di bab ini.
                </p>
              ) : (
                <ol className="relative mt-6 ml-3">
                  <span
                    aria-hidden
                    className="border-border absolute -top-6 -left-1 h-10 w-2 rounded-bl-lg border-b-2 border-l-2"
                  />
                  {module.items.map((item, itemIndex) => {
                    const attempt =
                      item.type === "ASSESSMENT" ? item.attempt : undefined;
                    const assessmentState =
                      item.type === "ASSESSMENT"
                        ? assessmentAttemptPresentation(attempt ?? undefined)
                        : undefined;
                    const isCurrent = item.id === currentItemId;
                    const isNext = !currentItemId && item.id === resumeItem?.id;
                    // Locked rows already show a lock, so they carry no status.
                    const status = locked
                      ? undefined
                      : (assessmentState?.detail ??
                        (item.isCompleted
                          ? "Selesai"
                          : isNext
                            ? "Berikutnya"
                            : "Siap"));
                    return (
                      <LearningItemRow
                        key={item.id}
                        title={item.title}
                        type={item.type}
                        typeLabel={itemLabels[item.type]}
                        statusText={
                          status &&
                          `${status}${attempt && assessmentState?.action ? ` · ${assessmentState.action}` : ""}`
                        }
                        completed={item.isCompleted}
                        locked={locked}
                        highlighted={Boolean(
                          showActiveState && (isCurrent || isNext),
                        )}
                        isLast={itemIndex === module.items.length - 1}
                        showChevron={!locked && !isCurrent}
                        href={learningItemHref(courseId, item.id, attempt)}
                      />
                    );
                  })}
                </ol>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
