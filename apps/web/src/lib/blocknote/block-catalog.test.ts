import { describe, expect, test } from "bun:test";

import {
  assetAudioBlockType,
  assetImageBlockType,
  calloutBlockType,
  calloutTones,
  conversationBlockThemes,
  conversationBlockType,
  grammarBlockThemes,
  grammarBlockType,
  hakgyoBlockCatalog,
  lessonPageBlockType,
  lessonPageThemes,
} from "./block-catalog";

describe("Hakgyo BlockNote catalog", () => {
  test("keeps custom block identifiers and examples aligned", () => {
    const customTypes = hakgyoBlockCatalog.customBlocks.map(
      (block) => block.type,
    );

    expect(customTypes).toEqual([
      assetAudioBlockType,
      assetImageBlockType,
      calloutBlockType,
      lessonPageBlockType,
      grammarBlockType,
      conversationBlockType,
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
    expect(conversation.example.props.pronunciationEyebrow).not.toBe("");
  });
});
