import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readSource = (file: string) =>
  readFileSync(resolve(import.meta.dir, file), "utf8");

describe("syllable game render contract", () => {
  test("keeps the keyboard mounted and isolates letter-key renders", () => {
    const keyboard = readSource("./hangeul-keyboard.tsx");
    const screen = readSource("./syllable-forge-screen.tsx");

    expect(keyboard).toContain("const LetterKey = memo");
    expect(keyboard).toContain("export const HangeulKeyboard = memo");
    expect(keyboard).toContain("const handleKey = useCallback");
    expect(screen).toContain("const enterKey = useCallback");
    expect(screen).toContain("const deleteKey = useCallback");
    expect(screen).not.toContain("key={session.index}");
    expect(screen).not.toContain(
      'onKey={(key) => dispatch({ type: "key", key })}',
    );
  });
});
