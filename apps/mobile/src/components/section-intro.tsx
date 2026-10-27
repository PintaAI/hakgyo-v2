import { formatScore } from "@hakgyo/shared";
import { Text } from "react-native";

import {
  NativeContentRenderer,
  type AssetUrlResolver,
} from "./content-renderer";
import { Eyebrow } from "./learning-ui";
import { StudyAction, StudyGlass } from "./study-glass";

function formatRemaining(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * The screen before a section starts: name, instructions, question count and time, with a start
 * button. The section starts by itself when `secondsToAutoStart` reaches zero. Mirrors the web
 * `SectionIntro` (docs/eps-topik-simulation.md section 4.2).
 */
export function SectionIntro({
  title,
  instructions,
  position,
  sectionCount,
  questionCount,
  timeLimitSeconds,
  secondsToAutoStart,
  busy,
  resolveAssetUrl,
  onStart,
}: {
  title: string;
  instructions: unknown;
  position: number;
  sectionCount: number;
  questionCount: number;
  timeLimitSeconds: number | null;
  secondsToAutoStart: number;
  busy: boolean;
  resolveAssetUrl: AssetUrlResolver;
  onStart: () => void;
}) {
  return (
    <StudyGlass>
      <Eyebrow>
        Bagian {position} dari {sectionCount}
      </Eyebrow>
      <Text className="text-2xl font-black text-foreground">{title}</Text>
      <Text className="text-sm text-muted-foreground">
        {questionCount} soal
        {timeLimitSeconds
          ? ` · ${formatScore(timeLimitSeconds / 60)} menit`
          : " · tanpa batas waktu"}
      </Text>
      {instructions ? (
        <NativeContentRenderer
          content={instructions}
          resolveAssetUrl={resolveAssetUrl}
        />
      ) : null}
      <Text className="text-sm text-muted-foreground">
        Waktu bagian ini berjalan setelah kamu menekan Mulai. Bagian yang sudah
        selesai tidak bisa dibuka lagi.
      </Text>
      <StudyAction disabled={busy} onPress={onStart}>
        Mulai bagian
      </StudyAction>
      <Text
        accessibilityLiveRegion="polite"
        className="text-center text-xs text-muted-foreground"
      >
        Dimulai otomatis dalam {formatRemaining(secondsToAutoStart)}
      </Text>
    </StudyGlass>
  );
}
