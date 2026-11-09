import { HANGEUL_MASTERY_COURSE_ID } from "@hakgyo/shared/hangeul";
import { Image } from "expo-image";
import { router } from "expo-router";
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  LayoutAnimationConfig,
} from "react-native-reanimated";

import { authClient } from "../../lib/auth-client";
import { medalGlyph, useBadgeClaims } from "../../lib/badge-claims";
import type { OutlineProgress } from "../../lib/cohort-archive";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { CourseMedal } from "../hangeul-mastery-medal";
import { SymbolIcon } from "../ui/symbol-icon";
import type { LearnCohort } from "./cohort-card";

export type ArchivedClass = {
  cohort: LearnCohort;
  progress?: OutlineProgress;
};

function confirmRestore(title: string, onRestore: () => void) {
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      { title, options: ["Tampilkan lagi", "Batal"], cancelButtonIndex: 1 },
      (index) => {
        if (index === 0) onRestore();
      },
    );
    return;
  }
  Alert.alert(title, "Kembalikan kelas ini ke daftar kelas di atas?", [
    { text: "Batal", style: "cancel" },
    { text: "Tampilkan lagi", onPress: onRestore },
  ]);
}

function className(cohort: LearnCohort) {
  return cohort.selfPaced ? cohort.course.title : cohort.name;
}

function ArchivedClassRow({
  item,
  isLast,
  claimed,
  onRestore,
}: {
  item: ArchivedClass;
  isLast: boolean;
  /** Its badge was claimed: a small medal on the thumbnail. */
  claimed: boolean;
  onRestore: () => void;
}) {
  const { colors } = useAppTheme();
  const { cohort, progress } = item;
  const title = className(cohort);
  const subtitle = cohort.selfPaced ? "Kelas Mandiri" : cohort.course.title;
  const open = () =>
    router.push({
      pathname: "/courses/[courseId]",
      params: { courseId: cohort.course.id },
    });
  const restore = () => confirmRestore(title, onRestore);
  return (
    <Pressable
      accessibilityActions={[{ name: "restore", label: "Tampilkan lagi" }]}
      accessibilityHint="Membuka kurikulum. Tekan lama untuk menampilkan lagi."
      accessibilityRole="button"
      className={`flex-row items-center gap-3 py-2.5 active:opacity-60 ${isLast ? "" : "border-b border-border/60"}`}
      delayLongPress={350}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "restore") restore();
      }}
      onLongPress={restore}
      onPress={open}
    >
      <View>
        {cohort.course.thumbnailUrl ? (
          <Image
            accessibilityIgnoresInvertColors
            cachePolicy="memory-disk"
            contentFit="cover"
            source={{ uri: cohort.course.thumbnailUrl }}
            style={{ width: 36, height: 36, borderRadius: 10 }}
            transition={0}
          />
        ) : (
          <View
            className="items-center justify-center bg-muted"
            style={{ width: 36, height: 36, borderRadius: 10 }}
          >
            <Text className="text-sm font-black text-primary">
              {title.trim().charAt(0).toUpperCase() || "K"}
            </Text>
          </View>
        )}
        {claimed ? (
          <View style={{ position: "absolute", right: -5, bottom: -5 }}>
            <CourseMedal
              size={20}
              glyph={medalGlyph(
                cohort.course.title,
                cohort.course.id === HANGEUL_MASTERY_COURSE_ID,
              )}
            />
          </View>
        ) : null}
      </View>
      <View className="min-w-0 flex-1">
        <Text
          className="text-sm font-semibold text-foreground"
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {progress && progress.itemCount > 0 ? (
        <Text className="text-xs font-semibold tabular-nums text-muted-foreground">
          {progress.completedCount}/{progress.itemCount}
        </Text>
      ) : null}
      <SymbolIcon
        name="chevron.right"
        size={13}
        weight="semibold"
        tintColor={colors.mutedForeground}
      />
    </Pressable>
  );
}

/**
 * Finished or archived classes below the Belajar carousel: one row that
 * folds open into a compact list, like a settled inbox.
 */
export function ArchivedClasses({
  items,
  open,
  onToggle,
  onRestore,
}: {
  items: ArchivedClass[];
  open: boolean;
  onToggle: () => void;
  onRestore: (item: ArchivedClass) => void;
}) {
  const { colors } = useAppTheme();
  const { data: session } = authClient.useSession();
  const claims = useBadgeClaims(session?.user.id);
  if (items.length === 0) return null;
  return (
    <View className="gap-1">
      <Pressable
        accessibilityHint={open ? "Tutup daftar" : "Buka daftar"}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        className="flex-row items-center gap-3 py-3 active:opacity-60"
        onPress={onToggle}
      >
        <Text className="text-sm font-semibold text-muted-foreground">
          Diarsipkan ({items.length})
        </Text>
        <View className="h-px flex-1 bg-border" />
        <View style={open ? { transform: [{ rotate: "180deg" }] } : undefined}>
          <SymbolIcon
            name="chevron.down"
            size={13}
            weight="semibold"
            tintColor={colors.mutedForeground}
          />
        </View>
      </Pressable>
      {open ? (
        // Rows already there when the list opens skip the entrance; a class
        // filed away later (a claimed badge) slides in.
        <LayoutAnimationConfig skipEntering>
          <View>
            {items.map((item, index) => (
              <Animated.View
                entering={FadeInDown.springify().damping(14)}
                key={item.cohort.id}
              >
                <ArchivedClassRow
                  item={item}
                  isLast={index === items.length - 1}
                  claimed={!!claims[item.cohort.course.id]}
                  onRestore={() => onRestore(item)}
                />
              </Animated.View>
            ))}
          </View>
        </LayoutAnimationConfig>
      ) : null}
    </View>
  );
}
