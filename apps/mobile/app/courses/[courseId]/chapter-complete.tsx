import { HANGEUL_MASTERY_COURSE_ID } from "@hakgyo/shared/hangeul";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HangeulMasteryBadge } from "../../../src/components/hangeul-mastery-medal";
import { HeroTile } from "../../../src/components/hero-tile";
import { HakgyoHero } from "../../../src/components/learn/hakgyo-hero";
import {
  HeroMark,
  HeroMarkValue,
  HeroTitle,
} from "../../../src/components/learn/hero-parts";
import {
  Action,
  Eyebrow,
  FullScreenState,
  ProgressBar,
} from "../../../src/components/learning-ui";
import { authClient } from "../../../src/lib/auth-client";
import {
  chapterCelebrated,
  markChapterCelebrated,
} from "../../../src/lib/chapter-celebrations";
import { getCourseResumeItem } from "../../../src/lib/course-learning-path";
import { hangeulCompletionBadgeCopy } from "../../../src/lib/hangeul-visibility";
import { openCourseItem } from "../../../src/lib/navigation";
import { firstParam } from "../../../src/lib/route-params";
import { useHangeulBadgeState } from "../../../src/lib/use-cohort-archive";
import { useCourseOutline } from "../../../src/sync/hooks";

type OutlineItem = {
  type?: "MATERIAL" | "VOCABULARY_SET" | "ASSESSMENT";
  attempt?: { score: number | null; maxScore: number | null } | null;
};

/** What a chapter holds, in a short line: "2 materi · 1 kosakata · 1 tugas". */
function chapterContents(items: readonly OutlineItem[]) {
  const count = (type: OutlineItem["type"]) =>
    items.filter((item) => item.type === type).length;
  return [
    [count("MATERIAL"), "materi"],
    [count("VOCABULARY_SET"), "kosakata"],
    [count("ASSESSMENT"), "tugas"],
  ].filter(([n]) => (n as number) > 0) as [number, string][];
}

/** The last graded tugas score of the chapter, as a percentage. */
function chapterScore(items: readonly OutlineItem[]) {
  const graded = items
    .filter((item) => item.type === "ASSESSMENT")
    .map((item) => item.attempt)
    .filter(
      (attempt): attempt is { score: number; maxScore: number } =>
        attempt?.score != null &&
        attempt.maxScore != null &&
        attempt.maxScore > 0,
    );
  const last = graded.at(-1);
  return last ? Math.round((last.score / last.maxScore) * 100) : null;
}

/**
 * "Bab selesai": a sheet over the activity that finished its chapter, in
 * the look of a tugas result. The chapter card with a green
 * check (and confetti the first time), what the chapter held, how far the
 * course is, and the chapter it opened. Finishing the last chapter shows the
 * course as done instead, with the Hangeul Mastery badge for that course.
 */
export default function ChapterCompleteScreen() {
  const params = useLocalSearchParams<{
    courseId: string | string[];
    moduleId: string | string[];
  }>();
  const courseId = firstParam(params.courseId);
  const moduleId = firstParam(params.moduleId);
  const outline = useCourseOutline(courseId);
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;
  const hangeulBadge = useHangeulBadgeState();
  const insets = useSafeAreaInsets();

  // The confetti plays the first time this chapter is shown.
  const [celebrate, setCelebrate] = useState(false);
  const checked = useRef(false);
  useEffect(() => {
    if (checked.current || !userId || !moduleId) return;
    checked.current = true;
    if (!chapterCelebrated(userId, moduleId)) {
      markChapterCelebrated(userId, moduleId);
      setCelebrate(true);
    }
  }, [moduleId, userId]);

  const course = outline.data;
  const moduleIndex =
    course?.modules.findIndex((module) => module.id === moduleId) ?? -1;
  const module = course?.modules[moduleIndex];
  if (!course || !module) {
    return outline.isPending ? (
      <FullScreenState kind="loading" message="Memuat bab…" />
    ) : (
      <FullScreenState
        kind="error"
        title="Bab tidak ditemukan"
        onBack={() => router.back()}
      />
    );
  }

  const totalModules = course.modules.length;
  const doneModules = course.modules.filter(
    (entry) => entry.isCompleted,
  ).length;
  const courseCompleted =
    totalModules > 0 && course.modules.every((entry) => entry.isCompleted);
  const contents = chapterContents(module.items);
  const score = chapterScore(module.items);
  const nextModule = courseCompleted
    ? undefined
    : (course.modules
        .slice(moduleIndex + 1)
        .find((entry) => entry.access !== "LOCKED" && !entry.isCompleted) ??
      course.modules.find(
        (entry) => entry.access !== "LOCKED" && !entry.isCompleted,
      ));
  const nextModuleIndex = nextModule
    ? course.modules.findIndex((entry) => entry.id === nextModule.id)
    : -1;
  const resumeItem = getCourseResumeItem(course);
  // The sheet sits over the activity that finished the chapter: close it,
  // then put the next place in that activity's stead.
  const toCourse = () => {
    router.back();
    router.replace({ pathname: "/courses/[courseId]", params: { courseId } });
  };

  return (
    <View
      className="gap-4 px-5"
      style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
    >
      <HakgyoHero inSheet>
        <HeroMark
          done
          celebrate={celebrate}
          face={
            <>
              <Eyebrow>{courseCompleted ? "Kurikulum" : "Bab"}</Eyebrow>
              <HeroMarkValue
                value={String(courseCompleted ? totalModules : moduleIndex + 1)}
              />
            </>
          }
        />
        <HeroTitle
          eyebrow={courseCompleted ? "Kurikulum selesai" : "Bab selesai"}
          title={
            courseCompleted
              ? "Kamu berhasil!"
              : `Mantap, Bab ${moduleIndex + 1} selesai!`
          }
          description={courseCompleted ? course.title : module.title}
        />
        {!courseCompleted && (contents.length > 0 || score !== null) ? (
          <View className="flex-row gap-2">
            {contents.map(([n, label]) => (
              <Stat key={label} value={String(n)} label={label} />
            ))}
            {score !== null ? (
              <Stat value={`${score}%`} label="nilai tugas" />
            ) : null}
          </View>
        ) : null}
        <View className="gap-1.5">
          <View className="flex-row justify-between gap-3">
            <Text
              className="flex-1 text-xs text-muted-foreground"
              numberOfLines={1}
            >
              {course.title}
            </Text>
            <Text className="text-xs tabular-nums text-muted-foreground">
              {doneModules} dari {totalModules} bab
            </Text>
          </View>
          <ProgressBar
            accessibilityLabel={`${doneModules} dari ${totalModules} bab selesai`}
            max={totalModules}
            value={doneModules}
          />
        </View>
      </HakgyoHero>

      {courseCompleted && courseId === HANGEUL_MASTERY_COURSE_ID ? (
        <HangeulMasteryBadge {...hangeulCompletionBadgeCopy(hangeulBadge)} />
      ) : null}

      {nextModule ? (
        <HeroTile
          eyebrow={`Terbuka · Bab ${nextModuleIndex + 1}`}
          title={nextModule.title}
          meta={
            chapterContents(nextModule.items)
              .map(([n, label]) => `${n} ${label}`)
              .join(" · ") || "Bab berikutnya"
          }
          pill="Lanjutkan"
          onPress={() => {
            const first =
              nextModule.items.find((item) => !item.isCompleted) ?? resumeItem;
            if (!first) return toCourse();
            router.back();
            openCourseItem(
              { courseId, courseItemId: first.id, attempt: first.attempt },
              { replace: true },
            );
          }}
        />
      ) : null}
      <Action variant={nextModule ? "ghost" : "primary"} onPress={toCourse}>
        {courseCompleted ? "Lihat kurikulum" : "Kembali ke kurikulum"}
      </Action>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 items-center rounded-2xl border border-border bg-card px-1 py-2.5">
      <Text className="text-base font-black tabular-nums text-foreground">
        {value}
      </Text>
      <Text className="text-[11px] text-muted-foreground">{label}</Text>
    </View>
  );
}
