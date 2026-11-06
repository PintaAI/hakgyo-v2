import { router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Action } from "../src/components/learning-ui";
import {
  nextUnansweredQuestion,
  type QuestionStatus,
} from "../src/lib/question-progress";
import { useQuestionNavigatorSession } from "../src/providers/QuestionNavigatorProvider";
import { SymbolIcon } from "../src/components/ui/symbol-icon";
import { useAppTheme } from "../src/providers/AppThemeProvider";
import {
  questionTone,
  questionToneColor,
  type QuestionTone,
} from "../src/lib/question-colors";

const labels: Record<QuestionStatus, string> = {
  unanswered: "Belum dijawab",
  answered: "Sudah dijawab",
  correct: "Benar",
  incorrect: "Salah",
};

/** Number tiles per row, like an exam answer sheet. */
const COLUMNS = 5;

const toneLabels: Record<QuestionTone, string> = {
  done: "Sudah dijawab",
  wrong: "Salah",
  seen: "Dibuka, belum dijawab",
  unseen: "Belum dibuka",
};

function LegendDot({ tone, label }: { tone: QuestionTone; label: string }) {
  const { colors } = useAppTheme();
  return (
    <View className="flex-row items-center gap-1.5">
      <View
        className="size-3 rounded-[4px]"
        style={{ backgroundColor: questionToneColor(tone, colors) }}
      />
      <Text className="text-xs text-muted-foreground">{label}</Text>
    </View>
  );
}

export default function AssessmentQuestionsScreen() {
  const { session } = useQuestionNavigatorSession();
  const { colors } = useAppTheme();
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
          "Jawaban kamu belum tersimpan. Coba lagi sebelum pindah soal.",
        );
    } catch {
      setError("Soal tidak dapat dibuka. Silakan coba lagi.");
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
  // A review grades questions; an attempt only knows answered or not.
  const graded = session?.statuses.some(
    (status) => status === "correct" || status === "incorrect",
  );
  // The same colours as the daily question dots.
  const legend: QuestionTone[] = graded
    ? ["done", "wrong", "unseen"]
    : session?.seen
      ? ["done", "seen", "unseen"]
      : ["done", "unseen"];
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="bg-background"
      contentContainerClassName="gap-5 px-5 pb-10 pt-6"
    >
      <Stack.Screen options={{ gestureEnabled: !busy }} />
      <View className="flex-row items-start gap-3">
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-xl font-black text-foreground">
            Daftar soal
          </Text>
          <Text className="text-sm text-muted-foreground" numberOfLines={1}>
            {session?.title ?? "Tidak ada tugas aktif"}
          </Text>
        </View>
        {session ? (
          <Text className="pt-1 text-sm font-bold tabular-nums text-foreground">
            {answered}/{session.statuses.length} dijawab
          </Text>
        ) : null}
        {/* iOS closes the sheet by its grabber; Android needs a button. */}
        {Platform.OS !== "ios" ? (
          <Pressable
            accessibilityLabel="Tutup daftar soal"
            accessibilityRole="button"
            disabled={busy}
            hitSlop={8}
            onPress={() => router.back()}
            className="size-8 items-center justify-center rounded-full bg-muted active:opacity-70"
          >
            <SymbolIcon name="xmark" size={14} tintColor={colors.foreground} />
          </Pressable>
        ) : null}
      </View>
      {session ? (
        <>
          <View className="flex-row flex-wrap gap-x-4 gap-y-2">
            {legend.map((tone) => (
              <LegendDot
                key={tone}
                tone={tone}
                // In a review green means right and grey not answered.
                label={
                  graded && tone === "done"
                    ? "Benar"
                    : graded && tone === "unseen"
                      ? "Tidak dijawab"
                      : toneLabels[tone]
                }
              />
            ))}
          </View>
          <View className="-m-1 flex-row flex-wrap">
            {session.statuses.map((status, index) => {
              const current = index === session.current;
              const tone = questionTone(status, session.seen?.[index] ?? false);
              const filled = tone !== "unseen";
              return (
                <View
                  key={index}
                  className="p-1"
                  style={{ width: `${100 / COLUMNS}%` }}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Soal ${index + 1}, ${labels[status]}${current ? ", soal saat ini" : ""}`}
                    accessibilityState={{ selected: current, disabled: busy }}
                    disabled={busy}
                    onPress={() => void select(index)}
                    className={`aspect-square items-center justify-center rounded-2xl border active:opacity-70 ${filled ? "border-transparent" : "border-border bg-card"}`}
                    style={{
                      ...(filled
                        ? { backgroundColor: questionToneColor(tone, colors) }
                        : null),
                      ...(current
                        ? {
                            // A ring outside the tile marks where you are.
                            outlineColor: colors.foreground,
                            outlineWidth: 2,
                            outlineOffset: 2,
                            outlineStyle: "solid" as const,
                          }
                        : null),
                    }}
                  >
                    <Text
                      className={`text-lg font-black tabular-nums ${filled ? "text-white" : "text-foreground"}`}
                    >
                      {index + 1}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
          {error ? (
            <Text
              accessibilityRole="alert"
              className="text-sm text-destructive"
            >
              {error}
            </Text>
          ) : null}
          {next >= 0 ? (
            <Action
              loading={busy}
              onPress={() => void select(next)}
              trailingIcon="arrow.right"
            >
              Soal belum dijawab berikutnya
            </Action>
          ) : (
            <Text className="text-center text-sm font-semibold text-primary">
              Semua soal sudah dijawab. Kamu masih bisa meninjaunya.
            </Text>
          )}
        </>
      ) : (
        <Text className="text-muted-foreground">
          Buka tugas untuk melihat daftar soalnya.
        </Text>
      )}
    </ScrollView>
  );
}
