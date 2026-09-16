# Keyboard-aware vocabulary deck

Research date: 2026-09-15

## Recommendation

Make the active vocabulary round a keyboard-avoiding layout, not merely a keyboard-inset scroll view:

1. Put a full-height `KeyboardAvoidingView` around the active-round viewport, outside the flex-centered deck stage. On iOS, start with `behavior="padding"`; Expo says that is usually the best iOS behavior, and React Native defines this component specifically to adjust height, position, or bottom padding when the keyboard appears. [Expo keyboard handling guide](https://docs.expo.dev/guides/keyboard-handling/#keyboard-avoiding-view) [React Native `KeyboardAvoidingView`](https://reactnative.dev/docs/keyboardavoidingview)
2. Let the deck remain `flex: 1` plus `justifyContent: "center"` inside that adjusted viewport. When keyboard padding consumes the bottom portion, flexbox will center the deck in the remaining content box. This is an application-layout inference from the documented `padding` behavior; React Native 0.86.3 implements it by applying the calculated keyboard overlap as `paddingBottom` and synchronizes the update with the keyboard event's duration and easing. [React Native 0.86.3 implementation](https://github.com/react/react-native/blob/v0.86.3/packages/react-native/Libraries/Components/Keyboard/KeyboardAvoidingView.js)
3. Disable `automaticallyAdjustKeyboardInsets` for this active-round route once `KeyboardAvoidingView` owns keyboard avoidance. Running both would create two independent adjustments: one changes the scroll view's insets and the other changes the child layout. [React Native `ScrollView`](https://reactnative.dev/docs/scrollview#automaticallyadjustkeyboardinsets) [React Native `KeyboardAvoidingView`](https://reactnative.dev/docs/keyboardavoidingview)
4. Preserve explicit bottom clearance for the native toolbar in the deck stage. On iOS, Expo Router mounts its toolbar host as an absolute `1 x 1` bridge to the native toolbar, so that React element contributes no Yoga layout height. This means the keyboard-avoiding content box still needs an app-owned toolbar clearance if the deck must be centered above, rather than behind, the toolbar. [Expo Router SDK 57 iOS toolbar host](https://github.com/expo/expo/blob/sdk-57/packages/expo-router/src/toolbar/native.ios.tsx) [Expo Router SDK 57 toolbar bridge](https://github.com/expo/expo/blob/sdk-57/packages/expo-router/src/layouts/stack-utils/toolbar/StackToolbarClient.tsx)
5. If the screen begins beneath or behind a native header, calculate any required `keyboardVerticalOffset` from navigation state instead of hard-coding a device value. React Native defines the offset as the distance from the top of the screen to the React Native view, and React Navigation exposes `useHeaderHeight()` for the nearest visible header. [React Native offset reference](https://reactnative.dev/docs/keyboardavoidingview#keyboardverticaloffset) [React Navigation `useHeaderHeight`](https://reactnavigation.org/docs/elements/#useheaderheight)

Keep the existing Reanimated code for deck gestures and card transitions; keyboard ownership should remain at the screen-layout boundary.

## Why the current layout does not recenter

The vocabulary route enables both `automaticallyAdjustKeyboardInsets` and `fillViewport`. `StudyScreen` renders a full-height `ScrollView`, gives its content container `flexGrow: 1`, and gives the inner content view `flex: 1`. `VocabularySession` then centers the deck with a separate `flex: 1` / `justify-center` container while rendering the input and submit action through `Stack.Toolbar placement="bottom"`.

React Native documents `automaticallyAdjustKeyboardInsets` narrowly: on iOS it adjusts the scroll view's `contentInset` and scroll-indicator insets as keyboard size changes. It does not promise to change the scroll view's Yoga frame or the height used by descendants for flex centering. [React Native `ScrollView`](https://reactnative.dev/docs/scrollview#automaticallyadjustkeyboardinsets) The observed behavior follows from that distinction: the scrollable region can avoid or reveal content, but the deck's full-height flex parent still computes the same center.

`Stack.Toolbar` is native and its bottom placement is designed for native screen actions. It is also an alpha Expo Router API whose contract may change. [Expo Router Stack Toolbar](https://docs.expo.dev/router/advanced/stack-toolbar/) In SDK 57's iOS implementation, the React host is absolutely positioned at `1 x 1` and the native host installs items on the navigation controller's toolbar, confirming that it is not an ordinary bottom child participating in the vocabulary screen's flex layout. [Expo Router SDK 57 iOS host](https://github.com/expo/expo/blob/sdk-57/packages/expo-router/src/toolbar/native.ios.tsx) [Expo Router SDK 57 native host](https://github.com/expo/expo/blob/sdk-57/packages/expo-router/ios/Toolbar/RouterToolbarHostView.swift)

## Options considered

| Option                                        | Assessment                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Keep only `automaticallyAdjustKeyboardInsets` | Not sufficient for this requirement. Its documented responsibility is scroll-view insets, not recomputing a flex-centered stage's available height. [React Native `ScrollView`](https://reactnative.dev/docs/scrollview#automaticallyadjustkeyboardinsets)                                                                                                                                                                                                                                                                                 |
| React Native `KeyboardAvoidingView`           | Recommended baseline. It directly changes layout in response to the keyboard, requires no new dependency, and Expo recommends `padding` as the usual starting behavior on iOS. [Expo keyboard handling guide](https://docs.expo.dev/guides/keyboard-handling/#keyboard-avoiding-view)                                                                                                                                                                                                                                                      |
| Reanimated `useAnimatedKeyboard`              | Do not adopt. Reanimated 4.x marks it deprecated because of persistent iOS 26 bugs and directs users to `react-native-keyboard-controller`; the same deprecation is present in the installed 4.5.1 source. [Reanimated 4.x migration notice](https://docs.swmansion.com/react-native-reanimated/docs/device/useAnimatedKeyboard/#migration-guide) [Reanimated 4.5.1 source](https://github.com/software-mansion/react-native-reanimated/blob/4.5.1/packages/react-native-reanimated/src/hook/useAnimatedKeyboard.ts)                       |
| `react-native-keyboard-controller`            | Escalation path if device testing shows that interactive dismissal or frame-by-frame synchronization needs more control than `KeyboardAvoidingView`. Expo SDK 57 recommends version 1.21.9, and Expo's guide shows `useKeyboardHandler` supplying per-frame keyboard height to Reanimated shared values. [Expo SDK 57 package reference](https://docs.expo.dev/versions/v57.0.0/sdk/keyboard-controller/) [Expo advanced keyboard animation](https://docs.expo.dev/guides/keyboard-handling/#animating-views-in-sync-with-keyboard-height) |

## Suggested implementation shape

The active-round branch should conceptually become:

```text
screen content
└── KeyboardAvoidingView (flex: 1; iOS behavior: padding)
    ├── progress/status overlay
    └── deck stage (flex: 1; centered; bottom toolbar clearance)
        └── VocabularyPracticeDeck

Stack.Toolbar remains a native screen toolbar and does not determine deck-stage height.
```

Prefer a dedicated non-scrolling viewport for the active round, with scrolling retained for loading, error, summary, and very-small-screen fallback states. This keeps one component responsible for keyboard geometry and avoids coupling the reusable card deck to navigation or keyboard APIs.

## Validation criteria

Test on a physical iPhone or simulator with the keyboard closed, opening, open, and closing:

- The deck's center should track the unobscured rectangle above the toolbar and keyboard.
- The deck, hint, and toolbar must not overlap at the smallest supported portrait height.
- Interactive keyboard dismissal, rotation, and an iPad floating keyboard must not leave a stale offset.
- VoiceOver focus must still reach the toolbar input and submit action.
- Verify Android separately because React Native documents platform-specific `KeyboardAvoidingView` behavior. [React Native behavior reference](https://reactnative.dev/docs/keyboardavoidingview#behavior)

If the baseline layout passes except for interactive animation smoothness, adopt Expo's Keyboard Controller path rather than Reanimated's deprecated keyboard hook. [Expo advanced keyboard handling](https://docs.expo.dev/guides/keyboard-handling/#advanced-keyboard-handling-with-keyboard-controller) [Reanimated deprecation notice](https://docs.swmansion.com/react-native-reanimated/docs/device/useAnimatedKeyboard/#migration-guide)
