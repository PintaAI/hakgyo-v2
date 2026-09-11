import { z } from "zod";

import {
  createCardColorPair,
  createMutedColorPair,
  createSidebarColorPair,
  createThemeColorPair,
  getContrastRatio,
  getReadableForeground,
  normalizeHexColor,
} from "./colors";

const hexColor = z
  .string()
  .regex(/^#[0-9A-F]{6}$/, "Use a six-digit uppercase HEX color");

const shadowSchema = z.object({
  x: z.number().int().min(-12).max(12),
  y: z.number().int().min(-12).max(24),
  blur: z.number().int().min(0).max(48),
  spread: z.number().int().min(-12).max(16),
  opacity: z.number().int().min(0).max(40),
});

export const organizationThemeSchema = z.object({
  primary: hexColor,
  background: hexColor,
  foreground: hexColor,
  darkBrightness: z.number().int().min(0).max(100),
  density: z.enum(["compact", "comfortable", "spacious"]),
  font: z.enum(["geist", "inter", "poppins", "merriweather", "jetbrains"]),
  radius: z.enum(["none", "small", "large"]),
  shadow: shadowSchema,
  size: z.enum(["small", "default", "large"]),
});

export type OrganizationTheme = z.infer<typeof organizationThemeSchema>;
export type OrganizationThemeDraft = Omit<
  OrganizationTheme,
  "primary" | "background" | "foreground"
> & {
  primary: string;
  background: string;
  foreground: string;
};

export const DEFAULT_ORGANIZATION_THEME = {
  primary: "#27272A",
  background: "#FFFFFF",
  foreground: "#171717",
  darkBrightness: 35,
  density: "comfortable",
  font: "geist",
  radius: "large",
  shadow: { x: 0, y: 4, blur: 12, spread: -2, opacity: 14 },
  size: "default",
} as const satisfies OrganizationTheme;

export function parseOrganizationTheme(value: unknown) {
  const result = organizationThemeSchema.safeParse(value);
  return result.success ? result.data : null;
}

function mixHexColor(first: string, second: string, amount: number) {
  const channels = [1, 3, 5].map((start) => {
    const from = Number.parseInt(first.slice(start, start + 2), 16);
    const to = Number.parseInt(second.slice(start, start + 2), 16);
    return Math.round(from + (to - from) * amount)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  });
  return `#${channels.join("")}`;
}

export function normalizeOrganizationTheme(
  value: OrganizationThemeDraft,
): OrganizationTheme {
  const primary = normalizeHexColor(value.primary);
  const requestedBackground = normalizeHexColor(value.background);
  const requestedForeground = normalizeHexColor(value.foreground);
  if (!primary || !requestedBackground || !requestedForeground) {
    throw new Error("The generated theme contains an invalid color");
  }
  let background = requestedBackground;
  while (getContrastRatio(background, "#111827") < 10) {
    background = mixHexColor(background, "#FFFFFF", 0.2);
  }
  const foreground =
    getContrastRatio(background, requestedForeground) >= 7
      ? requestedForeground
      : getReadableForeground(background);
  return organizationThemeSchema.parse({
    ...value,
    primary,
    background,
    foreground,
  });
}

export function createOrganizationThemePalette(
  theme: OrganizationTheme,
  darkBrightness = theme.darkBrightness,
) {
  const background = createThemeColorPair(
    theme.background,
    "background",
    darkBrightness,
  );
  const primary = createThemeColorPair(theme.primary, "accent", darkBrightness);
  const foreground = createThemeColorPair(
    theme.foreground,
    "foreground",
    darkBrightness,
  );
  const card = createCardColorPair(background);
  return {
    background,
    card,
    muted: createMutedColorPair(card),
    primary,
    foreground,
    sidebar: createSidebarColorPair(background, darkBrightness),
  };
}
