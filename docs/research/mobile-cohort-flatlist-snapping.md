# Mobile cohort FlatList snapping

Research date: 2026-09-09
Repository version inspected: Expo 57.0.17 / React Native 0.86.3

## Conclusion

Render the Learn screen's cohorts with React Native `FlatList` in horizontal mode. For equal-width cards that leave part of the next card visible, snap by the complete item stride—card width plus gap—and disable interval momentum:

```tsx
const interval = cardWidth + gap;

<FlatList
  data={cohorts}
  horizontal
  keyExtractor={(cohort) => cohort.id}
  renderItem={({ item, index }) => (
    <View style={{ width: cardWidth }}>
      <CohortCard cohort={item} isFirst={index === 0} />
    </View>
  )}
  ItemSeparatorComponent={() => <View style={{ width: gap }} />}
  snapToInterval={interval}
  snapToAlignment="start"
  decelerationRate="fast"
  disableIntervalMomentum
  showsHorizontalScrollIndicator={false}
  getItemLayout={(_, index) => ({
    length: cardWidth,
    offset: interval * index,
    index,
  })}
/>
```

Expo SDK 57 targets React Native 0.86, which is also the version installed in this repository. Expo applications use React Native core components, so the authoritative component behavior is documented by React Native. [`FlatList` supports horizontal rendering and inherits `ScrollView` props](https://reactnative.dev/docs/0.86/flatlist), which makes the snapping props below valid on `FlatList`. [Expo SDK compatibility table](https://docs.expo.dev/versions/latest/#each-expo-sdk-version-depends-on-a-react-native-version)

## Why these props

- `horizontal` lays the cohorts out side by side. [React Native 0.86 `FlatList.horizontal`](https://reactnative.dev/docs/0.86/flatlist#horizontal)
- `snapToInterval={cardWidth + gap}` stops at multiples of the complete cohort stride. React Native specifically describes this as pagination for children smaller than the viewport and recommends combining it with `snapToAlignment` and `decelerationRate="fast"`. It overrides the less configurable `pagingEnabled`. [React Native 0.86 `snapToInterval`](https://reactnative.dev/docs/0.86/scrollview#snaptointerval)
- `snapToAlignment="start"` aligns each snapped card to the horizontal start edge. Use `"center"` only if the intended design is a centered active card and the leading/trailing content padding is calculated for that layout. [React Native 0.86 `snapToAlignment`](https://reactnative.dev/docs/0.86/scrollview#snaptoalignment)
- `disableIntervalMomentum` makes momentum stop on the next snap index relative to the release position, regardless of fling speed. This is the prop that prevents a fast release from gliding across several cohort snap points. A user can still deliberately drag across more than one full card before releasing; the documented guarantee applies to momentum after release. [React Native 0.86 `disableIntervalMomentum`](https://reactnative.dev/docs/0.86/scrollview#disableintervalmomentum)
- `decelerationRate="fast"` is the documented companion to interval/offset snapping and shortens the post-release glide. [React Native 0.86 `decelerationRate`](https://reactnative.dev/docs/0.86/scrollview#decelerationrate)
- `getItemLayout` avoids asynchronous width measurement when every horizontal item has a known width. Its offset must include separator width, hence `(cardWidth + gap) * index`. It is also required if the screen later uses `initialScrollIndex`, and it allows `scrollToIndex` to target items outside the current render window. [React Native 0.86 `getItemLayout`](https://reactnative.dev/docs/0.86/flatlist#getitemlayout), [`initialScrollIndex`](https://reactnative.dev/docs/0.86/flatlist#initialscrollindex), and [`scrollToIndex`](https://reactnative.dev/docs/0.86/flatlist#scrolltoindex)

## `pagingEnabled` versus interval snapping

`pagingEnabled` stops at multiples of the scroll view's own size. It is appropriate only when one cohort occupies exactly one list viewport. It is not the right primitive for a narrower card with a visible gap or a next-card preview. In that layout, `snapToInterval` should equal the measured card width plus every horizontal space between item starts. [React Native 0.86 `pagingEnabled`](https://reactnative.dev/docs/0.86/scrollview#pagingenabled)

Do not set both for this carousel: React Native states that `snapToInterval` overrides `pagingEnabled`.

If cohort widths are intentionally variable, calculate every item-start position and use `snapToOffsets` instead. That prop is intended for differently sized children and overrides both `pagingEnabled` and `snapToInterval`. [React Native 0.86 `snapToOffsets`](https://reactnative.dev/docs/0.86/scrollview#snaptooffsets)

## Sizing rules for exact snaps

Exact snapping depends on one source of truth for horizontal geometry:

1. Measure the carousel viewport or derive it from the window width.
2. Compute one fixed `cardWidth` from that value.
3. Apply that width to the immediate `renderItem` wrapper.
4. Put inter-card spacing in one place, preferably `ItemSeparatorComponent`.
5. Use the same `cardWidth + gap` value for `snapToInterval` and `getItemLayout.offset`.
6. Put leading/trailing carousel padding in `contentContainerStyle`; do not accidentally count that outer padding as part of every interval.

Avoid relying on implicit flex width or item margins that are absent from the interval calculation. Horizontal content padding changes where the first and last cards sit, while the interval remains the distance from one item start to the next.

## Tracking the active cohort

If the UI needs pagination dots or an active cohort ID, there are two supported hooks:

- `onViewableItemsChanged` reports rows that satisfy a stable `viewabilityConfig`. `itemVisiblePercentThreshold` measures how much of an item is visible, while `viewAreaCoveragePercentThreshold` measures viewport coverage. React Native warns that changing the configuration on the fly is unsupported, so create it once (for example with `useRef`). [React Native 0.86 viewability documentation](https://reactnative.dev/docs/0.86/flatlist#viewabilityconfig)
- When state should change only after the card settles, use `onMomentumScrollEnd` and derive the index as `Math.round(event.nativeEvent.contentOffset.x / interval)`. The event is documented to fire when the scroll view finishes gliding; the index formula is an inference from the documented interval snap positions. [React Native 0.86 `onMomentumScrollEnd`](https://reactnative.dev/docs/0.86/scrollview#onmomentumscrollend)

For this Learn carousel, equal-width cards plus `snapToInterval`, `disableIntervalMomentum`, and fixed `getItemLayout` are the simplest fit. Preserve the surrounding vertical screen scroll; the cohort list itself should own only the horizontal gesture and snapping behavior.
