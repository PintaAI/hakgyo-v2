# Hangeul Game UI Patterns

## Scope

This note collects interface patterns from first-party descriptions of Hangeul learning products. It complements [Hangeul Game: Learning Design Research](./hangeul-game-learning-design.md), which focuses on pedagogy and the Indonesian beginner audience. The product examples below are design references, not evidence that a specific interface is more effective.

## Patterns to consider

### 1. Put a readable reference chart beside a guided first action

Duolingo's Hangeul reading tab pairs a “Learn the letters” entry point with a grid of syllable tiles. Each tile shows Hangul and a sound representation; its lesson then asks learners to assemble a syllable block from component tiles. This gives learners a stable reference and a clear transition from browsing to doing. **Apply:** expose a compact letter/family chart from the game, then make the primary CTA start one focused interactive activity. Keep sound cues visually subordinate to Hangul. [Duolingo: Learning other writing systems](https://blog.duolingo.com/learning-other-writing-systems/)

### 2. Make the construction space the visual center of the activity

The Duolingo example shows a large outlined syllable workspace, a speaker control, and a small tray of component tiles. The workspace makes the target operation legible: move parts into a block. **Apply:** use a large, uncluttered block canvas; keep choices grouped in a tray; show the expected consonant/vowel positions in the canvas; provide replayable audio near the prompt. [Duolingo: Learning other writing systems](https://blog.duolingo.com/learning-other-writing-systems/)

### 3. Give learners multiple ways to practice the same letters

Duolingo describes dedicated reading practice for recognizing sounds and syllables and forming blocks, including listening/choice and construction activities. A Hangul alphabet app listing describes a syllable-match puzzle and syllable-merge practice. **Apply:** rotate between sound-to-letter, letter-to-sound, matching, and block-building instead of making every round the same interaction. [Duolingo: Learning other writing systems](https://blog.duolingo.com/learning-other-writing-systems/), [Hangul: Korean Alphabet App listing](https://apps.apple.com/us/app/hangul-korean-alphabet/id6760618886)

### 4. Keep the next step obvious; put secondary tools one tap away

The Hangul alphabet app's version notes describe simplifying its home screen to one clear daily focus and grouping secondary practice tools under “More Practice.” **Apply:** make the game home screen point to one next lesson or review session, while keeping reference, optional handwriting, and alternate drills accessible without competing for primary attention. [Hangul: Korean Alphabet App listing](https://apps.apple.com/us/app/hangul-korean-alphabet/id6760618886)

### 5. Use short, bounded sessions and visible milestones

The same listing describes a 21-day course with a daily goal and 5–10 minute activities, plus milestone tests. These are product-design choices rather than independently validated outcomes. **Apply:** label a round with a small goal (for example, “Build 3 blocks”), show progress within the round, and finish with a clear recap or milestone. Avoid presenting a streak or XP as proof of letter mastery. [Hangul: Korean Alphabet App listing](https://apps.apple.com/us/app/hangul-korean-alphabet/id6760618886)

### 6. Treat localization and transliteration as controls

Duolingo says transliterations can be enabled or disabled from a lesson setting; the alphabet app listing describes localized instructions and optional romanization. **Apply:** use the learner's interface language for directions, label approximate sound aids clearly, and allow those aids to be hidden as Hangul reading improves. Keep pronunciation audio directly available either way. [Duolingo: Korean course updates](https://blog.duolingo.com/korean-course-updates/), [Hangul: Korean Alphabet App listing](https://apps.apple.com/us/app/hangul-korean-alphabet/id6760618886)

## Suggested screen flow

1. **Today / map:** one prominent “continue” action, a compact progress indicator, and an easy route to review.
2. **Letter preview:** a small family/chart view with Hangul, audio replay, and an optional approximate cue.
3. **Play:** one large task surface with prompt, work area, choices, and a clear submit/check action.
4. **Feedback:** show the correct construction and play it; explain a position mistake briefly and let the learner retry.
5. **Round end:** summarize what was practiced and offer the next lesson or a focused review.

The flow is a synthesis of the cited product examples and a proposed adaptation for this project; it is not a claim about those apps' complete current screen architecture.
