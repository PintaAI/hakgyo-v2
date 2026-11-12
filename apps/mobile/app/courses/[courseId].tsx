import { HANGEUL_MASTERY_COURSE_ID } from "@hakgyo/shared/hangeul";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";

import { HeroTile } from "../../src/components/hero-tile";
import { HakgyoHero } from "../../src/components/learn/hakgyo-hero";
import {
  FactChips,
  HeroMark,
  HeroMarkValue,
  HeroTitle,
} from "../../src/components/learn/hero-parts";
import { FullScreenState, StudyScreen } from "../../src/components/learning-ui";
import { HangeulMasteryBadge } from "../../src/components/hangeul-mastery-medal";
import { CourseOutlineList } from "../../src/components/learn/course-outline-list";
import { CourseOfflineCard } from "../../src/components/offline-download";
import { openCourseItem } from "../../src/lib/navigation";
import { getCourseResumeItem } from "../../src/lib/course-learning-path";
import { authClient } from "../../src/lib/auth-client";
import { hangeulCompletionBadgeCopy } from "../../src/lib/hangeul-visibility";
import { useHangeulBadgeState } from "../../src/lib/use-cohort-archive";
import { useCourseOfflineMedia, useCourseOutline } from "../../src/sync/hooks";
import { firstParam } from "../../src/lib/route-params";

export default function CourseDetailScreen() {
  const params = useLocalSearchParams<{ courseId: string | string[] }>();
  const courseId = firstParam(params.courseId);
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const isHangeulCourse = courseId === HANGEUL_MASTERY_COURSE_ID;
  // The badge copy once the course is finished: claim, archived or shown.
  const hangeulBadge = useHangeulBadgeState();
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

  const resumeModuleIndex = resumeItem
    ? course.modules.findIndex((module) =>
        module.items.some((item) => item.id === resumeItem.id),
      )
    : -1;
  const resumeModule = course.modules[resumeModuleIndex];
  const courseCompleted =
    allItems.length > 0 && completedCount === allItems.length;
  const percent = allItems.length
    ? Math.round((completedCount / allItems.length) * 100)
    : 0;

  return (
    <StudyScreen
      bleedTop
      contentClassName="gap-6"
      contentInsetAdjustmentBehavior="never"
      headerShown={false}
      title=""
    >
      <HakgyoHero inSheet onClose={goBack} closeLabel="Tutup kurikulum">
        <HeroMark
          done={courseCompleted}
          face={<HeroMarkValue value={`${percent}%`} label="selesai" />}
        />
        <HeroTitle
          eyebrow={course.organization.name}
          title={course.title}
          description={course.description}
        />
        <FactChips
          facts={[
            {
              icon: courseCompleted ? "trophy.fill" : "checkmark.circle.fill",
              text: courseCompleted
                ? "Kurikulum selesai"
                : `${completedCount} dari ${allItems.length} selesai`,
            },
            { icon: "book.closed.fill", text: `${course.modules.length} bab` },
          ]}
        />
      </HakgyoHero>

      {resumeItem ? (
        <HeroTile
          eyebrow={completedCount ? "Lanjutkan belajar" : "Mulai belajar"}
          title={resumeItem.title}
          meta={
            resumeModule
              ? `Bab ${resumeModuleIndex + 1} · ${resumeModule.title}`
              : course.title
          }
          pill={completedCount ? "Lanjutkan" : "Mulai"}
          accessibilityHint={`Buka ${resumeItem.title}`}
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
        />
      ) : null}

      {isHangeulCourse && !resumeItem && courseCompleted ? (
        <HangeulMasteryBadge {...hangeulCompletionBadgeCopy(hangeulBadge)} />
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
