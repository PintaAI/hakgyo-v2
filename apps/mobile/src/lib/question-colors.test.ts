import { describe, expect, test } from "bun:test";

import { questionTone } from "./question-colors";

describe("questionTone", () => {
  test("answered or right is done, wrong stays wrong whether seen or not", () => {
    expect(questionTone("answered", false)).toBe("done");
    expect(questionTone("correct", true)).toBe("done");
    expect(questionTone("incorrect", true)).toBe("wrong");
  });

  test("an unanswered question is seen once opened", () => {
    expect(questionTone("unanswered", true)).toBe("seen");
    expect(questionTone("unanswered", false)).toBe("unseen");
  });
});
