"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      aria-label="Ubah tema warna"
      className="border-border text-foreground hover:bg-accent focus-visible:outline-ring grid size-11 place-items-center rounded-full border transition focus-visible:outline-2 focus-visible:outline-offset-2"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      type="button"
    >
      <SunIcon className="hidden size-5 dark:block" aria-hidden="true" />
      <MoonIcon className="size-5 dark:hidden" aria-hidden="true" />
    </button>
  );
}
