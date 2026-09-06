import { useLocalSearchParams } from "expo-router";
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
  const { vocabularySetId, sourceCourseItemId } = useLocalSearchParams<{
    vocabularySetId: string;
    sourceCourseItemId: string;
  }>();
  const { data: session } = authClient.useSession();
  const query = api.learning.getVocabularyPractice.useQuery(
    { vocabularySetId, sourceCourseItemId },
    { enabled: !!(vocabularySetId && sourceCourseItemId && session) },
  );
  const utils = api.useUtils();
  const complete = api.learning.markContentProgress.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.learning.invalidate(),
        utils.gamification.invalidate(),
      ]);
    },
  });
  return (
    <StudyScreen title={query.data?.title ?? "Vocabulary"}>
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
      {query.data && session ? (
        <VocabularySession
          key={`${session.user.id}:${query.data.id}`}
          words={query.data.entries}
          userId={session.user.id}
          setId={query.data.id}
          saving={complete.isPending}
          saveError={complete.error?.message}
          onComplete={() =>
            complete.mutate({
              courseItemId: query.data.practiceCourseItemId,
              status: "COMPLETED",
            })
          }
        />
      ) : null}
      {complete.isSuccess ? (
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
