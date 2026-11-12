import { describe, expect, test } from "bun:test";

import { SessionXp } from "./session-xp";

describe("SessionXp", () => {
  test("earns XP for a word's first attempt when it is right", () => {
    const session = new SessionXp();
    session.add({ entryId: "a", result: "CORRECT" });
    session.add({ entryId: "b", result: "CORRECT" });
    expect(session.xp).toBe(10);
  });

  test("ignores later attempts at the same word, as the server does", () => {
    const session = new SessionXp();
    session.add({ entryId: "a", result: "INCORRECT" });
    session.add({ entryId: "a", result: "CORRECT" });
    session.add({ entryId: "b", result: "REVEALED" });
    session.add({ entryId: "b", result: "CORRECT" });
    session.add({ entryId: "c", result: "CORRECT" });
    session.add({ entryId: "c", result: "CORRECT" });
    expect(session.xp).toBe(5);
  });
});
