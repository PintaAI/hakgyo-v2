import type { ReleaseNote } from "@hakgyo/shared/release-notes";
import { Fragment, type ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { releaseDateLabel } from "../lib/release-notes";
import { useAppTheme } from "../providers/AppThemeProvider";
import { Eyebrow } from "./ui/eyebrow";
import { IconCircle } from "./ui/icon-circle";
import { SymbolIcon } from "./ui/symbol-icon";
import type { SymbolName } from "./ui/symbol-names";

/** "Yang baru" entries as bulleted groups separated by hairlines. */
export function ReleaseNoteList({ notes }: { notes: readonly ReleaseNote[] }) {
  return (
    <View>
      {notes.map((note, index) => (
        <Fragment key={note.id}>
          {index > 0 ? <View className="my-5 h-px bg-border" /> : null}
          <View className="gap-3">
            <View className="gap-1">
              <Eyebrow>
                {releaseDateLabel(note.date)} · Versi {note.version}
              </Eyebrow>
              <Text
                accessibilityRole="header"
                className="text-lg font-bold text-foreground"
              >
                {note.title}
              </Text>
            </View>
            {note.items.map((item) => (
              <View key={item} className="flex-row gap-3">
                <View className="mt-[7px] size-1.5 rounded-full bg-primary" />
                <Text className="flex-1 text-[15px] leading-[22px] text-foreground">
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </Fragment>
      ))}
    </View>
  );
}

/**
 * The shared update screen: a header, the release notes and actions pinned
 * within thumb reach. The forced update gate (OTA or store) and the "Yang
 * baru" prompt after an update both render it.
 */
export function ReleaseNotesPanel({
  symbol,
  title,
  description,
  notesTitle,
  notes,
  status,
  actions,
  insetTop = true,
}: {
  symbol: SymbolName;
  title: string;
  description?: string;
  /** Label above the notes, such as "Yang baru di versi 1.1.0". */
  notesTitle?: string;
  notes: readonly ReleaseNote[];
  /** Progress or reassurance shown above the actions. */
  status?: ReactNode;
  actions?: ReactNode;
  /** Pad for the status bar; off inside a sheet, which already clears it. */
  insetTop?: boolean;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      accessibilityViewIsModal
      className="flex-1"
      style={{ backgroundColor: colors.background }}
    >
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={{
          flexGrow: 1,
          gap: 32,
          paddingHorizontal: 20,
          paddingTop: (insetTop ? insets.top : 0) + 40,
          paddingBottom: 24,
        }}
      >
        <View className="items-center gap-4">
          <IconCircle size="lg">
            <SymbolIcon name={symbol} size={30} tintColor={colors.primary} />
          </IconCircle>
          <View className="items-center gap-2">
            <Text
              accessibilityRole="header"
              className="text-center text-2xl font-black tracking-tight text-foreground"
            >
              {title}
            </Text>
            {description ? (
              <Text className="text-center text-sm leading-5 text-muted-foreground">
                {description}
              </Text>
            ) : null}
          </View>
        </View>
        {notes.length ? (
          <View className="gap-4">
            {notesTitle ? <Eyebrow size="md">{notesTitle}</Eyebrow> : null}
            <ReleaseNoteList notes={notes} />
          </View>
        ) : null}
      </ScrollView>
      {status || actions ? (
        <View
          className="gap-3 border-t border-border px-5 pt-4"
          style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
        >
          {status}
          {actions}
        </View>
      ) : null}
    </View>
  );
}
