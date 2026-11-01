import {
  createHangeulPlacementTest,
  HANGEUL_PLACEMENT_PASS_SCORE,
  HANGEUL_PLACEMENT_QUESTION_COUNT,
  hasPassedHangeulPlacement,
  type HangeulPlacementQuestion,
} from "@hakgyo/shared/hangeul";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Action, ProgressBar } from "../../src/components/learning-ui";
import { SymbolIcon } from "../../src/components/ui/symbol-icon";
import { markHangeulPlacementPassed } from "../../src/lib/hangeul-placement";
import { useAppTheme } from "../../src/providers/AppThemeProvider";

/** How long the right and wrong colours stay before the next question. */
const FEEDBACK_MS = 700;

function close() {
  if (router.canGoBack()) router.back();
  else router.replace("/(onboarding)/start");
}

function Choice({
  choice,
  question,
  picked,
  onPress,
}: {
  choice: string;
  question: HangeulPlacementQuestion;
  picked: string | null;
  onPress: () => void;
}) {
  const isAnswer = choice === question.answer;
  const state =
    picked === null
      ? "idle"
      : isAnswer
        ? "right"
        : choice === picked
          ? "wrong"
          : "dimmed";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: picked !== null }}
      className={`min-h-20 flex-1 items-center justify-center rounded-2xl border px-3 active:opacity-70 ${
        state === "right"
          ? "border-primary bg-primary"
          : state === "wrong"
            ? "border-destructive bg-destructive"
            : "border-border bg-background"
      } ${state === "dimmed" ? "opacity-40" : ""}`}
      disabled={picked !== null}
      onPress={onPress}
    >
      <Text
        className={`font-bold ${question.kind === "write" ? "text-3xl" : "text-xl"} ${
          state === "right"
            ? "text-primary-foreground"
            : state === "wrong"
              ? "text-destructive-foreground"
              : "text-foreground"
        }`}
      >
        {choice}
      </Text>
    </Pressable>
  );
}

function Result({
  correct,
  onRetry,
}: {
  correct: number;
  onRetry: () => void;
}) {
  const { colors } = useAppTheme();
  const passed = hasPassedHangeulPlacement(correct);
  return (
    <>
      <View className="flex-1 items-center justify-center gap-4 px-5">
        <SymbolIcon
          name={passed ? "checkmark.seal.fill" : "xmark.circle"}
          size={56}
          tintColor={passed ? colors.primary : colors.mutedForeground}
        />
        <Text
          accessibilityRole="header"
          className="text-center text-2xl font-bold tracking-tight text-foreground"
        >
          {passed ? "Kamu sudah bisa membaca Hangeul" : "Belum lulus"}
        </Text>
        <Text className="text-center text-base font-semibold text-muted-foreground">
          {correct} dari {HANGEUL_PLACEMENT_QUESTION_COUNT} benar
        </Text>
        <Text className="text-center text-sm leading-6 text-muted-foreground">
          {passed
            ? "Setelah kamu masuk, lencana Hangeul Mastery jadi milikmu dan kurikulumnya disembunyikan. Tampilkan lagi kapan saja lewat Pengaturan."
            : `Butuh ${HANGEUL_PLACEMENT_PASS_SCORE} jawaban benar. Hangeul Mastery akan mengajarimu dari dasar.`}
        </Text>
      </View>
      <View className="gap-2 px-5">
        <Action onPress={close}>Lanjut</Action>
        {passed ? null : (
          <Action variant="link" onPress={onRetry}>
            Coba lagi
          </Action>
        )}
      </View>
    </>
  );
}

export default function HangeulTestScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const [questions, setQuestions] = useState(() =>
    createHangeulPlacementTest(),
  );
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const question = questions[index];
  const passed = !question && hasPassedHangeulPlacement(correct);

  useEffect(() => {
    if (passed) markHangeulPlacementPassed();
  }, [passed]);

  useEffect(() => {
    if (picked === null) return;
    const timer = setTimeout(() => {
      setPicked(null);
      setIndex((current) => current + 1);
    }, FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [picked]);

  const choose = (choice: string) => {
    if (!question || picked !== null) return;
    setPicked(choice);
    if (choice === question.answer) setCorrect((current) => current + 1);
  };

  const retry = () => {
    setQuestions(createHangeulPlacementTest());
    setIndex(0);
    setCorrect(0);
    setPicked(null);
  };

  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }}
    >
      <View className="h-10 flex-row items-center gap-4 px-5">
        <Pressable
          accessibilityLabel="Tutup tes"
          accessibilityRole="button"
          className="-m-2 p-2 active:opacity-60"
          onPress={close}
        >
          <SymbolIcon
            name="xmark"
            size={18}
            tintColor={colors.mutedForeground}
            weight="semibold"
          />
        </Pressable>
        <ProgressBar
          className="flex-1"
          max={HANGEUL_PLACEMENT_QUESTION_COUNT}
          value={index}
        />
        <Text className="w-12 text-right text-sm font-semibold text-muted-foreground">
          {Math.min(index + 1, HANGEUL_PLACEMENT_QUESTION_COUNT)}/
          {HANGEUL_PLACEMENT_QUESTION_COUNT}
        </Text>
      </View>

      {question ? (
        <View className="flex-1 justify-center gap-10 px-5">
          <View className="items-center gap-3">
            <Text className="text-base font-semibold text-muted-foreground">
              {question.kind === "read"
                ? "Bagaimana cara membacanya?"
                : "Mana tulisan Hangeul-nya?"}
            </Text>
            <Text
              className={`font-bold text-foreground ${question.kind === "read" ? "text-8xl" : "text-5xl tracking-tight"}`}
            >
              {question.prompt}
            </Text>
          </View>
          <View className="gap-3">
            {[0, 2].map((start) => (
              <View className="flex-row gap-3" key={start}>
                {question.choices.slice(start, start + 2).map((choice) => (
                  <Choice
                    choice={choice}
                    key={choice}
                    onPress={() => choose(choice)}
                    picked={picked}
                    question={question}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      ) : (
        <Result correct={correct} onRetry={retry} />
      )}
    </View>
  );
}
