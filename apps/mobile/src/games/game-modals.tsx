import type { ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { CourseLearningFooter } from "../components/learn/course-learning-footer";
import { useAppTheme } from "../providers/AppThemeProvider";
import { withOpacity } from "../theme/colors";

export function GameModal({
  visible,
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
  visible: boolean;
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
  return (
    <Modal
      animationType="fade"
      onRequestClose={() => {
        if (onSecondary && !secondaryDisabled) onSecondary();
        else if (!primaryDisabled) onPrimary();
      }}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}
    >
      <View
        accessibilityViewIsModal
        style={[
          styles.backdrop,
          { backgroundColor: withOpacity(colors.background, 0.8) },
        ]}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.title, { color: colors.foreground }]}>
            {title}
          </Text>
          <Text style={[styles.detail, { color: colors.mutedForeground }]}>
            {detail}
          </Text>
          {content}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: primaryDisabled }}
            disabled={primaryDisabled}
            onPress={onPrimary}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: colors.primary,
                opacity: primaryDisabled ? 0.5 : pressed ? 0.72 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.primaryButtonText,
                { color: colors.primaryForeground },
              ]}
            >
              {primaryLabel}
            </Text>
          </Pressable>
          {secondaryLabel && onSecondary ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: secondaryDisabled }}
              disabled={secondaryDisabled}
              onPress={onSecondary}
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  backgroundColor: colors.muted,
                  opacity: secondaryDisabled ? 0.5 : pressed ? 0.72 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  { color: colors.foreground },
                ]}
              >
                {secondaryLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

export function GameStartModal({
  visible,
  title,
  detail,
  content,
  onPrimary,
  onSecondary,
  primaryLabel = "Start",
  secondaryLabel = "Back",
}: {
  visible: boolean;
  title: string;
  detail: string;
  content?: ReactNode;
  onPrimary: () => void;
  onSecondary: () => void;
  primaryLabel?: string;
  secondaryLabel?: string;
}) {
  return (
    <GameModal
      content={content}
      detail={detail}
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
  backdrop: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 14,
    maxHeight: "92%",
    maxWidth: 420,
    padding: 24,
    width: "100%",
  },
  title: { fontSize: 26, fontWeight: "900", textAlign: "center" },
  detail: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  primaryButton: {
    alignItems: "center",
    borderRadius: 14,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primaryButtonText: { fontSize: 15, fontWeight: "800" },
  secondaryButton: {
    alignItems: "center",
    borderRadius: 14,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: "700" },
  finishFooter: {
    alignSelf: "stretch",
    maxHeight: 320,
    paddingTop: 12,
  },
  finishFooterContent: { paddingBottom: 4 },
});
