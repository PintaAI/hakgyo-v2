import { describe, expect, test } from "bun:test";

import {
  contentAudioSources,
  pacedQuestionEndsAt,
  questionAudioSources,
  sectionAudioPolicy,
} from "./assessment-audio";

const audioBlock = (assetId: string) => ({
  type: "assetAudio",
  props: { assetId },
  children: [],
});

describe("contentAudioSources", () => {
  test("finds asset audio, audio URLs and nested blocks in order", () => {
    expect(
      contentAudioSources([
        { type: "paragraph", content: [], children: [audioBlock("a")] },
        { type: "audio", props: { url: "hakgyo-asset:b" } },
        { type: "audio", props: { url: "https://example.test/c.mp3" } },
        audioBlock(""),
      ]),
    ).toEqual([
      { assetId: "a" },
      { assetId: "b" },
      { url: "https://example.test/c.mp3" },
    ]);
  });

  test("ignores plain text content", () => {
    expect(contentAudioSources("듣기", null)).toEqual([]);
  });

  test("a question's playlist is its prompt, then its options", () => {
    expect(
      questionAudioSources({
        prompt: [audioBlock("prompt")],
        options: [{ content: [audioBlock("one")] }, { content: "2" }],
      }),
    ).toEqual([{ assetId: "prompt" }, { assetId: "one" }]);
  });
});

describe("sectionAudioPolicy", () => {
  const free = {
    navigation: "FREE" as const,
    audioMaxPlays: null,
    audioAutoplay: false,
    audioRepeatGapSeconds: 2,
  };

  test("keeps the content's own players without limits", () => {
    expect(sectionAudioPolicy(free)).toBeNull();
    expect(sectionAudioPolicy(undefined)).toBeNull();
  });

  test("limits and autoplay switch to the controlled player", () => {
    expect(sectionAudioPolicy({ ...free, audioMaxPlays: 2 })).toEqual({
      maxPlays: 2,
      autoplay: false,
      repeatGapSeconds: 2,
    });
    expect(sectionAudioPolicy({ ...free, audioAutoplay: true })).toEqual({
      maxPlays: null,
      autoplay: true,
      repeatGapSeconds: 2,
    });
  });

  test("paced sections play by themselves, at least once", () => {
    expect(sectionAudioPolicy({ ...free, navigation: "PACED" })).toEqual({
      maxPlays: 1,
      autoplay: true,
      repeatGapSeconds: 2,
    });
  });
});

describe("pacedQuestionEndsAt", () => {
  const shownAt = new Date("2026-10-28T10:00:00Z");
  const section = { pacedAnswerSeconds: 7, pacedQuestionSeconds: 20 };

  test("waits for the audio, then gives the answer window", () => {
    expect(
      pacedQuestionEndsAt({
        section,
        hasAudio: true,
        shownAt,
        audioEndedAt: null,
      }),
    ).toBeNull();
    expect(
      pacedQuestionEndsAt({
        section,
        hasAudio: true,
        shownAt,
        audioEndedAt: new Date("2026-10-28T10:00:30Z"),
      }),
    ).toEqual(new Date("2026-10-28T10:00:37Z"));
  });

  test("a question without audio has its own window, with defaults", () => {
    expect(
      pacedQuestionEndsAt({
        section,
        hasAudio: false,
        shownAt,
        audioEndedAt: null,
      }),
    ).toEqual(new Date("2026-10-28T10:00:20Z"));
    expect(
      pacedQuestionEndsAt({
        section: { pacedAnswerSeconds: null, pacedQuestionSeconds: null },
        hasAudio: false,
        shownAt,
        audioEndedAt: null,
      }),
    ).toEqual(new Date("2026-10-28T10:00:30Z"));
  });
});
