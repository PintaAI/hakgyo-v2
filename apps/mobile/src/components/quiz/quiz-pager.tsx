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
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { PageDots } from "../learning-ui";

export type QuizPagerHandle = { scrollTo: (index: number) => void };

/** Space between two question pages. */
const PAGE_GAP = 12;

/** More pages than this show no dots: the question header's count and progress say it. */
const MAX_DOTS = 10;

/**
 * The horizontal pager of question pages, used wherever questions show one at
 * a time (Home's daily challenge, the attempt, the result review). Pages
 * differ in height, so the pager takes the height of the page in view and
 * blends between neighbours while it is dragged, instead of reserving the
 * tallest page's height. Only the page in view and its neighbours are mounted.
 *
 * `onIndexChange` reports a swipe; the owner decides whether the move stands
 * and calls `scrollTo` to put the pager back otherwise. Buttons and the
 * question list move it with `scrollTo` too. `swipeEnabled` off leaves only
 * those (sections that move forward only or by themselves).
 */
export function QuizPager({
  ref,
  count,
  initialIndex,
  swipeEnabled = true,
  onIndexChange,
  renderPage,
}: {
  ref: Ref<QuizPagerHandle>;
  count: number;
  initialIndex: number;
  swipeEnabled?: boolean;
  onIndexChange: (index: number) => void;
  renderPage: (index: number) => ReactNode;
}) {
  const [pageWidth, setPageWidth] = useState(0);
  // Pages sit a gap apart; one swipe moves a page and its gap.
  const interval = pageWidth + PAGE_GAP;
  const intervalValue = useSharedValue(interval);
  useEffect(() => {
    intervalValue.value = interval;
  }, [interval, intervalValue]);
  const list = useAnimatedRef<Animated.FlatList<number>>();
  /** Scroll offset in pages, for the dots and the height blend. */
  const position = useSharedValue(initialIndex);
  /** Measured page heights by index; 0 until a page has laid out. */
  const heights = useSharedValue<number[]>([]);
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
      if (intervalValue.value > PAGE_GAP) {
        position.value = event.contentOffset.x / intervalValue.value;
      }
    },
  });

  // The page in view drives the title, the navigator and the next button.
  useAnimatedReaction(
    () => Math.round(position.value),
    (current, previous) => {
      if (previous !== null && current !== previous) {
        scheduleOnRN(onIndexChange, current);
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

  return (
    <View className="gap-4" onLayout={measureWidth}>
      {count > 1 && count <= MAX_DOTS ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="items-center"
        >
          <PageDots count={count} position={position} />
        </View>
      ) : null}
      {pageWidth > 0 ? (
        // Clipped at the gutter: only the page in view shows, without the
        // edge of the next one peeking in.
        <Animated.View style={[{ overflow: "hidden" }, heightStyle]}>
          <Animated.FlatList
            ref={list}
            data={pages}
            // Answers live in the parent: re-render the pages when it does.
            extraData={renderPage}
            horizontal
            decelerationRate="fast"
            disableIntervalMomentum
            snapToInterval={interval}
            snapToAlignment="start"
            showsHorizontalScrollIndicator={false}
            // Pages keep their own height.
            contentContainerStyle={{ alignItems: "flex-start" }}
            getItemLayout={(_, index) => ({
              index,
              length: interval,
              offset: interval * index,
            })}
            initialScrollIndex={initialIndex > 0 ? initialIndex : undefined}
            // A page renders rich content and up to four option cards: keep
            // only the page in view and its neighbours mounted.
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
                  marginRight: page < count - 1 ? PAGE_GAP : 0,
                }}
                onLayout={(event) =>
                  measurePage(page, event.nativeEvent.layout.height)
                }
              >
                {renderPage(page)}
              </View>
            )}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}
