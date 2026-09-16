export type VocabularyCardTextLayout = {
  fontSize: number;
  lineHeight: number;
  minimumFontScale: number;
  numberOfLines: number;
};

/** Approximate rendered width in ems across Latin, Hangul, and other CJK text. */
export function vocabularyTextUnits(text: string) {
  let units = 0;
  for (const character of Array.from(text.trim())) {
    if (/\s/u.test(character)) units += 0.35;
    else if (
      /\p{Script=Hangul}|\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}/u.test(
        character,
      )
    )
      units += 1;
    else if (/\p{Lu}/u.test(character)) units += 0.72;
    else units += 0.58;
  }
  return units;
}

export function vocabularyPromptTextLayout(
  text: string,
  hasImage: boolean,
): VocabularyCardTextLayout & { imageHeight: number } {
  const units = vocabularyTextUnits(text);
  if (units <= 12)
    return {
      fontSize: 30,
      lineHeight: 38,
      minimumFontScale: 0.82,
      numberOfLines: 2,
      imageHeight: hasImage ? 96 : 0,
    };
  if (units <= 24)
    return {
      fontSize: 26,
      lineHeight: 33,
      minimumFontScale: 0.76,
      numberOfLines: hasImage && units <= 18 ? 2 : 3,
      imageHeight: hasImage ? 76 : 0,
    };
  if (units <= 44)
    return {
      fontSize: 22,
      lineHeight: 28,
      minimumFontScale: 0.7,
      numberOfLines: hasImage ? 3 : 4,
      imageHeight: hasImage ? 52 : 0,
    };
  return {
    fontSize: 18,
    lineHeight: 23,
    minimumFontScale: 0.62,
    numberOfLines: hasImage ? 3 : 4,
    imageHeight: hasImage ? 40 : 0,
  };
}

export function vocabularyAnswerTextLayout(
  text: string,
): VocabularyCardTextLayout {
  const units = vocabularyTextUnits(text);
  if (units <= 24)
    return {
      fontSize: 24,
      lineHeight: 30,
      minimumFontScale: 0.82,
      numberOfLines: 4,
    };
  if (units <= 48)
    return {
      fontSize: 21,
      lineHeight: 27,
      minimumFontScale: 0.76,
      numberOfLines: 4,
    };
  if (units <= 80)
    return {
      fontSize: 18,
      lineHeight: 23,
      minimumFontScale: 0.7,
      numberOfLines: 5,
    };
  return {
    fontSize: 16,
    lineHeight: 20,
    minimumFontScale: 0.62,
    numberOfLines: 5,
  };
}
