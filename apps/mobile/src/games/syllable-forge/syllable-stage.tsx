import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { GlassBox } from "../../components/GlassBox";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { withOpacity } from "../../theme/colors";
import { blockText, type HangulBlock } from "./hangul-composer";

function ErrorFlash({ errorCount }: { errorCount: number }) {
  const { colors } = useAppTheme();
  const opacity = useSharedValue(0);
  useEffect(() => {
    if (!errorCount) return;
    opacity.value = withSequence(
      withTiming(1, { duration: 70 }),
      withDelay(220, withTiming(0, { duration: 180 })),
    );
  }, [errorCount, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.errorFlash,
        {
          backgroundColor: withOpacity(colors.destructive, 0.14),
          borderColor: colors.destructive,
        },
        style,
      ]}
    />
  );
}

function AnimatedBlock({
  block,
  active,
  correct,
  errorCount,
}: {
  block: HangulBlock;
  active: boolean;
  correct: boolean;
  errorCount: number;
}) {
  const { colors } = useAppTheme();
  const reducedMotion = useReducedMotion();
  const glyph = blockText(block);
  const characters = [block.initial, block.vowel, block.final].filter(Boolean);
  const glyphOpacity = useSharedValue(1);
  const glyphScale = useSharedValue(1);
  useEffect(() => {
    if (reducedMotion) return;
    glyphOpacity.value = 0.45;
    glyphScale.value = 0.9;
    glyphOpacity.value = withTiming(1, { duration: 140 });
    glyphScale.value = withSpring(1, { damping: 18, stiffness: 260 });
  }, [glyph, glyphOpacity, glyphScale, reducedMotion]);
  const glyphStyle = useAnimatedStyle(() => ({
    opacity: glyphOpacity.value,
    transform: [{ scale: glyphScale.value }],
  }));

  return (
    <View>
      <GlassBox
        glassEffectStyle="clear"
        tintColor={withOpacity(colors.primary, correct ? 0.2 : 0.06)}
        style={[
          styles.block,
          { borderColor: active || correct ? colors.primary : colors.border },
        ]}
      >
        <View
          accessible
          accessibilityLabel={glyph === " " ? "Spasi" : glyph}
          style={styles.blockContent}
        >
          <Animated.View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            pointerEvents="none"
            style={[styles.glyphLayer, glyphStyle]}
          >
            <Text style={[styles.glyph, { color: colors.foreground }]}>
              {glyph === " " ? "·" : glyph}
            </Text>
          </Animated.View>
          <ErrorFlash errorCount={active ? errorCount : 0} />
        </View>
      </GlassBox>
      <Text style={[styles.blockCaption, { color: colors.mutedForeground }]}>
        {characters.join(" + ") || "spasi"}
      </Text>
    </View>
  );
}

export function SyllableStage({
  blocks,
  correct,
  errorCount,
}: {
  blocks: HangulBlock[];
  correct: boolean;
  errorCount: number;
}) {
  const { colors } = useAppTheme();
  const shake = useSharedValue(0);
  const celebration = useSharedValue(1);
  useEffect(() => {
    if (errorCount)
      shake.value = withSequence(
        withTiming(-7, { duration: 60 }),
        withTiming(7, { duration: 70 }),
        withTiming(-4, { duration: 60 }),
        withTiming(0, { duration: 60 }),
      );
  }, [errorCount, shake]);
  useEffect(() => {
    if (correct)
      celebration.value = withSequence(
        withTiming(1.05, { duration: 140 }),
        withSpring(1),
      );
  }, [correct, celebration]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }, { scale: celebration.value }],
  }));
  return (
    <Animated.View style={style}>
      <View style={styles.stage}>
        {blocks.length ? (
          blocks.map((block, index) => (
            <AnimatedBlock
              key={index}
              block={block}
              active={index === blocks.length - 1}
              correct={correct}
              errorCount={errorCount}
            />
          ))
        ) : (
          <View style={styles.emptyWrapper}>
            <View
              style={[
                styles.empty,
                {
                  borderColor: colors.border,
                  backgroundColor: withOpacity(colors.primary, 0.04),
                },
              ]}
            >
              <Text style={[styles.placeholder, { color: colors.primary }]}>
                ＋
              </Text>
            </View>
            <Text
              style={[styles.blockCaption, { color: colors.mutedForeground }]}
            >
              Ketik huruf pertama
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  block: { width: 164, height: 164, borderWidth: 1, borderRadius: 28 },
  blockContent: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  glyphLayer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  glyph: {
    fontSize: 112,
    lineHeight: 124,
    fontWeight: "500",
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  errorFlash: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 2,
    borderRadius: 27,
    borderWidth: 2,
  },
  blockCaption: { fontSize: 13, textAlign: "center", marginTop: 10 },
  emptyWrapper: { alignItems: "center" },
  empty: {
    width: 164,
    height: 164,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: { fontSize: 48, fontWeight: "200" },
});
