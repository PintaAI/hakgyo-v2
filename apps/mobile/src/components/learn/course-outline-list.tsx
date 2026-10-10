import { SymbolView } from "expo-symbols";
import { Text, View } from "react-native";

import {
  assessmentAttemptPresentation,
  latestStandaloneAttemptForItem,
} from "../../lib/assessment-state";
import { getCourseResumeItem } from "../../lib/course-learning-path";
import { authClient } from "../../lib/auth-client";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { useSidebarIndicators } from "../../lib/sidebar-indicators";
import {
  useCourseOutline,
  useSyncIndex,
  type CourseOfflineMedia,
} from "../../sync/hooks";
import { QueryState } from "../learning-ui";
import { ModuleOfflineBadge } from "../offline-download";
import { LearningItemRow } from "./learning-item-row";

const itemLabels = {
  MATERIAL: "Materi",
  ASSESSMENT: "Tugas",
  VOCABULARY_SET: "Kosakata",
} as const;

export function CourseOutlineList({
  courseId,
  currentItemId,
  onOpenItem,
  showHeader = true,
  showActiveState = true,
  offlineMedia,
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
  /** Shows each open chapter's offline state and a download button. */
  offlineMedia?: CourseOfflineMedia | null;
}) {
  const { data: session } = authClient.useSession();
  const { activeOrganizationId, colors } = useAppTheme();
  const { indicator, markEntitySeen } = useSidebarIndicators();
  const dashboard = useSyncIndex(activeOrganizationId);
  const outlineQuery = useCourseOutline(courseId, {
    enabled: Boolean(session && courseId),
  });
  const course = outlineQuery.data;
  const resumeItem = course && getCourseResumeItem(course);
  const courseAttempts = dashboard.data?.attempts.filter(
    (attempt) => attempt.courseItem.module.courseId === courseId,
  );

  if (!course) {
    return (
      <QueryState
        pending={outlineQuery.isPending}
        error={outlineQuery.error}
        retry={() => {
          void dashboard.refetch();
          void outlineQuery.refetch();
        }}
      />
    );
  }

  return (
    <View className="gap-5">
      {showHeader ? (
        <View className="flex-row items-center justify-between gap-4">
          <Text className="text-xl font-bold text-foreground">
            Materi kurikulum
          </Text>
          <Text className="text-xs font-semibold text-muted-foreground">
            {course.modules.length} bab
          </Text>
        </View>
      ) : null}

      {course.modules.length === 0 ? (
        <View className="items-center border-y border-border px-6 py-10">
          <Text className="text-base font-bold text-foreground">
            Belum ada materi
          </Text>
          <Text className="mt-2 text-center text-sm leading-5 text-muted-foreground">
            Bab yang dipublikasikan akan muncul di sini.
          </Text>
        </View>
      ) : (
        course.modules.map((module, moduleIndex) => {
          const locked = module.access === "LOCKED";
          const hasSubtitle = locked || !!module.description;
          const unread = indicator("MODULE", module.id)?.unread ?? false;

          return (
            <View
              className={`${moduleIndex > 0 ? "border-t border-border pt-6" : ""} ${locked ? "opacity-60" : ""}`}
              key={module.id}
            >
              <View
                className={`flex-row gap-3 ${hasSubtitle ? "items-start" : "items-center"}`}
              >
                <View
                  className={`size-9 items-center justify-center rounded-md border ${module.isCompleted ? "border-primary bg-primary" : "border-border bg-background"}`}
                >
                  <Text
                    className={`text-xs font-bold tabular-nums ${module.isCompleted ? "text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    {String(moduleIndex + 1).padStart(2, "0")}
                  </Text>
                </View>
                <View
                  className={`min-w-0 flex-1 ${hasSubtitle ? "gap-1" : ""}`}
                >
                  <Text
                    className="text-base font-bold text-foreground"
                    numberOfLines={1}
                  >
                    {module.title}
                  </Text>
                  {/* One line only, so long descriptions never push the row. */}
                  {hasSubtitle ? (
                    <Text
                      className="text-sm leading-5 text-muted-foreground"
                      numberOfLines={1}
                    >
                      {locked
                        ? "Selesaikan bab sebelumnya dulu."
                        : module.description}
                    </Text>
                  ) : null}
                </View>
                <View
                  className={`${hasSubtitle ? "pt-1" : ""} items-end gap-1`}
                >
                  {unread ? (
                    <View className="rounded-full bg-destructive px-1.5 py-0.5">
                      <Text className="text-[10px] font-bold text-destructive-foreground">
                        Baru
                      </Text>
                    </View>
                  ) : null}
                  {locked ? (
                    <SymbolView
                      accessibilityLabel="Terkunci"
                      fallback={
                        <Text className="text-xs text-muted-foreground">
                          🔒
                        </Text>
                      }
                      name="lock.fill"
                      size={14}
                      tintColor={colors.mutedForeground}
                    />
                  ) : (
                    <Text className="text-[10px] font-bold uppercase tracking-[1px] text-muted-foreground">
                      {module.isCompleted
                        ? "Selesai"
                        : `${module.items.filter((item) => item.isCompleted).length}/${module.items.length} selesai`}
                    </Text>
                  )}
                  {!locked && offlineMedia ? (
                    <ModuleOfflineBadge
                      moduleId={module.id}
                      assetIds={
                        offlineMedia.modules.find(
                          (entry) => entry.moduleId === module.id,
                        )?.assetIds ?? []
                      }
                      sizes={offlineMedia.sizes}
                    />
                  ) : null}
                </View>
              </View>

              {module.items.length === 0 ? (
                <Text className="py-5 pl-12 text-sm text-muted-foreground">
                  Belum ada aktivitas di bab ini.
                </Text>
              ) : (
                <View className="relative ml-3 mt-6">
                  <View className="absolute -left-1 -top-6 h-10 w-2 rounded-bl-lg border-b-2 border-l-2 border-border" />
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
                        isLast={isLast}
                        showChevron={!locked && !isCurrent}
                        onPress={() => {
                          markEntitySeen("MODULE", module.id);
                          onOpenItem(item, attempt);
                        }}
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
