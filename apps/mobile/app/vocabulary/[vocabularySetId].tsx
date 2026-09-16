import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Gesture } from "react-native-gesture-handler";
import {
  CourseLearningFooter,
  type LearningRequirementAction,
} from "../../src/components/learn/course-learning-footer";
import type { LearningPathCourse } from "../../src/lib/course-learning-path";
import { Text } from "react-native";
import { api } from "../../src/lib/trpc";
import { authClient } from "../../src/lib/auth-client";
import {
  Empty,
  QueryState,
  StudyScreen,
} from "../../src/components/learning-ui";
import { VocabularySession } from "../../src/components/vocabulary-session";

export default function VocabularyPracticeScreen() {
  const [scrollGesture] = useState(() => Gesture.Native());
  const [roundActive, setRoundActive] = useState(false);
  const { vocabularySetId, sourceCourseItemId, courseId } =
    useLocalSearchParams<{
      vocabularySetId: string;
      sourceCourseItemId: string;
      courseId?: string;
    }>();
  const { data: session } = authClient.useSession();
  const query = api.learning.getVocabularyPractice.useQuery(
    { vocabularySetId, sourceCourseItemId },
    { enabled: !!(vocabularySetId && sourceCourseItemId && session) },
  );
  const sourceItem = api.learning.getCourseItem.useQuery(
    { courseItemId: sourceCourseItemId },
    { enabled: Boolean(session && sourceCourseItemId) },
  );
  const utils = api.useUtils();
  const outline = api.learning.getCourseOutline.useQuery(
    { courseId: courseId ?? "" },
    { enabled: Boolean(session && courseId) },
  );
  const initialOutline = useRef<LearningPathCourse>(undefined);
  useEffect(() => {
    if (!initialOutline.current && outline.data)
      initialOutline.current = outline.data;
  }, [outline.data]);
  const complete = api.learning.markContentProgress.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.learning.invalidate(),
        utils.gamification.invalidate(),
      ]);
    },
  });
  const requirementActions: LearningRequirementAction[] =
    sourceItem.data?.material?.requiredActivities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      title: activity.title,
      onPress: () => {
        if (activity.type === "VOCABULARY_SET") {
          router.push({
            pathname: "/vocabulary/[vocabularySetId]",
            params: {
              vocabularySetId: activity.resourceId,
              sourceCourseItemId,
              ...(courseId ? { courseId } : {}),
            },
          });
          return;
        }
        if (courseId) {
          router.push({
            pathname: "/courses/[courseId]/items/[courseItemId]",
            params: { courseId, courseItemId: activity.courseItemId },
          });
        }
      },
    })) ?? [];
  return (
    <StudyScreen
      title={query.data?.title ?? "Vocabulary"}
      fillViewport
      keyboardAvoiding
      scrollable={!roundActive}
      scrollGesture={scrollGesture}
    >
      <QueryState
        pending={query.isPending && !!(vocabularySetId && sourceCourseItemId)}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {!vocabularySetId || !sourceCourseItemId ? (
        <Empty>
          Open vocabulary practice from a course activity or lesson.
        </Empty>
      ) : null}
      {query.data && session && !complete.isSuccess ? (
        <VocabularySession
          key={`${session.user.id}:${query.data.id}`}
          words={query.data.entries}
          vocabularySetId={query.data.id}
          sourceCourseItemId={sourceCourseItemId}
          scrollGesture={scrollGesture}
          onRoundActiveChange={setRoundActive}
          saving={complete.isPending}
          saveError={complete.error?.message}
          onComplete={async () => {
            await complete.mutateAsync({
              courseItemId: query.data.practiceCourseItemId,
              status: "COMPLETED",
            });
          }}
        />
      ) : null}
      {complete.isSuccess && courseId ? (
        <CourseLearningFooter
          key={sourceCourseItemId}
          courseId={courseId}
          courseItemId={sourceCourseItemId}
          initialOutline={initialOutline.current}
          requirementActions={requirementActions}
        />
      ) : null}
      {complete.isSuccess && !courseId ? (
        <Text
          accessibilityLiveRegion="polite"
          className="text-base font-semibold text-primary"
        >
          Course progress saved.
        </Text>
      ) : null}
    </StudyScreen>
  );
}
