import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Pressable, Text, View } from "react-native";

import { useAppTheme } from "../../providers/AppThemeProvider";
import type { SearchKind } from "../../search/documents";
import type { SearchResult } from "../../search/match";
import { Chevron } from "../learning-ui";

export const searchKindMeta: Record<
  SearchKind,
  {
    label: string;
    symbol: SymbolViewProps["name"];
    fallback: string;
    textClass: string;
  }
> = {
  course: {
    label: "Kurikulum",
    symbol: "books.vertical.fill",
    fallback: "▤",
    textClass: "text-primary",
  },
  module: {
    label: "Bab",
    symbol: "list.bullet.rectangle.fill",
    fallback: "≡",
    textClass: "text-primary",
  },
  material: {
    label: "Materi",
    symbol: "doc.text.fill",
    fallback: "•",
    textClass: "text-primary",
  },
  vocabularySet: {
    label: "Set kosakata",
    symbol: "character.book.closed.fill",
    fallback: "Aa",
    textClass: "text-emerald-600 dark:text-emerald-400",
  },
  vocabularyEntry: {
    label: "Kosakata",
    symbol: "textformat.abc",
    fallback: "가",
    textClass: "text-emerald-600 dark:text-emerald-400",
  },
  assessment: {
    label: "Tugas",
    symbol: "checkmark.seal.fill",
    fallback: "✓",
    textClass: "text-amber-600 dark:text-amber-400",
  },
  event: {
    label: "Latihan",
    symbol: "pencil.and.list.clipboard",
    fallback: "✎",
    textClass: "text-amber-600 dark:text-amber-400",
  },
  cohort: {
    label: "Kelas",
    symbol: "person.3.fill",
    fallback: "◎",
    textClass: "text-sky-600 dark:text-sky-400",
  },
  game: {
    label: "Game",
    symbol: "gamecontroller.fill",
    fallback: "▶",
    textClass: "text-violet-600 dark:text-violet-400",
  },
};

function Snippet({
  snippet,
}: {
  snippet: NonNullable<SearchResult["snippet"]>;
}) {
  const { text, highlight } = snippet;
  return (
    <Text
      className="text-[13px] leading-[18px] text-muted-foreground"
      numberOfLines={2}
    >
      {highlight ? (
        <>
          {text.slice(0, highlight.start)}
          <Text className="font-semibold text-foreground">
            {text.slice(highlight.start, highlight.end)}
          </Text>
          {text.slice(highlight.end)}
        </>
      ) : (
        text
      )}
    </Text>
  );
}

/** One search result: kind icon, title, where it lives and the matched text. */
export function SearchResultRow({
  result,
  organizationName,
  onPress,
}: {
  result: SearchResult;
  /** Shown when results span more than one organization. */
  organizationName?: string;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const { document, snippet } = result;
  const meta = searchKindMeta[document.kind];
  const label = document.label ?? meta.label;
  const detail = [document.context, organizationName]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${document.title}`}
      accessibilityHint={detail || undefined}
      className="flex-row items-start gap-3 border-b border-border py-3 active:opacity-60"
      onPress={onPress}
    >
      <View className="mt-0.5 size-9 items-center justify-center rounded-full bg-primary/10">
        <SymbolView
          fallback={
            <Text className="text-xs font-black text-primary">
              {meta.fallback}
            </Text>
          }
          name={meta.symbol}
          size={15}
          tintColor={colors.primary}
          weight="semibold"
        />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text
          className="text-[15px] font-semibold leading-5 text-foreground"
          numberOfLines={1}
        >
          {document.title}
        </Text>
        <Text
          className="text-xs leading-4 text-muted-foreground"
          numberOfLines={1}
        >
          <Text className={`font-semibold ${meta.textClass}`}>{label}</Text>
          {detail ? ` · ${detail}` : null}
        </Text>
        {snippet ? <Snippet snippet={snippet} /> : null}
      </View>
      <Chevron className="pt-2" />
    </Pressable>
  );
}
