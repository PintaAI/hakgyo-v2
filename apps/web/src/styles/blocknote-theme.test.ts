import { describe, expect, test } from "bun:test";

const globalsCss = await Bun.file(
  new URL("./globals.css", import.meta.url),
).text();

describe("BlockNote theme bridge", () => {
  test("scopes fallback dark tokens to the document root", () => {
    expect(globalsCss).toContain("html.dark:not(.bn-root) {");
    expect(globalsCss).not.toMatch(/^\.dark\s*\{/m);
  });

  test.each([
    ["editor background", "--bn-colors-editor-background: var(--card)"],
    ["editor text", "--bn-colors-editor-text: var(--card-foreground)"],
    ["menu background", "--bn-colors-menu-background: var(--popover)"],
    ["menu text", "--bn-colors-menu-text: var(--popover-foreground)"],
    ["selected background", "--bn-colors-selected-background: var(--primary)"],
    ["selected text", "--bn-colors-selected-text: var(--primary-foreground)"],
    ["border", "--bn-colors-border: var(--border)"],
    ["radius", "--bn-border-radius: var(--radius)"],
    ["font", "--bn-font-family: var(--app-font-family)"],
  ])("maps %s to an application token", (_name, declaration) => {
    expect(globalsCss).toContain(declaration);
  });
});
