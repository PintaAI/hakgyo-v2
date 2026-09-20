import { SymbolView, type SymbolViewProps } from "expo-symbols";
import type { ReactNode } from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CourseLearningFooter } from "../components/learn/course-learning-footer";
import { StudyAction } from "../components/study-glass";
import { useAppTheme } from "../providers/AppThemeProvider";
import { withOpacity } from "../theme/colors";
import { gameCatalog, type GameKey } from "./catalog";

const gameSymbols = {
  cards: "rectangle.stack.fill",
  "word-fall": "keyboard.fill",
  sentences: "text.bubble.fill",
  match: "link",
} satisfies Record<GameKey, SymbolViewProps["name"]>;

function GameModalContent({
  gameKey,
  eyebrow,
  title,
  detail,
  content,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  primaryDisabled = false,
  secondaryDisabled = false,
}: {
  gameKey: GameKey;
  eyebrow: string;
  title: string;
  detail: string;
  content?: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  primaryDisabled?: boolean;
  secondaryDisabled?: boolean;
}) {
  const { colors } = useAppTheme();
  const game = gameCatalog[gameKey];
  return (
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
          <SymbolView
            fallback={
              <Text style={[styles.iconFallback, { color: colors.primary }]}>
                {game.icon}
              </Text>
            }
            name={gameSymbols[gameKey]}
            size={24}
            tintColor={colors.primary}
            weight="bold"
          />
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
        <StudyAction
          accessibilityLabel={primaryLabel}
          disabled={primaryDisabled}
          onPress={onPrimary}
        >
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
  );
}

type GameModalProps = {
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
  primaryDisabled?: boolean;
  secondaryDisabled?: boolean;
};

export function GameModal(props: GameModalProps) {
  const {
    gameKey,
    visible,
    eyebrow = "Practice session",
    title,
    detail,
    content,
    primaryLabel,
    onPrimary,
    onDismiss,
    secondaryLabel,
    onSecondary,
    primaryDisabled = false,
    secondaryDisabled = false,
  } = props;
  const onRequestClose = secondaryDisabled ? undefined : onSecondary;

  const contentNode = (
    <GameModalContent
      content={content}
      detail={detail}
      eyebrow={eyebrow}
      gameKey={gameKey}
      onPrimary={onPrimary}
      onSecondary={onSecondary}
      primaryDisabled={primaryDisabled}
      primaryLabel={primaryLabel}
      secondaryDisabled={secondaryDisabled}
      secondaryLabel={secondaryLabel}
      title={title}
    />
  );
  return (
    <NativeGameModal
      content={contentNode}
      onDismiss={onDismiss}
      onRequestClose={onRequestClose}
      visible={visible}
    />
  );
}

function NativeGameModal({
  content,
  onDismiss,
  onRequestClose,
  visible,
}: {
  content: ReactNode;
  onDismiss?: () => void;
  onRequestClose?: () => void;
  visible: boolean;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      allowSwipeDismissal={false}
      animationType="slide"
      backdropColor={colors.background}
      onDismiss={onDismiss}
      onRequestClose={() => onRequestClose?.()}
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
        <View style={styles.modalBody}>{content}</View>
      </ScrollView>
    </Modal>
  );
}

export function GameStartModal({
  gameKey,
  visible,
  title,
  detail,
  content,
  onPrimary,
  onDismiss,
  onSecondary,
  primaryLabel = "Start",
  secondaryLabel = "Back",
}: {
  gameKey: GameKey;
  visible: boolean;
  title: string;
  detail: string;
  content?: ReactNode;
  onPrimary: () => void;
  onDismiss?: () => void;
  onSecondary: () => void;
  primaryLabel?: string;
  secondaryLabel?: string;
}) {
  return (
    <GameModal
      content={content}
      detail={detail}
      eyebrow="Practice game"
      gameKey={gameKey}
      onDismiss={onDismiss}
      onPrimary={onPrimary}
      onSecondary={onSecondary}
      primaryLabel={primaryLabel}
      secondaryLabel={secondaryLabel}
      title={title}
      visible={visible}
    />
  );
}

export function GameJourneyFooter({
  courseId,
  courseItemId,
  scrollable = true,
}: {
  courseId?: string;
  courseItemId?: string;
  scrollable?: boolean;
}) {
  if (!courseId || !courseItemId) return null;
  const footer = (
    <CourseLearningFooter courseId={courseId} courseItemId={courseItemId} />
  );
  if (!scrollable) return footer;
  return (
    <ScrollView
      style={styles.finishFooter}
      contentContainerStyle={styles.finishFooterContent}
      showsVerticalScrollIndicator={false}
    >
      {footer}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1 },
  modalContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  modalBody: { alignSelf: "center", maxWidth: 520, width: "100%" },
  surface: { gap: 22 },
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
  finishFooter: {
    alignSelf: "stretch",
    maxHeight: 320,
  },
  finishFooterContent: { paddingBottom: 4 },
});
