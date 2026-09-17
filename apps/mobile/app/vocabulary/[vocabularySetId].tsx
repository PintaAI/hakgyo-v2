import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Gesture } from "react-native-gesture-handler";
import { Text } from "react-native";
import { api } from "../../src/lib/trpc";
import { authClient } from "../../src/lib/auth-client";
import {
  Empty,
  QueryState,
  StudyScreen,
} from "../../src/components/learning-ui";
import { StudyAction } from "../../src/components/study-glass";
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
  const utils = api.useUtils();
  const openLearningSheet = () => {
    if (!courseId) return;
    router.push({
      pathname: "/courses/[courseId]/items/[courseItemId]/learning-progress",
      params: { courseId, courseItemId: sourceCourseItemId },
    });
  };
  const complete = api.learning.markContentProgress.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.learning.invalidate(),
        utils.gamification.invalidate(),
      ]);
    },
  });
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
        <StudyAction onPress={openLearningSheet}>Continue</StudyAction>
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
