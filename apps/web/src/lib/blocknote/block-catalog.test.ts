import { describe, expect, test } from "bun:test";
import {
  HANGEUL_GAME_KEYS,
  HANGEUL_GAME_STAGE_IDS,
  parseHangeulContrastRows,
  parseHangeulLetterCards,
  parseJamoList,
} from "@hakgyo/shared/hangeul";

import {
  assetAudioBlockType,
  assetImageBlockType,
  assessmentReferenceBlockType,
  calloutBlockType,
  calloutTones,
  conversationBlockThemes,
  conversationBlockType,
  cultureBlockThemes,
  cultureBlockType,
  grammarBlockThemes,
  grammarBlockType,
  hakgyoBlockCatalog,
  hangeulContrastBlockType,
  hangeulGameBlockType,
  hangeulLettersBlockType,
  hangeulSyllableGridBlockType,
  lessonPageBlockType,
  lessonPageThemes,
  pdfPagesBlockType,
  vocabularyReferenceBlockType,
} from "./block-catalog";

describe("Hakgyo BlockNote catalog", () => {
  test("keeps custom block identifiers and examples aligned", () => {
    const customTypes = hakgyoBlockCatalog.customBlocks.map(
      (block) => block.type,
    );

    expect(customTypes).toEqual([
      lessonPageBlockType,
      conversationBlockType,
      grammarBlockType,
      cultureBlockType,
      vocabularyReferenceBlockType,
      assessmentReferenceBlockType,
      calloutBlockType,
      assetAudioBlockType,
      assetImageBlockType,
      pdfPagesBlockType,
      hangeulLettersBlockType,
      hangeulContrastBlockType,
      hangeulSyllableGridBlockType,
      hangeulGameBlockType,
    ]);
    const callout = hakgyoBlockCatalog.customBlocks.find(
      (block) => block.type === calloutBlockType,
    );
    expect(callout).toBeDefined();
    if (!callout || !("example" in callout)) return;
    expect(callout.example.type).toBe(calloutBlockType);
    expect(calloutTones).toContain(callout.example.props.tone);

    const lessonPage = hakgyoBlockCatalog.customBlocks.find(
      (block) => block.type === lessonPageBlockType,
    );
    expect(lessonPage).toBeDefined();
    if (!lessonPage || !("example" in lessonPage)) return;
    expect(lessonPage.example.type).toBe(lessonPageBlockType);
    expect(lessonPageThemes).toContain(lessonPage.example.props.theme);

    const grammar = hakgyoBlockCatalog.customBlocks.find(
      (block) => block.type === grammarBlockType,
    );
    expect(grammar).toBeDefined();
    if (!grammar || !("example" in grammar)) return;
    expect(grammar.example.type).toBe(grammarBlockType);
    expect(grammarBlockThemes).toContain(grammar.example.props.theme);

    const conversation = hakgyoBlockCatalog.customBlocks.find(
      (block) => block.type === conversationBlockType,
    );
    expect(conversation).toBeDefined();
    if (!conversation || !("example" in conversation)) return;
    expect(conversation.example.type).toBe(conversationBlockType);
    expect(conversationBlockThemes).toContain(conversation.example.props.theme);
    expect(conversation.example.props.practicePromptKo).not.toBe("");
    expect(conversation.example.props.usefulExpressionPhraseKo).not.toBe("");
    expect(conversation.example.props.pronunciationEyebrow).not.toBe("");

    const culture = hakgyoBlockCatalog.customBlocks.find(
      (block) => block.type === cultureBlockType,
    );
    expect(culture).toBeDefined();
    if (!culture || !("example" in culture)) return;
    expect(culture.example.type).toBe(cultureBlockType);
    expect(cultureBlockThemes).toContain(culture.example.props.theme);
    expect(culture.example.props.checklistItems).not.toBe("");
  });

  test("gives the Hangeul blocks examples the shared parsers accept", () => {
    const example = (type: string) => {
      const block = hakgyoBlockCatalog.customBlocks.find(
        (candidate) => candidate.type === type,
      );
      if (!block || !("example" in block)) throw new Error(type);
      return block.example.props as Record<string, unknown>;
    };

    expect(
      parseHangeulLetterCards(example(hangeulLettersBlockType).letters),
    ).toHaveLength(2);
    expect(
      parseHangeulContrastRows(example(hangeulContrastBlockType).rows),
    ).toHaveLength(2);
    expect(
      parseJamoList(example(hangeulSyllableGridBlockType).consonants),
    ).toEqual(["ㄱ", "ㄴ", "ㄷ"]);

    const game = example(hangeulGameBlockType);
    expect(HANGEUL_GAME_KEYS).toContain(game.gameKey as never);
    expect(HANGEUL_GAME_STAGE_IDS).toContain(game.stage as never);
  });
});
