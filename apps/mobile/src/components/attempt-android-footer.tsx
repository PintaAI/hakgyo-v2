import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { QuizNav } from "./quiz/quiz-nav";
import { Action } from "./ui/action";

/**
 * The attempt's bottom bar on Android, which has no native bottom toolbar: the
 * finish button, then moving between questions, in the order the iOS toolbar
 * has them. iOS keeps its native toolbar and never renders this.
 */
export function AttemptAndroidFooter({
  finish,
  busy,
  answered,
  total,
  onPrevious,
  onNext,
  nextLabel,
  onOpenList,
}: {
  finish: { label: string; onPress: () => void } | null;
  busy: boolean;
  answered: number;
  total: number;
  onPrevious?: () => void;
  onNext?: () => void;
  nextLabel: string;
  onOpenList: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="gap-3 border-t border-border bg-background px-5 pt-3"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      {finish ? (
        <Action disabled={busy} loading={busy} onPress={finish.onPress}>
          {busy ? "Mengirim…" : finish.label}
        </Action>
      ) : null}
      <QuizNav
        answered={answered}
        total={total}
        onPrevious={onPrevious}
        onNext={onNext}
        nextLabel={nextLabel}
        onOpenList={onOpenList}
        disabled={busy}
      />
    </View>
  );
}
