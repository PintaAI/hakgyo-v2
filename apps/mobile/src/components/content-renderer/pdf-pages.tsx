import { useEffect, useRef, useState } from "react";
import {
  formatPdfPageLabel,
  formatPdfPageRange,
  readPdfPageRange,
  type PdfBookPageResource,
} from "@hakgyo/shared";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  View,
  type ViewToken,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { useContentRenderer } from "./context";
import type { AssetUrlResolver, BlockRendererProps } from "./types";

function usePageUrl(
  assetId: string,
  resolveAssetUrl: AssetUrlResolver | undefined,
  attempt: number,
) {
  const [state, setState] = useState<{
    key: string;
    url: string | null;
  } | null>(null);
  const key = `${assetId}:${attempt}`;

  useEffect(() => {
    let active = true;
    if (!resolveAssetUrl) return;
    void resolveAssetUrl(assetId)
      .then((url) => {
        if (active) setState({ key, url });
      })
      .catch(() => {
        if (active) setState({ key, url: null });
      });
    return () => {
      active = false;
    };
  }, [assetId, key, resolveAssetUrl]);

  if (!resolveAssetUrl) return { url: null, failed: true };
  const current = state?.key === key ? state : null;
  return {
    url: current?.url ?? null,
    failed: current !== null && !current.url,
  };
}

/**
 * Book pages from a PDF, swiped like an e-reader. Only nearby pages are
 * mounted, which keeps memory flat for long ranges on older phones.
 */
export function PdfPages({ block }: BlockRendererProps) {
  const { resourceReferences, resolveAssetUrl, onReadingProgress } =
    useContentRenderer();
  const range = readPdfPageRange(block);
  const book = range
    ? resourceReferences?.pdfBooks?.find((item) => item.id === range.bookId)
    : undefined;
  const pages =
    book && range
      ? book.pages.filter(
          (page) =>
            page.pageNumber >= range.startPage &&
            page.pageNumber <= range.endPage,
        )
      : [];
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const list = useRef<FlatList<PdfBookPageResource>>(null);
  const progressKey = block.id ?? `${range?.bookId}:${range?.startPage}`;
  const finished = pages.length > 0 && index >= pages.length - 1;

  useEffect(() => {
    if (!pages.length) return;
    onReadingProgress?.(progressKey, finished);
  }, [finished, onReadingProgress, pages.length, progressKey]);

  useEffect(
    () => () => onReadingProgress?.(progressKey, true),
    [onReadingProgress, progressKey],
  );

  const viewable = useRef(
    ({
      viewableItems,
    }: {
      viewableItems: ViewToken<PdfBookPageResource>[];
    }) => {
      const first = viewableItems[0];
      if (first?.index != null) setIndex(first.index);
    },
  ).current;

  if (!book || !range || pages.length === 0) {
    return (
      <View className="rounded-xl border border-dashed border-border p-5">
        <Text className="text-sm text-muted-foreground">
          PDF pages unavailable. Connect to the internet to download them.
        </Text>
      </View>
    );
  }

  const tallest = Math.max(...pages.map((page) => page.height / page.width));
  const height = width * tallest;
  const current = pages[index] ?? pages[0]!;

  function goTo(next: number) {
    const target = Math.max(0, Math.min(pages.length - 1, next));
    list.current?.scrollToIndex({ index: target, animated: true });
    setIndex(target);
  }

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
            {book.title}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {formatPdfPageRange(
              range.startPage,
              range.endPage,
              book.pageOffset,
            )}
          </Text>
        </View>
        <Text
          accessibilityLiveRegion="polite"
          className="text-xs font-semibold text-muted-foreground"
        >
          Page {formatPdfPageLabel(current.pageNumber, book.pageOffset)} ·{" "}
          {index + 1}/{pages.length}
        </Text>
      </View>

      <View
        className="w-full overflow-hidden rounded-xl border border-border bg-white"
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={{ height: height || undefined, minHeight: 200 }}
      >
        {width > 0 ? (
          <FlatList
            ref={list}
            data={pages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(page) => String(page.pageNumber)}
            getItemLayout={(_data, itemIndex) => ({
              length: width,
              offset: width * itemIndex,
              index: itemIndex,
            })}
            initialNumToRender={1}
            maxToRenderPerBatch={2}
            windowSize={3}
            removeClippedSubviews
            onViewableItemsChanged={viewable}
            viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
            renderItem={({ item, index: itemIndex }) => (
              <PdfPageImage
                page={item}
                width={width}
                height={height}
                label={`Page ${formatPdfPageLabel(item.pageNumber, book.pageOffset)} of ${book.title}`}
                resolveAssetUrl={resolveAssetUrl}
                onPress={() => setZoomIndex(itemIndex)}
              />
            )}
          />
        ) : null}
      </View>

      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous page"
          disabled={index === 0}
          onPress={() => goTo(index - 1)}
          className="rounded-lg border border-border px-4 py-2.5 disabled:opacity-40"
        >
          <Text className="text-sm font-semibold text-foreground">‹ Prev</Text>
        </Pressable>
        <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <View
            className="h-full rounded-full bg-primary"
            style={{ width: `${((index + 1) / pages.length) * 100}%` }}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next page"
          disabled={finished}
          onPress={() => goTo(index + 1)}
          className="rounded-lg border border-border px-4 py-2.5 disabled:opacity-40"
        >
          <Text className="text-sm font-semibold text-foreground">Next ›</Text>
        </Pressable>
      </View>
      <Text className="text-center text-xs text-muted-foreground">
        Swipe to turn pages · tap a page to zoom
      </Text>

      <PdfZoomViewer
        pages={pages}
        pageOffset={book.pageOffset}
        index={zoomIndex}
        resolveAssetUrl={resolveAssetUrl}
        onIndexChange={(next) => {
          setZoomIndex(next);
          goTo(next);
        }}
        onClose={() => setZoomIndex(null)}
      />
    </View>
  );
}

function PdfPageImage({
  page,
  width,
  height,
  label,
  resolveAssetUrl,
  onPress,
}: {
  page: PdfBookPageResource;
  width: number;
  height: number;
  label: string;
  resolveAssetUrl: AssetUrlResolver | undefined;
  onPress: () => void;
}) {
  const [attempt, setAttempt] = useState(0);
  const { url, failed } = usePageUrl(page.assetId, resolveAssetUrl, attempt);
  return (
    <View style={{ width, height }} className="items-center justify-center">
      {url ? (
        <Pressable
          accessibilityRole="imagebutton"
          accessibilityLabel={`Zoom ${label}`}
          onPress={onPress}
          style={{ width: "100%", height: "100%" }}
        >
          <Image
            accessibilityIgnoresInvertColors
            accessibilityLabel={label}
            cachePolicy="memory-disk"
            contentFit="contain"
            recyclingKey={page.assetId}
            source={{ uri: url }}
            style={{ width: "100%", height: "100%" }}
            transition={0}
          />
        </Pressable>
      ) : failed ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setAttempt((value) => value + 1)}
          className="items-center gap-2 px-6"
        >
          <Text className="text-center text-sm text-neutral-700">
            Page unavailable. Tap to retry.
          </Text>
        </Pressable>
      ) : (
        <ActivityIndicator color="#111111" />
      )}
    </View>
  );
}

function PdfZoomViewer({
  pages,
  pageOffset,
  index,
  resolveAssetUrl,
  onIndexChange,
  onClose,
}: {
  pages: PdfBookPageResource[];
  pageOffset: number;
  index: number | null;
  resolveAssetUrl: AssetUrlResolver | undefined;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const page = index === null ? null : pages[index];
  return (
    <Modal
      visible={Boolean(page)}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#111111" }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View className="flex-row items-center justify-between gap-3 px-5 py-3">
            <Text className="text-sm text-white">
              {page
                ? `Page ${formatPdfPageLabel(page.pageNumber, pageOffset)} · ${(index ?? 0) + 1}/${pages.length}`
                : ""}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              className="rounded-lg px-4 py-3"
            >
              <Text className="font-bold text-white">Close</Text>
            </Pressable>
          </View>
          {page ? (
            <ZoomablePage
              key={page.assetId}
              page={page}
              label={`Page ${formatPdfPageLabel(page.pageNumber, pageOffset)}`}
              resolveAssetUrl={resolveAssetUrl}
            />
          ) : null}
          <View className="flex-row justify-between gap-4 p-4">
            <Pressable
              accessibilityRole="button"
              disabled={!index}
              onPress={() => index && onIndexChange(index - 1)}
              className="rounded-lg bg-white/15 px-5 py-3 disabled:opacity-40"
            >
              <Text className="text-white">‹ Previous</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={index === null || index >= pages.length - 1}
              onPress={() => index !== null && onIndexChange(index + 1)}
              className="rounded-lg bg-white/15 px-5 py-3 disabled:opacity-40"
            >
              <Text className="text-white">Next ›</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    </Modal>
  );
}

function ZoomablePage({
  page,
  label,
  resolveAssetUrl,
}: {
  page: PdfBookPageResource;
  label: string;
  resolveAssetUrl: AssetUrlResolver | undefined;
}) {
  const { url } = usePageUrl(page.assetId, resolveAssetUrl, 0);
  const [viewport, setViewport] = useState({ width: 1, height: 1 });
  const fit = Math.min(
    viewport.width / page.width,
    viewport.height / page.height,
  );
  const width = page.width * fit;
  const height = page.height * fit;
  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const clamp = (value: number, max: number) =>
    Math.max(-max, Math.min(max, value));
  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = Math.max(1, Math.min(4, startScale.value * event.scale));
      const maxX = Math.max(0, (width * scale.value - viewport.width) / 2);
      const maxY = Math.max(0, (height * scale.value - viewport.height) / 2);
      x.value = clamp(x.value, maxX);
      y.value = clamp(y.value, maxY);
    });
  const pan = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => {
      startX.value = x.value;
      startY.value = y.value;
    })
    .onUpdate((event) => {
      const maxX = Math.max(0, (width * scale.value - viewport.width) / 2);
      const maxY = Math.max(0, (height * scale.value - viewport.height) / 2);
      x.value = clamp(startX.value + event.translationX, maxX);
      y.value = clamp(startY.value + event.translationY, maxY);
    });
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value = withTiming(scale.value > 1 ? 1 : 2);
      x.value = withTiming(0);
      y.value = withTiming(0);
    });
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View
      style={{ flex: 1, overflow: "hidden" }}
      onLayout={(event) => setViewport(event.nativeEvent.layout)}
    >
      <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
        <View
          collapsable={false}
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          {url ? (
            <Animated.View style={[{ width, height }, style]}>
              <Image
                accessibilityIgnoresInvertColors
                accessibilityLabel={label}
                allowDownscaling={false}
                cachePolicy="memory-disk"
                contentFit="contain"
                source={{ uri: url }}
                style={{ width: "100%", height: "100%" }}
              />
            </Animated.View>
          ) : (
            <ActivityIndicator color="#ffffff" />
          )}
        </View>
      </GestureDetector>
    </View>
  );
}
