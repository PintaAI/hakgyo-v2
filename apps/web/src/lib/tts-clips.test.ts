import { describe, expect, test } from "bun:test";

import { optionIndexOfClip, pcmToWav, ttsClipsFor } from "./tts-clips";

describe("ttsClipsFor", () => {
  test("a dialogue becomes one prompt clip with both voices", () => {
    expect(
      ttsClipsFor({
        audio: "dialogue",
        script: [
          { speaker: "M", text: "이 상자를 어디에 놓을까요?" },
          { speaker: "F", text: "저기 선반 위에 놓으세요." },
        ],
        optionTexts: ["a", "b", "c", "d"],
      }),
    ).toEqual([
      {
        key: "prompt",
        lines: [
          { voice: "M", text: "이 상자를 어디에 놓을까요?" },
          { voice: "F", text: "저기 선반 위에 놓으세요." },
        ],
      },
    ]);
  });

  test("options read aloud get a clip each, the narrator in the woman's voice", () => {
    const clips = ttsClipsFor({
      audio: "prompt-and-options",
      script: [{ speaker: "N", text: "내일 안전 교육은 몇 시에 시작해요?" }],
      optionTexts: ["회의실에서 해요.", "오전 아홉 시에 해요.", "", "네."],
    });
    expect(clips.map((clip) => clip.key)).toEqual([
      "prompt",
      "option-0",
      "option-1",
      "option-3",
    ]);
    expect(clips[0]!.lines[0]!.voice).toBe("F");
  });

  test("reading types have no audio", () => {
    expect(ttsClipsFor({ audio: "none", script: [], optionTexts: [] })).toEqual(
      [],
    );
  });

  test("clip keys map back to options", () => {
    expect(optionIndexOfClip("option-2")).toBe(2);
    expect(optionIndexOfClip("prompt")).toBeNull();
  });
});

describe("pcmToWav", () => {
  test("writes a mono 16-bit header and silence between pieces", () => {
    const wav = pcmToWav([new Uint8Array([1, 2]), new Uint8Array([3, 4])], {
      sampleRate: 1000,
      gapMs: 2,
    });
    const view = new DataView(wav.buffer);
    expect(String.fromCharCode(...wav.slice(0, 4))).toBe("RIFF");
    expect(view.getUint32(24, true)).toBe(1000);
    expect(view.getUint32(40, true)).toBe(8); // 2 + 4 bytes of silence + 2
    expect([...wav.slice(44)]).toEqual([1, 2, 0, 0, 0, 0, 3, 4]);
  });
});
