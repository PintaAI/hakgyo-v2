// Modern Hangul composition, Unicode §3.12. Takes compatibility jamo (the
// letters on a keyboard, ㄱ U+3131) and returns precomposed syllables (가).

export const HANGEUL_INITIALS = [..."ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"];
export const HANGEUL_VOWELS = [..."ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"];
export const HANGEUL_FINALS = [
  "",
  ..."ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ",
];

/**
 * The syllable for an initial consonant, a vowel and an optional final
 * (batchim), or null when a part is not a modern jamo in that position.
 */
export function composeHangeulSyllable(
  initial: string,
  vowel: string,
  final = "",
): string | null {
  const i = HANGEUL_INITIALS.indexOf(initial);
  const v = HANGEUL_VOWELS.indexOf(vowel);
  const f = HANGEUL_FINALS.indexOf(final);
  if (i < 0 || v < 0 || f < 0) return null;
  return String.fromCharCode(0xac00 + (i * 21 + v) * 28 + f);
}
