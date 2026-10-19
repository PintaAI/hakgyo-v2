import { Stack, useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";

import {
  Chip,
  EmptyState,
  Spinner,
} from "../../../../src/components/learning-ui";
import { SearchResultRow } from "../../../../src/components/search/search-result-row";
import { TabScreen } from "../../../../src/components/tab-screen";
import { GlassInput } from "../../../../src/components/ui/glass-input";
import { useAppTheme } from "../../../../src/providers/AppThemeProvider";
import { useMobileSync } from "../../../../src/providers/MobileSyncProvider";
import type { SearchKind } from "../../../../src/search/documents";
import { searchDocuments } from "../../../../src/search/match";
import { openSearchTarget } from "../../../../src/search/open-result";
import { useSearchCorpus } from "../../../../src/search/use-search-corpus";

const ios = Platform.OS === "ios";
const PLACEHOLDER = "Cari kosakata, materi, kelas…";

const filters: { label: string; kinds: SearchKind[] }[] = [
  { label: "Kosakata", kinds: ["vocabularyEntry", "vocabularySet"] },
  { label: "Materi", kinds: ["material"] },
  { label: "Bab", kinds: ["module"] },
  { label: "Kurikulum", kinds: ["course"] },
  { label: "Tugas", kinds: ["assessment"] },
  { label: "Latihan & Tryout", kinds: ["event"] },
  { label: "Kelas", kinds: ["cohort"] },
  { label: "Game", kinds: ["game"] },
];

function AndroidSearchField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (text: string) => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View className="flex-row">
      <GlassInput
        value={value}
        onChangeText={onChangeText}
        placeholder={PLACEHOLDER}
        accessibilityLabel="Cari"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        leading={
          <View className="size-10 items-center justify-center">
            <SymbolView
              fallback={<Text className="text-muted-foreground">⌕</Text>}
              name="magnifyingglass"
              size={16}
              tintColor={colors.mutedForeground}
            />
          </View>
        }
        trailing={
          value ? (
            <Pressable
              accessibilityLabel="Hapus pencarian"
              accessibilityRole="button"
              className="size-10 items-center justify-center active:opacity-60"
              onPress={() => onChangeText("")}
            >
              <Text className="text-base text-muted-foreground">✕</Text>
            </Pressable>
          ) : null
        }
      />
    </View>
  );
}

export default function SearchTab() {
  const { activeOrganizationId, selectOrganization } = useAppTheme();
  const { isSyncing } = useMobileSync();
  const corpus = useSearchCorpus();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const { refetch } = corpus;

  // The corpus is read from SQLite: refresh it when the tab is shown and
  // after each sync, which may have downloaded or replaced bundles.
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );
  const wasSyncing = useRef(isSyncing);
  useEffect(() => {
    if (wasSyncing.current && !isSyncing) void refetch();
    wasSyncing.current = isSyncing;
  }, [isSyncing, refetch]);

  const activeFilter = filters.find(({ label }) => label === filter) ?? null;
  const outcome = useMemo(
    () =>
      searchDocuments(corpus.data?.documents ?? [], deferredQuery, {
        kinds: activeFilter ? new Set(activeFilter.kinds) : undefined,
      }),
    [activeFilter, corpus.data, deferredQuery],
  );
  const filterCounts = filters
    .map((entry) => ({
      ...entry,
      count: entry.kinds.reduce(
        (sum, kind) => sum + (outcome.counts[kind] ?? 0),
        0,
      ),
    }))
    .filter((entry) => entry.count > 0 || entry.label === filter);

  const organizationNames = corpus.data?.organizationNames ?? {};
  const showOrganizations = Object.keys(organizationNames).length > 1;
  const trimmed = deferredQuery.trim();

  return (
    <>
      {ios ? (
        <Stack.SearchBar
          placeholder={PLACEHOLDER}
          autoCapitalize="none"
          hideWhenScrolling={false}
          obscureBackground={false}
          onChangeText={(event) => setQuery(event.nativeEvent.text)}
          onCancelButtonPress={() => setQuery("")}
        />
      ) : null}
      <TabScreen
        title="Cari"
        titleIcon={{ symbol: "magnifyingglass", fallback: "⌕" }}
        contentClassName="gap-4"
        automaticallyAdjustKeyboardInsets
      >
        {ios ? null : (
          <AndroidSearchField value={query} onChangeText={setQuery} />
        )}

        {trimmed && outcome.total > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            className="-mx-5"
            contentContainerClassName="gap-2 px-5"
          >
            <Chip
              label={`Semua ${outcome.total}`}
              selected={!activeFilter}
              onPress={() => setFilter(null)}
            />
            {filterCounts.map((entry) => (
              <Chip
                key={entry.label}
                label={`${entry.label} ${entry.count}`}
                selected={entry.label === filter}
                onPress={() =>
                  setFilter((current) =>
                    current === entry.label ? null : entry.label,
                  )
                }
              />
            ))}
          </ScrollView>
        ) : null}

        {corpus.isPending ? (
          <View className="items-center py-10">
            <Spinner />
          </View>
        ) : !trimmed ? (
          <EmptyState title="Cari apa saja">
            Kosakata, contoh kalimat, isi materi, bab, soal tugas, kelas, dan
            game dari {corpus.data?.courseCount ?? 0} kurikulum yang tersimpan
            di perangkat ini. Pencarian tetap berjalan saat offline.
          </EmptyState>
        ) : outcome.results.length === 0 ? (
          <EmptyState title="Tidak ada hasil">
            {`Tidak ada yang cocok dengan “${trimmed}”. Coba kata lain, atau ketik huruf awalnya saja (ㅎㄱ untuk 학교).`}
          </EmptyState>
        ) : (
          <View>
            {outcome.results.map((result) => (
              <SearchResultRow
                key={result.document.key}
                result={result}
                organizationName={
                  showOrganizations && result.document.organizationId
                    ? organizationNames[result.document.organizationId]
                    : undefined
                }
                onPress={() =>
                  void openSearchTarget(result.document.target, {
                    activeOrganizationId,
                    selectOrganization,
                  })
                }
              />
            ))}
            {outcome.results.length <
            (activeFilter
              ? (filterCounts.find(({ label }) => label === filter)?.count ?? 0)
              : outcome.total) ? (
              <Text className="pt-4 text-center text-xs text-muted-foreground">
                Menampilkan hasil teratas. Ketik lebih spesifik untuk
                mempersempit.
              </Text>
            ) : null}
          </View>
        )}
      </TabScreen>
    </>
  );
}
