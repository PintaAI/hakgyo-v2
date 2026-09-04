"use client";

import { useEffect, useState } from "react";

import { AppSettings } from "~/components/app-settings";
import { BlockNoteEditor } from "~/components/editor/block-note-editor";
import { OrganizationThemeProvider } from "~/components/organization-theme-provider";

const debugTheme = {
  primary: "#3A8CC1",
  background: "#F3F6F8",
  foreground: "#1E2328",
  darkBrightness: 18,
  density: "comfortable",
  font: "inter",
  radius: "small",
  shadow: { x: 0, y: 4, blur: 12, spread: -2, opacity: 14 },
  size: "default",
} as const;

function ThemeValues() {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    setValues(
      Object.fromEntries(
        [
          "--background",
          "--card",
          "--foreground",
          "--card-foreground",
          "--app-background-dark",
          "--app-card-dark",
        ].map((name) => [name, styles.getPropertyValue(name).trim()]),
      ),
    );
  }, []);

  return <pre id="theme-debug-values">{JSON.stringify(values, null, 2)}</pre>;
}

export default function ThemeDebugPage() {
  return (
    <OrganizationThemeProvider theme={debugTheme}>
      <AppSettings open={false} onOpenChange={() => undefined} />
      <ThemeValues />
      <BlockNoteEditor
        initialContent={[{ type: "paragraph", content: "Theme probe" }]}
        trailingBlock={false}
        theme="dark"
      />
    </OrganizationThemeProvider>
  );
}
