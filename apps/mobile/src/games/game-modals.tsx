import type { ReactNode } from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StudyAction } from "../components/study-glass";
import { useAppTheme } from "../providers/AppThemeProvider";
import { withOpacity } from "../theme/colors";
import { gameCatalog, type GameKey } from "./catalog";
import { SymbolIcon } from "../components/ui/symbol-icon";
import type { SymbolName } from "../components/ui/symbol-names";

const gameSymbols = {
  cards: "rectangle.stack.fill",
  "word-fall": "keyboard.fill",
  sentences: "text.bubble.fill",
  match: "link",
  "syllable-forge": "character.book.closed.fill",
  "stroke-master": "pencil",
  "word-builder": "text.word.spacing",
} satisfies Record<GameKey, SymbolName>;

/** The illustration of each game, shown at the top of Latihan's source sheet. */
export const gameHeroAssets = {
  cards: require("../../assets/games/cards-intro.png"),
  "word-fall": require("../../assets/games/word-fall-intro.png"),
  sentences: require("../../assets/games/sentences-intro.png"),
  match: require("../../assets/games/match-intro.png"),
  "syllable-forge": require("../../assets/games/syllable-forge-intro-v2.png"),
  "stroke-master": require("../../assets/games/hangeul-intro.png"),
  "word-builder": require("../../assets/games/word-builder-intro.png"),
} satisfies Record<GameKey, number>;

/**
 * A sheet over a running game: the pause of Hujan Kata and the round ends of
 * the Hangeul games. Vocabulary games end on `GameResult` instead.
 */
export function GameModal({
  gameKey,
  visible,
  eyebrow = "Sesi latihan",
  title,
  detail,
  content,
  primaryLabel,
  onPrimary,
  onDismiss,
  secondaryLabel,
  onSecondary,
  secondaryDisabled = false,
}: {
  gameKey: GameKey;
  visible: boolean;
  eyebrow?: string;
  title: string;
  detail: string;
  content?: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  onDismiss?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryDisabled?: boolean;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const game = gameCatalog[gameKey];
  return (
    <Modal
      allowSwipeDismissal={false}
      animationType="slide"
      backdropColor={colors.background}
      onDismiss={onDismiss}
      onRequestClose={() => {
        if (!secondaryDisabled) onSecondary?.();
      }}
      presentationStyle="formSheet"
      visible={visible}
    >
      <ScrollView
        accessibilityViewIsModal
        alwaysBounceVertical={false}
        contentContainerStyle={[
          styles.modalContent,
          {
            paddingBottom: Math.max(24, insets.bottom + 16),
            paddingTop: Math.max(24, insets.top + 16),
          },
        ]}
        style={[styles.modal, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.surface}>
          <View style={styles.heading}>
            <View
              style={[
                styles.icon,
                {
                  backgroundColor: withOpacity(colors.primary, 0.12),
                  borderColor: withOpacity(colors.primary, 0.2),
                },
              ]}
            >
              {gameKey === "stroke-master" || gameKey === "syllable-forge" ? (
                <Text style={[styles.iconFallback, { color: colors.primary }]}>
                  {game.icon}
                </Text>
              ) : (
                <SymbolIcon
                  name={gameSymbols[gameKey]}
                  size={24}
                  tintColor={colors.primary}
                  weight="bold"
                />
              )}
            </View>
            <View style={styles.headingCopy}>
              <Text style={[styles.eyebrow, { color: colors.primary }]}>
                {eyebrow}
              </Text>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                numberOfLines={2}
                style={[styles.title, { color: colors.foreground }]}
              >
                {title}
              </Text>
            </View>
          </View>
          <Text style={[styles.detail, { color: colors.mutedForeground }]}>
            {detail}
          </Text>
          {content ? (
            <View style={[styles.section, { borderColor: colors.border }]}>
              {content}
            </View>
          ) : null}
          <View style={[styles.actions, { borderColor: colors.border }]}>
            <StudyAction accessibilityLabel={primaryLabel} onPress={onPrimary}>
              {primaryLabel}
            </StudyAction>
            {secondaryLabel && onSecondary ? (
              <StudyAction
                accessibilityLabel={secondaryLabel}
                disabled={secondaryDisabled}
                onPress={onSecondary}
                secondary
              >
                {secondaryLabel}
              </StudyAction>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1 },
  modalContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  surface: { alignSelf: "center", gap: 22, maxWidth: 520, width: "100%" },
  heading: { alignItems: "center", flexDirection: "row", gap: 16 },
  headingCopy: { flex: 1, gap: 2, minWidth: 0 },
  icon: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  iconFallback: { fontSize: 18, fontWeight: "900" },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.7,
    lineHeight: 36,
  },
  detail: { fontSize: 15, lineHeight: 22 },
  section: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 20,
  },
  actions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
    paddingTop: 20,
  },
});
