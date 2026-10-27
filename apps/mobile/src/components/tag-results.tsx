import { tagResults } from "@hakgyo/shared";
import { Text, View } from "react-native";

import { Eyebrow, ProgressBar } from "./learning-ui";
import { StudyGlass } from "./study-glass";

/**
 * Results of a graded attempt per question tag ("Rambu K3: 1 dari 2 benar"). Mirrors the web
 * `TagResults`; built from points and answer scores only, so Tryouts show it too.
 */
export function TagResults({
  questions,
  answers,
}: {
  questions: ReadonlyArray<{ id: string; points: number; tags?: string[] }>;
  answers: ReadonlyArray<{
    questionId: string;
    autoScore?: number | null;
    manualScore?: number | null;
  }>;
}) {
  const groups = tagResults(questions, answers);
  if (!groups.length) return null;
  return (
    <StudyGlass>
      <Text className="text-xl font-black text-foreground">
        Hasil per tipe soal
      </Text>
      {groups.map((group) => (
        <View key={group.group} className="gap-3">
          <Eyebrow>{group.label}</Eyebrow>
          {group.rows.map((row) => (
            <View key={row.tag} className="gap-1.5">
              <View className="flex-row items-baseline justify-between gap-3">
                <Text className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                  {row.label}
                </Text>
                <Text className="text-sm tabular-nums text-muted-foreground">
                  {row.correct} dari {row.total} benar
                </Text>
              </View>
              <ProgressBar
                accessibilityLabel={`${row.label}: ${row.correct} dari ${row.total} benar`}
                max={row.total}
                value={row.correct}
              />
            </View>
          ))}
        </View>
      ))}
    </StudyGlass>
  );
}
