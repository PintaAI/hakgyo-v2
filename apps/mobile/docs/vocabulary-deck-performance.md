# Vocabulary deck performance audit

Target: smooth 60 FPS (16.67 ms per frame) with the existing card appearance,
swipe physics, button timing, corner peel, grading, and accessibility behavior.

## Findings and changes

| Path                       | Previous work                                          | Updated work                                                                             |
| -------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Mounted cards              | Every card in the round, including fully covered cards | Up to five resting layers, plus cards still in flight                                    |
| 24-card idle round         | 24 animated card roots                                 | 5 animated card roots (79% fewer)                                                        |
| 2,400-card idle round      | 2,400 animated card roots                              | 5 animated card roots                                                                    |
| Keyboard updates           | Re-rendered the deck and rebuilt gesture objects       | Stable callback bridge and memoized scene reuse the existing tree                        |
| Flight bookkeeping updates | Re-rendered each card's content                        | Memoized card/content boundaries and stable reveal callbacks                             |
| Peel clipping planes       | Changed native `left`/`top` during every peel frame    | Fixed layout, animated translation and rotation; dimensions update only with card bounds |
| Worklet captures           | Referenced the complete card array for its length      | Capture the numeric count                                                                |
| Index handoff              | Read shared animation state on the JS thread           | Reset the state on the UI runtime                                                        |
| Failed image prefetch      | Rejected prefetches could remain marked as cached      | Remove failed URLs so a later prefetch can retry                                         |
| Unmount                    | Canceled the deck turn                                 | Also cancels corner springs and releases flight state                                    |

The rendering window is cyclic because completed cards return to the back of the
stack. It includes extra layers when returning flights temporarily leave gaps.
Flight IDs cross to React only at launch/landing; positions stay on the UI
runtime. Cards retain their answer snapshots while returning. Unmounted,
fully covered cards can be reconstructed when they approach the visible stack.

The two small crease effects retain their varying width/height and rounded
corners so their gradient and curl shape stay unchanged. This is an intentional
remaining layout cost. The physics integrator, thresholds, spring parameters,
timing, text sizing, colors, and image look-ahead distance are unchanged.

The reflected sticker back uses a single matrix containing both reflection and
translation. React Native 0.86 Fabric rejects a matrix combined with other
operations in a transform list, returning identity. The first optimization
used that unsupported combination and hid the folded corner while leaving the
separate crease visible. The regression test now models Fabric's rejection,
in addition to checking the geometry; the original ideal-math test missed it.

The oversized transform-only sticker mask is visual-only (`pointerEvents="none"`).
Without that setting its native hit box extends below the card and intercepts
the Today practice `TextInput`, preventing the keyboard from opening. The
card-sized accessibility/reveal surface remains interactive.

## Repeatable checks

From the repository root:

```bash
bun test apps/mobile/src/components/vocabulary-deck-performance.test.ts apps/mobile/src/components/vocabulary-peel.test.ts apps/mobile/src/components/vocabulary-reveal.test.ts apps/mobile/src/lib/vocabulary-deck-worklets.test.ts apps/mobile/src/lib/vocabulary-deck-motion.test.ts apps/mobile/src/lib/vocabulary-card-physics.test.ts apps/mobile/src/lib/vocabulary-card-text.test.ts apps/mobile/src/lib/vocabulary-sticker-peel.test.ts
```

From `apps/mobile`, run `bun run typecheck`.

Validation on Bun 1.3.14: the complete mobile suite passed **89 tests across 17
files**, with **5,306 assertions**. Mobile TypeScript, formatting checks for the
changed files, and `git diff --check` also passed.

The performance harness executes the actual deck component with native leaves
stubbed, compiles its worklets using the installed Worklets Babel plugin, and
executes serialized callbacks with their captured dependencies. It checks:

- Bounded mount counts at 24, 240, and 2,400 cards.
- Parent callback changes reuse the scene while calling the latest handler.
- An outgoing card remains mounted with its feedback until physics settles.
- Peel movement does not change the large planes' layout properties.
- Transform composition leaves all four printed corners stationary and puts
  the reflected corner at the same finger coordinates across card sizes.

The motion tests check that every omitted card is covered by a mounted card
throughout sampled button transitions, including small decks and wraparound.
Existing tests cover overlapping flights, frame-rate-independent integration,
gesture thresholds, grading/reveal races, text layout, and light/dark surfaces.

These checks measure workload and behavior, not native FPS or GPU rasterization.
No physical-device or emulator testing was performed, as requested. The 60 FPS
target remains unmeasured; test timings on this Linux host are not device frame
times. Any future FPS assessment should use a release build, with rapid swipes,
peeling, typing, image-heavy cards, both themes, and increased system font size.

## Sources

- [Reanimated performance guidance](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/): prefer non-layout animation properties, bound the number of animated components, memoize gestures/frame callbacks, avoid JS reads of shared values, and assess release builds.
- [Worklet closure guidance](https://docs.swmansion.com/react-native-reanimated/docs/guides/worklets/): capture the needed scalar rather than a large object.
- [React Native 0.86.3 transform parser](https://github.com/facebook/react-native/blob/v0.86.3/packages/react-native/ReactCommon/react/renderer/components/view/conversions.h): `parseProcessedTransform` requires a matrix to be the only operation in its transform list.

Global synchronous-prop feature flags were not enabled: they affect touch
detection, and this audit preserves the existing gesture behavior. No new runtime
dependencies or native build configuration are required.
