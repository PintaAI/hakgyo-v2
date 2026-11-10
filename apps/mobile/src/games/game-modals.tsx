import type { ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HeroTile } from "../components/hero-tile";
import {
  LearningFooterView,
  useLearningContinuation,
} from "../components/learn/course-learning-footer";
import { getLearningItemTypeMeta } from "../lib/learning-item-type";
import { GlassBox } from "../components/GlassBox";
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
        {showCloseButton && onSecondary ? (
          <GlassBox
            isInteractive
            glassEffectStyle="clear"
            tintColor={withOpacity(colors.mutedForeground, 0.12)}
            style={styles.closeGlass}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tutup"
              hitSlop={2}
              onPress={onSecondary}
              style={styles.closeButton}
            >
              <SymbolIcon
                name="xmark"
                size={16}
                tintColor={colors.foreground}
                weight="bold"
              />
            </Pressable>
          </GlassBox>
        ) : null}
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
              <View
                style={{ alignItems: "center", flexDirection: "row", gap: 2 }}
              >
                <Text
                  style={[
                    styles.menuActionDetail,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {tertiaryDetail}
                </Text>
                <SymbolIcon
                  name="chevron.right"
                  size={12}
                  weight="semibold"
                  tintColor={colors.mutedForeground}
                />
              </View>
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
    eyebrow = "Sesi latihan",
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

/**
 * Where the course goes after a game opened from one of its activities, in
 * the app's pattern: a `HeroTile` to the next activity once this one is done,
 * or the locked "Berikutnya" row while a vocabulary set still has words to
 * learn. A game opened from a material leads back to it (pulling there goes
 * on), so it shows nothing until the material is done.
 */
export function GameJourneyFooter({
  courseId,
  courseItemId,
}: {
  courseId?: string;
  courseItemId?: string;
  /** Kept for callers; the footer no longer scrolls on its own. */
  scrollable?: boolean;
}) {
  if (!courseId || !courseItemId) return null;
  return <CourseNextStep courseId={courseId} courseItemId={courseItemId} />;
}

function CourseNextStep({
  courseId,
  courseItemId,
}: {
  courseId: string;
  courseItemId: string;
}) {
  const { colors } = useAppTheme();
  const learning = useLearningContinuation({
    courseId,
    courseItemId,
    chapterSheet: false,
  });
  const path = learning.path;
  if (!path) return null;
  if (!path.item.isCompleted) {
    if (path.item.type !== "VOCABULARY_SET") return null;
    return (
      <View style={styles.nextStep}>
        <LearningFooterView
          courseId={courseId}
          courseItemId={courseItemId}
          learning={learning}
          compact
          continueButton="screenReader"
          nextLocked
        />
        <Text style={[styles.nextHint, { color: colors.mutedForeground }]}>
          Lanjut setelah semua kata di set ini dijawab benar tanpa melihat
          jawabannya.
        </Text>
      </View>
    );
  }
  const next = path.nextItem;
  const meta = next ? getLearningItemTypeMeta(next.type) : null;
  return (
    <View style={styles.nextStep}>
      <HeroTile
        eyebrow={
          next && meta
            ? `Berikutnya · ${meta.label}`
            : path.courseCompleted
              ? "Kurikulum selesai"
              : `Bab ${path.moduleIndex + 1}`
        }
        title={next ? next.title : "Kembali ke kurikulum"}
        meta={`Bab ${path.moduleIndex + 1} · ${path.completedCount}/${path.module.items.length} selesai`}
        pill={next ? "Lanjutkan" : "Buka"}
        loading={learning.busy}
        onPress={() => void learning.continueLearning()}
      />
      {learning.issue?.kind === "error" ? (
        <Text
          accessibilityRole="alert"
          style={[styles.nextHint, { color: colors.destructive }]}
        >
          {learning.issue.message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  nextStep: { gap: 10 },
  nextHint: { fontSize: 13, lineHeight: 18 },
  modal: { flex: 1 },
  modalContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  modalBody: { alignSelf: "center", maxWidth: 520, width: "100%" },
  modalBodyVerticallyCentered: { flex: 1, justifyContent: "center" },
  surface: { gap: 22 },
  closeGlass: {
    alignItems: "center",
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    overflow: "hidden",
    width: 40,
  },
  closeButton: {
    alignItems: "center",
    height: "100%",
    justifyContent: "center",
    width: "100%",
  },
  closeFallback: { fontSize: 22, fontWeight: "700", lineHeight: 24 },
  hero: { alignSelf: "stretch" },
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
});
