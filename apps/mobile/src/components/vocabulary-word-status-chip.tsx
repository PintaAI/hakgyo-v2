import { Text, View } from "react-native";

import {
  QUESTION_DONE_COLOR,
  QUESTION_SEEN_COLOR,
} from "../lib/question-colors";
import {
  vocabularyWordStatusLabels,
  type VocabularyWordStatus,
} from "../lib/vocabulary-word-status";
import { useAppTheme } from "../providers/AppThemeProvider";
import { withOpacity } from "../theme/colors";

/**
 * A word's status as a small pill, in the question colours: grey when new,
 * amber while it still has to be memorised, the brand colour once learned and
 * green once mastered.
 */
export function VocabularyWordStatusChip({
  status,
}: {
  status: VocabularyWordStatus;
}) {
  const { colors } = useAppTheme();
  const color =
    status === "MASTERED"
      ? QUESTION_DONE_COLOR
      : status === "LEARNED"
        ? colors.primary
        : status === "MEMORIZE"
          ? QUESTION_SEEN_COLOR
          : colors.mutedForeground;
  return (
    <View
      className="self-start rounded-full px-2 py-0.5"
      style={{ backgroundColor: withOpacity(color, 0.14) }}
    >
      <Text className="text-[11px] font-bold" style={{ color }}>
        {vocabularyWordStatusLabels[status]}
      </Text>
    </View>
  );
}
