import { describe, expect, test } from "bun:test";
import { epsTypeByTag } from "@hakgyo/shared/eps-taxonomy";

import {
  createAiDraftsInput,
  draftInstructions,
  prepareDrafts,
  type DraftModels,
  type DraftOutput,
} from "./ai-drafts";

const r8 = epsTypeByTag("eps:R8")!;

const draft = (key: number, prompt: string): DraftOutput => ({
  prompt,
  options: ["끄고", "끄면", "끄려고", "끄느라고"],
  key,
  explanation: "Dua tindakan berurutan memakai -고.",
  mediaBrief: "",
  script: [],
  topic: "k3",
});

/** Mocked models: no AI call in tests. */
function models(drafts: DraftOutput[], answers: number[]) {
  const calls: string[] = [];
  const fake: DraftModels = {
    async write({ model, request }) {
      calls.push(`write:${model}:${request}`);
      return drafts;
    },
    async answerBlind({ model, questions }) {
      calls.push(`blind:${model}:${questions.length}`);
      return answers.map((answer, index) => ({
        index,
        answer,
        plausible: [answer],
      }));
    },
  };
  return { fake, calls };
}

describe("prepareDrafts", () => {
  const request = createAiDraftsInput.parse({
    assessmentId: "bank",
    type: "eps:R8",
    count: 3,
    level: "sedang",
  });

  test("the other model checks the drafts blind, and checks flag problems", async () => {
    const drafts = [
      draft(0, "기계를 청소할 때는 먼저 전원을 (   ) 장갑을 끼십시오."),
      draft(0, "작업이 끝나면 공구를 (   ) 정리하십시오."),
      draft(0, "회의실에 들어가기 전에 휴대폰을 (   ) 주십시오."),
    ];
    const { fake, calls } = models(drafts, [0, 2, 0]);
    const prepared = await prepareDrafts({
      request,
      type: r8,
      models: fake,
      existing: [{ text: drafts[0]!.prompt, position: 6 }],
    });
    expect(calls).toEqual([
      "write:gpt-5.4:Write 3 question(s) of type R8 (Kalimat rumpang). Level: sedang.",
      "blind:gpt-5.4-mini:3",
    ]);
    expect(prepared.map(({ flags }) => flags.map(({ code }) => code))).toEqual([
      ["KEY_PATTERN", "SIMILAR"],
      ["KEY_PATTERN", "BLIND_MISMATCH"],
      ["KEY_PATTERN"],
    ]);
    expect(prepared[0]!.checkModel).toBe("gpt-5.4-mini");
  });

  test("never keeps more drafts than asked for", async () => {
    const { fake } = models(
      [draft(1, "a"), draft(2, "b"), draft(3, "c"), draft(0, "d")],
      [1, 2, 3, 0],
    );
    const prepared = await prepareDrafts({
      request: { ...request, count: 2 },
      type: r8,
      models: fake,
      existing: [],
    });
    expect(prepared).toHaveLength(2);
  });

  test("the writer is told to stay original and gets the reference card", () => {
    const instructions = draftInstructions(r8);
    expect(instructions).toContain("Never reproduce");
    expect(instructions).toContain("R8 · Kalimat rumpang");
  });
});
