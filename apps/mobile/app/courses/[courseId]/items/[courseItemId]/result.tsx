import { router, useLocalSearchParams } from "expo-router";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";

import { AttemptResultDetails } from "../../../../../src/components/attempt-result-details";
import { SymbolIcon } from "../../../../../src/components/ui/symbol-icon";
import { firstParam } from "../../../../../src/lib/route-params";
import { useAppTheme } from "../../../../../src/providers/AppThemeProvider";

/**
 * The finished attempt in full, as a form sheet over the tugas screen: the
 * score bands, score per section and question type, and the answer review.
 * The tugas screen keeps only the "Hasil terakhir" summary.
 */
export default function AttemptResultSheet() {
  const params = useLocalSearchParams<{
    courseItemId: string | string[];
    attemptId: string | string[];
  }>();
  const courseItemId = firstParam(params.courseItemId);
  const attemptId = firstParam(params.attemptId);
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
      {attemptId && courseItemId ? (
        <AttemptResultDetails
          key={attemptId}
          attemptId={attemptId}
          courseItemId={courseItemId}
        />
      ) : null}
    </ScrollView>
  );
}
