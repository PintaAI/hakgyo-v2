import {
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { type LayoutChangeEvent, View } from "react-native";
import Animated, {
  type SharedValue,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { useAppTheme } from "../../providers/AppThemeProvider";
import { SymbolIcon } from "./symbol-icon";

export type PagerHandle = { scrollTo: (index: number) => void };

/**
 * A horizontal pager whose height follows the page in view: pages differ in
 * height, so it takes the height of the page in view and blends between
 * neighbours while it is dragged, instead of every page taking the tallest
 * one's height and leaving space under the short ones. Only the page in view
 * and its neighbours are mounted. Used by the quiz screens (`QuizPager`) and
 * Belajar's cohort cards.
 *
 * - `onIndexChange` reports the page a swipe lands on (as it passes halfway);
 *   `scrollTo` moves the pager from buttons, lists or a refused swipe, and
 *   leaves a page already in view alone so it never fights a gesture.
 * - `bleed` reaches out over the screen gutter so pages slide in from the
 *   screen edge; `gap` spaces pages apart; `nextArrow` shows a chevron in the
 *   right gutter while another page follows (needs a bleed to sit in).
 * - `position` lets the owner read the scroll offset in pages (page dots).
 */
export function Pager({
  ref,
  count,
  initialIndex = 0,
  swipeEnabled = true,
  gap = 0,
  bleed = 0,
  nextArrow,
  position: ownerPosition,
  accessibilityRole,
  onIndexChange,
  renderPage,
}: {
  ref?: Ref<PagerHandle>;
  count: number;
  initialIndex?: number;
  swipeEnabled?: boolean;
  gap?: number;
  bleed?: number;
  /** Shows the next-page chevron this far from the top. */
  nextArrow?: { top: number };
  position?: SharedValue<number>;
  accessibilityRole?: "list";
  onIndexChange?: (index: number) => void;
  renderPage: (index: number) => ReactNode;
}) {
  const [pageWidth, setPageWidth] = useState(0);
  // Pages sit a gap apart; one swipe moves a page and its gap.
  const interval = pageWidth + gap;
  const intervalValue = useSharedValue(interval);
  useEffect(() => {
    intervalValue.value = interval;
  }, [interval, intervalValue]);
  const list = useAnimatedRef<Animated.FlatList<number>>();
  /** Scroll offset in pages, for the height blend (and the owner's dots). */
  const ownPosition = useSharedValue(initialIndex);
  const position = ownerPosition ?? ownPosition;
  useEffect(() => {
    position.value = initialIndex;
    // Once: the scroll handler keeps it current from then on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /** Measured page heights by index; 0 until a page has laid out. */
  const heights = useSharedValue<number[]>([]);
  const { colors } = useAppTheme();
  const pages = useMemo(
    () => Array.from({ length: count }, (_, page) => page),
    [count],
  );

  useImperativeHandle(
    ref,
    () => ({
      scrollTo: (index) => {
        // Already there (a swipe the owner accepted): leave the gesture be.
        if (pageWidth <= 0 || Math.round(position.value) === index) return;
        list.current?.scrollToOffset({
          offset: interval * index,
          animated: true,
        });
      },
    }),
    [interval, list, pageWidth, position],
  );

  const measureWidth = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== pageWidth) setPageWidth(nextWidth);
  };

  const measurePage = useCallback(
    (index: number, height: number) => {
      heights.modify((current) => {
        "worklet";
        if (current[index] === height) return current;
        const next = current.slice();
        next[index] = height;
        return next;
      });
    },
    [heights],
  );

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (intervalValue.value > gap) {
        position.value = event.contentOffset.x / intervalValue.value;
      }
    },
  });

  const reportIndex = useCallback(
    (index: number) => onIndexChange?.(index),
    [onIndexChange],
  );
  useAnimatedReaction(
    () => Math.round(position.value),
    (current, previous) => {
      if (previous !== null && current !== previous) {
        scheduleOnRN(reportIndex, current);
      }
    },
  );

  const heightStyle = useAnimatedStyle(() => {
    const list = heights.value;
    const from = Math.max(0, Math.min(count - 1, Math.floor(position.value)));
    const to = Math.min(count - 1, from + 1);
    const progress = Math.max(0, Math.min(1, position.value - from));
    const fromHeight = list[from] || list[to] || 0;
    const toHeight = list[to] || fromHeight;
    const height = fromHeight + (toHeight - fromHeight) * progress;
    // Unmeasured: let the list size itself for the first layout.
    return height > 0 ? { height } : {};
  });

  // The arrow shows at rest when a page follows, and fades out as a swipe
  // begins so it never sits over a page sliding by.
  const arrowStyle = useAnimatedStyle(() => {
    const page = Math.round(position.value);
    const drift = Math.abs(position.value - page);
    return {
      opacity: page < count - 1 ? Math.max(0, 1 - drift * 6) : 0,
    };
  });

  return (
    <View onLayout={measureWidth}>
      {pageWidth > 0 ? (
        <Animated.View style={[{ marginHorizontal: -bleed }, heightStyle]}>
          <Animated.FlatList
            accessibilityRole={accessibilityRole}
            // Over the gutter nothing clips a page as it slides by.
            style={{ overflow: "visible" }}
            ref={list}
            data={pages}
            // Page content lives in the owner: re-render the pages when it does.
            extraData={renderPage}
            horizontal
            decelerationRate="fast"
            disableIntervalMomentum
            snapToInterval={interval}
            snapToAlignment="start"
            showsHorizontalScrollIndicator={false}
            // Pages keep their own height; the bleed pads the first and last.
            contentContainerStyle={{
              alignItems: "flex-start",
              paddingHorizontal: bleed,
            }}
            getItemLayout={(_, index) => ({
              index,
              length: interval,
              offset: interval * index,
            })}
            initialScrollIndex={initialIndex > 0 ? initialIndex : undefined}
            // Pages hold rich content: keep only the page in view and its
            // neighbours mounted.
            initialNumToRender={1}
            maxToRenderPerBatch={1}
            windowSize={3}
            keyExtractor={(page) => String(page)}
            onScroll={onScroll}
            scrollEventThrottle={16}
            scrollEnabled={swipeEnabled && count > 1}
            renderItem={({ item: page }) => (
              <View
                style={{
                  width: pageWidth,
                  marginRight: page < count - 1 ? gap : 0,
                }}
                onLayout={(event) =>
                  measurePage(page, event.nativeEvent.layout.height)
                }
              >
                {renderPage(page)}
              </View>
            )}
          />
          {nextArrow && bleed > 0 && swipeEnabled && count > 1 ? (
            <Animated.View
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              className="absolute right-0 items-center"
              style={[{ top: nextArrow.top, width: bleed }, arrowStyle]}
            >
              <SymbolIcon
                name="chevron.right"
                size={14}
                weight="semibold"
                tintColor={colors.mutedForeground}
              />
            </Animated.View>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
}
