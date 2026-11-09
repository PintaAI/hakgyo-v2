import { Stack, useFocusEffect } from "expo-router";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import type { SearchBarCommands } from "react-native-screens";

import {
  Chip,
  EmptyState,
  Eyebrow,
  Spinner,
} from "../../../../src/components/learning-ui";
import { authClient } from "../../../../src/lib/auth-client";
import type { SearchDocument } from "../../../../src/search/documents";
import {
  clearSearchRecents,
  forgetQuery,
  rememberOpened,
  rememberQuery,
  useSearchRecents,
} from "../../../../src/search/search-recents";
import { SearchResultRow } from "../../../../src/components/search/search-result-row";
import { TabScreen } from "../../../../src/components/tab-screen";
import { GlassInput } from "../../../../src/components/ui/glass-input";
import { useAppTheme } from "../../../../src/providers/AppThemeProvider";
import { useMobileSync } from "../../../../src/providers/MobileSyncProvider";
import type { SearchKind } from "../../../../src/search/documents";
import { searchDocuments } from "../../../../src/search/match";
import { openSearchTarget } from "../../../../src/search/open-result";
import { useSearchCorpus } from "../../../../src/search/use-search-corpus";
import { SymbolIcon } from "../../../../src/components/ui/symbol-icon";
import { useAutoTour } from "../../../../src/tour/tour-provider";
import { TourTarget } from "../../../../src/tour/tour-target";

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
  onSubmit,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
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
        onSubmitEditing={onSubmit}
        leading={
          <View className="size-10 items-center justify-center">
            <SymbolIcon
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
              <SymbolIcon
                name="xmark"
                size={16}
                weight="semibold"
                tintColor={colors.mutedForeground}
              />
            </Pressable>
          ) : null
        }
      />
    </View>
  );
}

/**
 * What Cari shows before anything is typed: the last searches (tap to search
 * again) and the results opened last, both capped (see `search-recents`).
 */
function SearchRecentsView({
  queries,
  opened,
  onSearch,
  onForget,
  onClear,
  onOpen,
  organizationName,
}: {
  queries: string[];
  opened: SearchDocument[];
  onSearch: (query: string) => void;
  onForget: (query: string) => void;
  onClear: () => void;
  onOpen: (document: SearchDocument) => void;
  organizationName: (document: SearchDocument) => string | undefined;
}) {
  const { colors } = useAppTheme();
  return (
    <View className="gap-6">
      {queries.length > 0 ? (
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Eyebrow>Pencarian terakhir</Eyebrow>
            <Pressable
              accessibilityLabel="Hapus riwayat pencarian"
              accessibilityRole="button"
              className="active:opacity-60"
              hitSlop={8}
              onPress={onClear}
            >
              <Text className="text-xs font-semibold text-primary">Hapus</Text>
            </Pressable>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {queries.map((query) => (
              <Pressable
                accessibilityHint="Cari lagi. Tekan lama untuk menghapus dari riwayat."
                accessibilityLabel={query}
                accessibilityRole="button"
                className="flex-row items-center gap-1.5 rounded-full bg-muted px-3 py-2 active:opacity-60"
                delayLongPress={400}
                key={query}
                onLongPress={() => onForget(query)}
                onPress={() => onSearch(query)}
              >
                <SymbolIcon
                  name="clock"
                  size={12}
                  tintColor={colors.mutedForeground}
                  weight="semibold"
                />
                <Text
                  className="text-sm font-semibold text-foreground"
                  numberOfLines={1}
                >
                  {query}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      {opened.length > 0 ? (
        <View className="gap-1">
          <Eyebrow>Terakhir dibuka</Eyebrow>
          <View>
            {opened.map((document) => (
              <SearchResultRow
                key={document.key}
                organizationName={organizationName(document)}
                result={{ document, score: 0, snippet: null }}
                onPress={() => onOpen(document)}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default function SearchTab() {
  const { activeOrganizationId, selectOrganization } = useAppTheme();
  const { isSyncing } = useMobileSync();
  const corpus = useSearchCorpus();
  useAutoTour("search", true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const { refetch } = corpus;
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;
  const recents = useSearchRecents(userId);
  const searchBar = useRef<SearchBarCommands>(null);

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
  const organizationName = (document: SearchDocument) =>
    showOrganizations && document.organizationId
      ? organizationNames[document.organizationId]
      : undefined;

  // Opened results still in the corpus, newest first.
  const documentsByKey = useMemo(
    () =>
      new Map(
        (corpus.data?.documents ?? []).map((prepared) => [
          prepared.document.key,
          prepared.document,
        ]),
      ),
    [corpus.data],
  );
  const openedDocuments = recents.opened.flatMap((key) => {
    const document = documentsByKey.get(key);
    return document ? [document] : [];
  });

  const openDocument = (document: SearchDocument) => {
    if (userId) {
      if (trimmed) rememberQuery(userId, trimmed);
      rememberOpened(userId, document.key);
    }
    void openSearchTarget(document.target, {
      activeOrganizationId,
      selectOrganization,
    });
  };
  const searchAgain = (text: string) => {
    setQuery(text);
    searchBar.current?.setText(text);
  };

  return (
    <>
      {ios ? (
        <Stack.SearchBar
          placeholder={PLACEHOLDER}
          autoCapitalize="none"
          hideWhenScrolling={false}
          obscureBackground={false}
          ref={searchBar}
          onChangeText={(event) => setQuery(event.nativeEvent.text)}
          onSearchButtonPress={(event) => {
            if (userId) rememberQuery(userId, event.nativeEvent.text);
          }}
          onCancelButtonPress={() => setQuery("")}
        />
      ) : null}
      <TabScreen
        title="Cari"
        titleIcon={{ symbol: "magnifyingglass" }}
        contentClassName="gap-4"
        automaticallyAdjustKeyboardInsets
      >
        {ios ? null : (
          <TourTarget id="search.field">
            <AndroidSearchField
              value={query}
              onChangeText={setQuery}
              onSubmit={() => {
                if (userId) rememberQuery(userId, query);
              }}
            />
          </TourTarget>
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
        ) : !trimmed &&
          (recents.queries.length > 0 || openedDocuments.length > 0) ? (
          <SearchRecentsView
            onClear={() => userId && clearSearchRecents(userId)}
            onForget={(text) => userId && forgetQuery(userId, text)}
            onOpen={openDocument}
            onSearch={searchAgain}
            opened={openedDocuments}
            organizationName={organizationName}
            queries={recents.queries}
          />
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
                organizationName={organizationName(result.document)}
                onPress={() => openDocument(result.document)}
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
