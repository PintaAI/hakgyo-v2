# Susun 한글

Local, untimed practice with twelve fixtures in `syllable-forge-data.ts`. No network calls or persisted progress. The Practice hub opens this game without a vocabulary source.

`hangul-composer.ts` owns two-set keyboard composition: initial/vowel/final, compound vowels, final clusters, and final migration before a vowel. Input is replayed from keystrokes so delete reverses one tap. Shift produces tense consonants and ㅒ/ㅖ. Initial ㅇ must be entered explicitly. Composition uses the modern syllable formula from [Unicode §3.12](https://www.unicode.org/versions/Unicode16.0.0/core-spec/chapter-3/).

`syllable-session.ts` owns answers, progression, hints, retry counts, completion and replay. Each valid key is checked immediately. A complete block succeeds automatically; a typo appears briefly, shakes red, and is removed after 420 ms. The keyboard has no space key because every fixture targets one syllable block.

The lightbulb trigger in the native header follows the first Hangeul game's cheat-sheet pattern. It opens a native `formSheet` with a glass close button, the current target, its explanation, and the required key sequence. Closing the sheet keeps next-key highlighting active for the current challenge.

Keyboard keycaps intentionally use plain animated card surfaces rather than native Liquid Glass. This two-set layout has 28 keys; giving every key its own GlassView creates unnecessary native compositing and accessibility listeners. Glass remains limited to the small toolbar and modal controls. Backspace is the only editing control because each answer contains just one short syllable block.

The keyboard remains mounted between challenges. Stable callbacks plus memoized letter keys keep an ordinary input from reconciling all 28 keycaps; only state-changing keys such as Shift, backspace, hint highlighting, and disabled feedback update when needed.

The stage renders one persistent precomposed system-font glyph and animates its opacity and scale as jamo combine. It deliberately uses a plain `View`, not a nested `ScrollView`, because every fixture contains one syllable block. This avoids content-size layout callbacks, forced scrolling, and overlapping outgoing/incoming glyph layers. Reduced Motion skips the assembly transition. The keyboard stays below the fixed lesson area with bottom safe-area padding.

## Verification

Run `bun test apps/mobile/src/games/syllable-forge/*.test.ts` from the repository root. Tests cover all 11,172 modern syllables, compound input, deletion, resyllabification, full-session completion, retry/hint scoring, and replay.

Device checklist for iOS and Android:

- Open Practice → Susun 한글, dismiss the start sheet, complete 가 with ㄱ then ㅏ.
- Enter ㄱㅏㄴㅏ and verify 가나, then delete once and verify 간.
- Enter ㅇㅣㄹㄱㅓ and verify 일거; delete once to return to 읽.
- Open hints; check next-key highlighting and Shift guidance on 꿔.
- Test incorrect feedback, clear, rapid taps, completion, replay and exit confirmation.
- Check small screens, light/dark mode, large text, VoiceOver/TalkBack and Reduced Motion.

## Generated hero

Asset: `apps/mobile/assets/games/syllable-forge-intro-v2.png` (640 × 768 RGBA), rendered through the shared start modal's Expo Image component. Generated using the built-in image generation tool; resized with alpha preserved. The previous asset is retained.

Final prompt:

> Use case: stylized-concept. Create a new transparent-background mobile learning game hero asset for 'Susun 한글'. Match the established Hakgyo illustration language: tactile rounded 3D paper-clay, sky blue and cobalt with ivory details, soft studio light, subtle soft shadows, playful premium educational toy. Subject: three separate chunky Korean jamo pieces ㄱ, ㅏ, ㄴ floating just above a rounded blue square tile bearing the correctly formed syllable 간 (ㄱ upper left, ㅏ upper right, ㄴ across bottom). Small curved blue motion accents suggest pieces assembling. Composition centered, portrait 5:6, generous transparent margins. Only those four Hangul markings, no Latin copy, no UI, no backdrop, no checkerboard, no watermark. Crisp readable correct letter geometry, calm minimal composition. Save with real alpha transparency.
