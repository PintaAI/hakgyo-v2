"use client";

import { useEffect, useRef } from "react";

import { AppSettings } from "~/components/app-settings";
import { DynamicBlockNoteEditor } from "~/components/editor";
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
  const outputRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    if (outputRef.current) {
      outputRef.current.textContent = JSON.stringify(
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
        null,
        2,
      );
    }
  }, []);

  return <pre ref={outputRef} id="theme-debug-values" />;
}

export default function ThemeDebugPage() {
  return (
    <OrganizationThemeProvider theme={debugTheme}>
      <AppSettings open={false} onOpenChange={() => undefined} />
      <ThemeValues />
      <DynamicBlockNoteEditor
        initialContent={[{ type: "paragraph", content: "Theme probe" }]}
        trailingBlock={false}
        theme="dark"
      />
    </OrganizationThemeProvider>
  );
}
