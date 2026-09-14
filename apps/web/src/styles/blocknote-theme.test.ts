import { describe, expect, test } from "bun:test";

const globalsCss = await Bun.file(
  new URL("./globals.css", import.meta.url),
).text();
const calloutBlock = await Bun.file(
  new URL("../components/editor/blocks/callout-block.tsx", import.meta.url),
).text();

describe("BlockNote theme bridge", () => {
  test("scopes fallback dark tokens to the document root", () => {
    expect(globalsCss).toContain("html.dark:not(.bn-root) {");
    expect(globalsCss).not.toMatch(/^\.dark\s*\{/m);
  });

  test.each([
    ["editor background", "--bn-colors-editor-background: transparent"],
    ["editor text", "--bn-colors-editor-text: var(--card-foreground)"],
    ["menu background", "--bn-colors-menu-background: var(--popover)"],
    ["menu text", "--bn-colors-menu-text: var(--popover-foreground)"],
    ["tooltip background", "--bn-colors-tooltip-background: var(--popover)"],
    ["tooltip text", "--bn-colors-tooltip-text: var(--popover-foreground)"],
    ["hovered background", "--bn-colors-hovered-background: var(--accent)"],
    ["hovered text", "--bn-colors-hovered-text: var(--accent-foreground)"],
    ["selected background", "--bn-colors-selected-background: var(--primary)"],
    ["selected text", "--bn-colors-selected-text: var(--primary-foreground)"],
    ["disabled background", "--bn-colors-disabled-background: var(--muted)"],
    ["disabled text", "--bn-colors-disabled-text: var(--muted-foreground)"],
    ["border", "--bn-colors-border: var(--border)"],
    ["side menu", "--bn-colors-side-menu: var(--muted-foreground)"],
    ["radius", "--bn-border-radius: var(--radius)"],
    ["font", "--bn-font-family: var(--app-font-family)"],
  ])("maps %s to an application token", (_name, declaration) => {
    expect(globalsCss).toContain(declaration);
  });

  test.each([
    "gray",
    "brown",
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
    "purple",
    "pink",
  ])("maps the %s highlight pair in light and dark mode", (color) => {
    expect(globalsCss).toContain(`--bn-colors-highlights-${color}-text:`);
    expect(globalsCss).toContain(`--app-highlight-${color}-text-light`);
    expect(globalsCss).toContain(`--app-highlight-${color}-background-light`);
    expect(globalsCss).toContain(`--app-highlight-${color}-text-dark`);
    expect(globalsCss).toContain(`--app-highlight-${color}-background-dark`);
  });

  test("uses BlockNote highlight tokens for custom callout blocks", () => {
    expect(calloutBlock).toContain(
      "var(--bn-colors-highlights-${tone.color}-background)",
    );
    expect(calloutBlock).toContain(
      "var(--bn-colors-highlights-${tone.color}-text)",
    );
    expect(calloutBlock).not.toMatch(
      /(?:bg|text|border)-(?:sky|amber|rose|emerald)-\d+/,
    );
  });
});
