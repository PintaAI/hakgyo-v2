import { Pressable, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import { questionTone, questionToneColor } from "../../lib/question-colors";
import type { QuestionStatus } from "../../lib/question-progress";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { PageDots } from "../learning-ui";

/** Up to this many questions show as dots (an EPS-TOPIK section has 20). */
const MAX_DOTS = 20;

/**
 * Every question's state above the questions, in the question list's colours
 * (`question-colors.ts`): answered or right, wrong, opened, not opened. Dots
 * follow the pager while it is dragged; longer sets show one segment per
 * question instead, the current one raised. A tap opens the question list.
 */
export function QuizStatusDots({
  statuses,
  seen,
  current,
  position,
  onOpenList,
  disabled = false,
}: {
  statuses: readonly QuestionStatus[];
  /** Questions the learner has opened; left out where it does not matter. */
  seen?: readonly boolean[];
  /** The question in view, for the segment strip. */
  current: number;
  /** The pager's offset in questions, for the dots. */
  position: SharedValue<number>;
  onOpenList: () => void;
  disabled?: boolean;
}) {
  const { colors } = useAppTheme();
  const tones = statuses.map((status, index) =>
    questionToneColor(questionTone(status, seen?.[index] ?? false), colors),
  );
  const answered = statuses.filter((status) => status !== "unanswered").length;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Daftar soal, ${answered} dari ${statuses.length} dijawab`}
      accessibilityHint="Buka daftar untuk pindah ke soal mana pun"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
      onPress={onOpenList}
      className={`active:opacity-60 ${statuses.length > MAX_DOTS ? "self-stretch" : "items-center self-center"}`}
    >
      {statuses.length > MAX_DOTS ? (
        <View className="h-2.5 flex-row items-center gap-0.5">
          {tones.map((color, index) => (
            <View
              key={index}
              className={`flex-1 rounded-full ${index === current ? "h-2.5" : "h-1.5"}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </View>
      ) : (
        <PageDots count={statuses.length} position={position} colors={tones} />
      )}
    </Pressable>
  );
}
