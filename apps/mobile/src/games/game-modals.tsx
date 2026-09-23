import { Image } from "expo-image";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
  "syllable-forge": "character.book.closed.fill",
  "stroke-master": "pencil",
  "word-builder": "text.word.spacing",
} satisfies Record<GameKey, SymbolViewProps["name"]>;

const gameHeroAssets = {
  cards: require("../../assets/games/cards-intro.png"),
  "word-fall": require("../../assets/games/word-fall-intro.png"),
  sentences: require("../../assets/games/sentences-intro.png"),
  match: require("../../assets/games/match-intro.png"),
  "syllable-forge": require("../../assets/games/syllable-forge-intro-v2.png"),
  "stroke-master": require("../../assets/games/hangeul-intro.png"),
  "word-builder": require("../../assets/games/word-builder-intro.png"),
} satisfies Record<GameKey, number>;

function GameStartHero({ gameKey }: { gameKey: GameKey }) {
  return (
    <Image
      cachePolicy="memory-disk"
      contentFit="contain"
      priority="high"
      source={gameHeroAssets[gameKey]}
      style={styles.startHeroImage}
      transition={0}
    />
  );
}

function GameModalContent({
  gameKey,
  eyebrow,
  title,
  detail,
  hero,
  content,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  primaryDisabled = false,
  secondaryDisabled = false,
  tertiaryLabel,
  tertiaryDetail,
  onTertiary,
  tertiaryContent,
  showCloseButton = false,
}: {
  gameKey: GameKey;
  eyebrow: string;
  title: string;
  detail: string;
  hero?: ReactNode;
  content?: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  primaryDisabled?: boolean;
  secondaryDisabled?: boolean;
  tertiaryLabel?: string;
  tertiaryDetail?: string;
  onTertiary?: () => void;
  tertiaryContent?: ReactNode;
  showCloseButton?: boolean;
}) {
  const { colors } = useAppTheme();
  const game = gameCatalog[gameKey];
  return (
    <View style={styles.surface}>
      {showCloseButton && onSecondary ? (
        <Pressable
          accessibilityLabel="Close"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onSecondary}
          style={({ pressed }) => [
            styles.closeButton,
            {
              backgroundColor: colors.secondary,
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <SymbolView
            fallback={
              <Text
                style={[
                  styles.closeFallback,
                  { color: colors.mutedForeground },
                ]}
              >
                ×
              </Text>
            }
            name="xmark"
            size={14}
            tintColor={colors.mutedForeground}
            weight="bold"
          />
        </Pressable>
      ) : null}
      {hero ? <View style={styles.hero}>{hero}</View> : null}
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
        <StudyAction
          accessibilityLabel={primaryLabel}
          disabled={primaryDisabled}
          onPress={onPrimary}
        >
          {primaryLabel}
        </StudyAction>
        {tertiaryLabel && onTertiary ? (
          <Pressable
            accessibilityLabel={`${tertiaryLabel}${tertiaryDetail ? `, ${tertiaryDetail}` : ""}`}
            accessibilityRole="button"
            onPress={onTertiary}
            style={({ pressed }) => [
              styles.menuAction,
              {
                backgroundColor: pressed
                  ? withOpacity(colors.primary, 0.12)
                  : withOpacity(colors.primary, 0.06),
              },
            ]}
          >
            <Text style={[styles.menuActionLabel, { color: colors.primary }]}>
              {tertiaryLabel}
            </Text>
            {tertiaryDetail ? (
              <Text
                style={[
                  styles.menuActionDetail,
                  { color: colors.mutedForeground },
                ]}
              >
                {tertiaryDetail} ›
              </Text>
            ) : null}
          </Pressable>
        ) : null}
        {tertiaryContent ? (
          <View style={styles.menuContent}>{tertiaryContent}</View>
        ) : null}
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
  hero?: ReactNode;
  content?: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  onDismiss?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  primaryDisabled?: boolean;
  secondaryDisabled?: boolean;
  tertiaryLabel?: string;
  tertiaryDetail?: string;
  onTertiary?: () => void;
  tertiaryContent?: ReactNode;
  showCloseButton?: boolean;
  verticallyCentered?: boolean;
};

export function GameModal(props: GameModalProps) {
  const {
    gameKey,
    visible,
    eyebrow = "Practice session",
    title,
    detail,
    hero,
    content,
    primaryLabel,
    onPrimary,
    onDismiss,
    secondaryLabel,
    onSecondary,
    primaryDisabled = false,
    secondaryDisabled = false,
    tertiaryLabel,
    tertiaryDetail,
    onTertiary,
    tertiaryContent,
    showCloseButton = false,
    verticallyCentered = false,
  } = props;
  const onRequestClose = secondaryDisabled ? undefined : onSecondary;

  const contentNode = (
    <GameModalContent
      content={content}
      detail={detail}
      eyebrow={eyebrow}
      gameKey={gameKey}
      hero={hero}
      onPrimary={onPrimary}
      onSecondary={onSecondary}
      primaryDisabled={primaryDisabled}
      primaryLabel={primaryLabel}
      secondaryDisabled={secondaryDisabled}
      secondaryLabel={secondaryLabel}
      tertiaryLabel={tertiaryLabel}
      tertiaryDetail={tertiaryDetail}
      onTertiary={onTertiary}
      tertiaryContent={tertiaryContent}
      showCloseButton={showCloseButton}
      title={title}
    />
  );
  return (
    <NativeGameModal
      content={contentNode}
      onDismiss={onDismiss}
      onRequestClose={onRequestClose}
      verticallyCentered={verticallyCentered}
      visible={visible}
    />
  );
}

function NativeGameModal({
  content,
  onDismiss,
  onRequestClose,
  verticallyCentered = false,
  visible,
}: {
  content: ReactNode;
  onDismiss?: () => void;
  onRequestClose?: () => void;
  verticallyCentered?: boolean;
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
        <View
          style={[
            styles.modalBody,
            verticallyCentered && styles.modalBodyVerticallyCentered,
          ]}
        >
          {content}
        </View>
      </ScrollView>
    </Modal>
  );
}

export function GameStartModal({
  gameKey,
  visible,
  title,
  detail,
  hero,
  content,
  onPrimary,
  onDismiss,
  onSecondary,
  primaryLabel = "Start",
  primaryDisabled = false,
  secondaryLabel = "Back",
  tertiaryLabel,
  tertiaryDetail,
  onTertiary,
  tertiaryContent,
  closeButton = false,
}: {
  gameKey: GameKey;
  visible: boolean;
  title: string;
  detail: string;
  hero?: ReactNode;
  content?: ReactNode;
  onPrimary: () => void;
  onDismiss?: () => void;
  onSecondary: () => void;
  primaryLabel?: string;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  tertiaryLabel?: string;
  tertiaryDetail?: string;
  onTertiary?: () => void;
  tertiaryContent?: ReactNode;
  closeButton?: boolean;
}) {
  return (
    <GameModal
      content={content}
      detail={detail}
      eyebrow="Practice game"
      gameKey={gameKey}
      hero={hero ?? <GameStartHero gameKey={gameKey} />}
      onDismiss={onDismiss}
      onPrimary={onPrimary}
      onSecondary={onSecondary}
      primaryDisabled={primaryDisabled}
      primaryLabel={primaryLabel}
      secondaryLabel={closeButton ? undefined : secondaryLabel}
      tertiaryLabel={tertiaryLabel}
      tertiaryDetail={tertiaryDetail}
      onTertiary={onTertiary}
      tertiaryContent={tertiaryContent}
      showCloseButton={closeButton}
      title={title}
      verticallyCentered
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
  modalBodyVerticallyCentered: { flex: 1, justifyContent: "center" },
  surface: { gap: 22 },
  closeButton: {
    alignItems: "center",
    borderRadius: 22,
    height: 36,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    top: 0,
    width: 36,
    zIndex: 1,
  },
  closeFallback: { fontSize: 24, lineHeight: 28 },
  hero: { alignSelf: "stretch" },
  startHeroImage: { alignSelf: "center", height: 180, width: "100%" },
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
  menuAction: {
    alignItems: "center",
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  menuActionLabel: { fontSize: 15, fontWeight: "600" },
  menuActionDetail: { fontSize: 14 },
  menuContent: { paddingTop: 4 },
  finishFooter: {
    alignSelf: "stretch",
    maxHeight: 320,
  },
  finishFooterContent: { paddingBottom: 4 },
});
