import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  Card,
  Eyebrow,
  FullBleed,
  FullScreenState,
  ProgressBar,
  StudyScreen,
  TintedAction,
} from "../../src/components/learning-ui";
import { CourseOutlineList } from "../../src/components/learn/course-outline-list";
import { CourseOfflineCard } from "../../src/components/offline-download";
import { openCourseItem } from "../../src/lib/navigation";
import { getCourseResumeItem } from "../../src/lib/course-learning-path";
import { authClient } from "../../src/lib/auth-client";
import { useAppTheme } from "../../src/providers/AppThemeProvider";
import { useCourseOfflineMedia, useCourseOutline } from "../../src/sync/hooks";
import { withOpacity } from "../../src/theme/colors";
import { firstParam } from "../../src/lib/route-params";

export default function CourseDetailScreen() {
  const params = useLocalSearchParams<{ courseId: string | string[] }>();
  const courseId = firstParam(params.courseId);
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const { colors } = useAppTheme();
  // Local bundle + learner index; online only when the bundle is missing.
  const courseQuery = useCourseOutline(courseId, {
    enabled: Boolean(session && courseId),
  });

  useEffect(() => {
    if (!isSessionPending && !session && courseId) {
      router.replace({
        pathname: "/auth",
        params: { redirectTo: `/courses/${encodeURIComponent(courseId)}` },
      });
    }
  }, [courseId, isSessionPending, session]);

  const course = courseQuery.data;
  const offlineMedia = useCourseOfflineMedia(courseId);
  // Only chapters the learner can open: locked ones cannot be signed for download yet.
  const openModuleIds = new Set(
    course?.modules
      .filter((module) => module.access !== "LOCKED")
      .map((module) => module.id) ?? [],
  );
  const offlineAssetIds =
    offlineMedia?.modules
      .filter((entry) => openModuleIds.has(entry.moduleId))
      .flatMap((entry) => entry.assetIds) ?? [];
  const resumeItem = course && getCourseResumeItem(course);
  const allItems = course?.modules.flatMap((module) => module.items) ?? [];
  const completedCount = allItems.filter((item) => item.isCompleted).length;

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(home)/(tabs)/home");
  };

  if (isSessionPending || (!session && Boolean(courseId))) {
    return <FullScreenState kind="loading" message="Membuka kurikulum kamu…" />;
  }
  if (courseQuery.isPending && !course) {
    return <FullScreenState kind="loading" message="Memuat kurikulum…" />;
  }
  if (courseQuery.error || !course) {
    return (
      <FullScreenState
        kind="error"
        message="Akses kamu mungkin sudah berakhir, atau kurikulum ini tidak lagi dipublikasikan."
        onBack={goBack}
        onRetry={() => void courseQuery.refetch()}
        title="Kurikulum tidak tersedia"
      />
    );
  }

  return (
    <StudyScreen
      bleedTop
      contentClassName="gap-8"
      contentInsetAdjustmentBehavior="never"
      headerShown={false}
      title=""
    >
      <FullBleed>
        <View className="overflow-hidden bg-muted">
          {course.thumbnailUrl ? (
            <>
              <Image
                accessibilityIgnoresInvertColors
                blurRadius={5}
                cachePolicy="memory-disk"
                className="absolute inset-0 z-0 h-full w-full"
                contentFit="cover"
                source={{ uri: course.thumbnailUrl }}
                style={StyleSheet.absoluteFill}
                transition={0}
              />
              <View
                className="absolute inset-0 z-10"
                style={{
                  backgroundColor: withOpacity(colors.background, 0.72),
                }}
              />
            </>
          ) : null}
          <View className="relative z-20 justify-end gap-2 px-5 pb-6 pt-6">
            <View className="gap-2">
              <Eyebrow size="md" className="text-center">
                {course.organization.name}
              </Eyebrow>
              <Text className="text-3xl font-black leading-9 tracking-tight text-foreground">
                {course.title}
              </Text>
              {course.description ? (
                <Text
                  className="text-sm leading-5 text-muted-foreground"
                  numberOfLines={3}
                >
                  {course.description}
                </Text>
              ) : null}
              <Text className="mt-1 text-xs font-semibold text-muted-foreground">
                {completedCount} dari {allItems.length} selesai
              </Text>
            </View>
          </View>
          <ProgressBar
            className="absolute bottom-0 left-0 right-0 z-30"
            max={allItems.length}
            size="sm"
            value={completedCount}
          />
        </View>
      </FullBleed>

      {resumeItem ? (
        <TintedAction
          accessibilityHint={`Buka ${resumeItem.title}`}
          eyebrow={completedCount ? "Lanjutkan belajar" : "Mulai belajar"}
          onPress={() =>
            openCourseItem(
              {
                courseId,
                courseItemId: resumeItem.id,
                attempt: resumeItem.attempt,
              },
              { replace: true },
            )
          }
          title={resumeItem.title}
        />
      ) : allItems.length > 0 && completedCount === allItems.length ? (
        <Card className="gap-2 p-5" tone="primary">
          <Text className="text-xl font-black text-foreground">
            🏆 Kurikulum selesai!
          </Text>
          <Text className="text-sm leading-6 text-muted-foreground">
            Kamu berhasil! Semua aktivitas sudah selesai — buka lagi materi di
            bawah kapan pun kamu ingin mengulang.
          </Text>
        </Card>
      ) : null}

      {offlineMedia ? (
        <CourseOfflineCard
          assetIds={offlineAssetIds}
          courseId={courseId}
          sizes={offlineMedia.sizes}
        />
      ) : null}

      <CourseOutlineList
        courseId={courseId}
        offlineMedia={offlineMedia}
        onOpenItem={(item, attempt) =>
          // Replace (not push) a plain item so it renders as a full-screen
          // card instead of inside the course formSheet. Trade-off: no back
          // stack to the course outline. A started attempt is pushed.
          openCourseItem(
            { courseId, courseItemId: item.id, attempt },
            { replace: attempt?.status !== "IN_PROGRESS" },
          )
        }
        showActiveState={false}
      />
    </StudyScreen>
  );
}
