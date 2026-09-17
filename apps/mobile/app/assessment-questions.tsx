import { router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { StudyAction } from "../src/components/study-glass";
import {
  nextUnansweredQuestion,
  type QuestionStatus,
} from "../src/lib/question-progress";
import { useQuestionNavigatorSession } from "../src/providers/QuestionNavigatorProvider";

const labels: Record<QuestionStatus, string> = {
  unanswered: "Unanswered",
  answered: "Answered",
  correct: "Correct",
  incorrect: "Incorrect",
};

export default function AssessmentQuestionsScreen() {
  const { session } = useQuestionNavigatorSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const active = useRef(true);
  const selecting = useRef(false);
  useFocusEffect(
    useCallback(() => {
      active.current = true;
      return () => {
        active.current = false;
      };
    }, []),
  );
  async function select(index: number) {
    if (!session || selecting.current) return;
    selecting.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const selected = await session.onSelect(index);
      if (!active.current) return;
      if (selected) router.back();
      else
        setError(
          "We couldn’t save your answers. Try again before switching questions.",
        );
    } catch {
      setError("Couldn’t open that question. Please try again.");
    } finally {
      selecting.current = false;
      if (active.current) setBusy(false);
    }
  }
  const answered =
    session?.statuses.filter((status) => status !== "unanswered").length ?? 0;
  const next = session
    ? nextUnansweredQuestion(session.statuses, session.current)
    : -1;
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="bg-background"
      contentContainerClassName="gap-5 px-5 pb-10 pt-6"
    >
      <Stack.Screen options={{ gestureEnabled: !busy }} />
      <View className="flex-row items-center justify-between gap-4">
        <View className="flex-1 gap-1">
          <Text className="text-2xl font-black text-foreground">Questions</Text>
          <Text className="text-sm text-muted-foreground">
            {session?.title ?? "No active assessment"}
          </Text>
        </View>
        <StudyAction secondary disabled={busy} onPress={() => router.back()}>
          Done
        </StudyAction>
      </View>
      {session ? (
        <>
          <Text
            accessibilityLiveRegion="polite"
            className="text-sm text-muted-foreground"
          >
            {answered} of {session.statuses.length} answered · Tap a question to
            open it
          </Text>
          {next >= 0 ? (
            <StudyAction loading={busy} onPress={() => void select(next)}>
              Next unanswered →
            </StudyAction>
          ) : (
            <Text className="font-bold text-primary">
              All questions answered. You can still review them.
            </Text>
          )}
          {error ? (
            <Text
              accessibilityRole="alert"
              className="text-sm text-destructive"
            >
              {error}
            </Text>
          ) : null}
          <View className="flex-row flex-wrap gap-3">
            {session.statuses.map((status, index) => (
              <Pressable
                key={index}
                accessibilityRole="button"
                accessibilityLabel={`Question ${index + 1}, ${labels[status]}${index === session.current ? ", current question" : ""}`}
                accessibilityState={{
                  selected: index === session.current,
                  disabled: busy,
                }}
                disabled={busy}
                onPress={() => void select(index)}
                className={`min-h-24 grow items-center justify-center gap-1 rounded-2xl border p-3 active:opacity-75 ${index === session.current ? "border-primary bg-primary/20" : status === "incorrect" ? "border-destructive/50 bg-destructive/10" : status !== "unanswered" ? "border-primary/40 bg-primary/10" : "border-border bg-card"}`}
                style={{ width: "28%" }}
              >
                <Text className="text-xl font-black text-foreground">
                  {index + 1}
                  {status === "correct" || status === "answered"
                    ? " ✓"
                    : status === "incorrect"
                      ? " ×"
                      : ""}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {labels[status]}
                </Text>
                {index === session.current ? (
                  <Text className="text-xs font-bold text-primary">
                    Current
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <Text className="text-muted-foreground">
          Open an assessment to view its question list.
        </Text>
      )}
    </ScrollView>
  );
}
