import { router } from "expo-router";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";

import { useAppTheme } from "../providers/AppThemeProvider";
import { AttemptResultDetails } from "./attempt-result-details";
import { SymbolIcon } from "./ui/symbol-icon";

/**
 * A finished attempt in full, as a form sheet over its tugas, latihan or
 * tryout screen: the score bands, the score per section and question type,
 * and the answer review. The screen under it keeps only the summary.
 */
export function AttemptResultSheet({
  attemptId,
  courseItemId,
  initialQuestion,
}: {
  attemptId: string;
  /** Null for attempts of library events. */
  courseItemId: string | null;
  /** The review opens at this question (from the preview on the screen). */
  initialQuestion?: number;
}) {
  const { colors } = useAppTheme();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="bg-background"
      contentContainerClassName="gap-4 px-5 pb-10 pt-6"
    >
      <View className="flex-row items-center gap-3">
        <Text
          accessibilityRole="header"
          className="min-w-0 flex-1 text-xl font-black text-foreground"
        >
          Hasil lengkap
        </Text>
        {/* iOS closes the sheet by its grabber; Android needs a button. */}
        {Platform.OS !== "ios" ? (
          <Pressable
            accessibilityLabel="Tutup hasil lengkap"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.back()}
            className="size-8 items-center justify-center rounded-full bg-muted active:opacity-70"
          >
            <SymbolIcon name="xmark" size={14} tintColor={colors.foreground} />
          </Pressable>
        ) : null}
      </View>
      {attemptId ? (
        <AttemptResultDetails
          key={attemptId}
          attemptId={attemptId}
          courseItemId={courseItemId}
          initialQuestion={initialQuestion}
        />
      ) : null}
    </ScrollView>
  );
}

/** A question index from a route parameter, if it is one. */
export function questionParam(value: string | undefined) {
  if (!value) return undefined;
  const question = Number(value);
  return Number.isInteger(question) && question >= 0 ? question : undefined;
}
