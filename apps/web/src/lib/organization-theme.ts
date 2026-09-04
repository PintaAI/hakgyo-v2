import { z } from "zod";

import {
  createCardColorPair,
  createSidebarColorPair,
  createThemeColorPair,
  getContrastRatio,
  getReadableForeground,
  normalizeHexColor,
} from "~/lib/colors";

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
export type OrganizationThemeRuntime = {
  dataset: {
    appBackground: "generated";
    appColor: "generated";
    appDensity: OrganizationTheme["density"];
    appFont: OrganizationTheme["font"];
    appForeground: "generated";
    appRadius: OrganizationTheme["radius"];
    appShadow: "custom";
    appSize: OrganizationTheme["size"];
  };
  properties: Record<`--app-${string}`, string>;
};
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
    primary,
    background,
    foreground,
    darkBrightness: value.darkBrightness,
    density: value.density,
    font: value.font,
    radius: value.radius,
    shadow: value.shadow,
    size: value.size,
  });
}

export function createOrganizationThemePalette(
  theme: OrganizationTheme,
  darkBrightness: number,
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

  return {
    background,
    card: createCardColorPair(background),
    primary,
    foreground,
    sidebar: createSidebarColorPair(background, darkBrightness),
  };
}

function shadowToCss(shadow: OrganizationTheme["shadow"], scale = 1) {
  const scaled = (value: number) => Math.round(value * scale * 10) / 10;
  return `${scaled(shadow.x)}px ${scaled(shadow.y)}px ${scaled(shadow.blur)}px ${scaled(shadow.spread)}px rgb(0 0 0 / ${shadow.opacity}%)`;
}

/**
 * Produces the exact attributes and custom properties consumed by
 * preferences.css. The result is serializable so the server and client can
 * apply the same organization theme without waiting for React hydration.
 */
export function createOrganizationThemeRuntime(
  theme: OrganizationTheme,
): OrganizationThemeRuntime {
  const palette = createOrganizationThemePalette(theme, theme.darkBrightness);

  return {
    dataset: {
      appBackground: "generated",
      appColor: "generated",
      appDensity: theme.density,
      appFont: theme.font,
      appForeground: "generated",
      appRadius: theme.radius,
      appShadow: "custom",
      appSize: theme.size,
    },
    properties: {
      "--app-background-light": palette.background.light,
      "--app-background-dark": palette.background.dark,
      "--app-sidebar-light": palette.sidebar.light,
      "--app-sidebar-dark": palette.sidebar.dark,
      "--app-card-light": palette.card.light,
      "--app-card-dark": palette.card.dark,
      "--app-primary-light": palette.primary.light,
      "--app-primary-dark": palette.primary.dark,
      "--app-foreground-light": palette.foreground.light,
      "--app-foreground-dark": palette.foreground.dark,
      "--app-primary-foreground-light": getReadableForeground(
        palette.primary.light,
      ),
      "--app-primary-foreground-dark": getReadableForeground(
        palette.primary.dark,
      ),
      "--app-shadow-2xs": shadowToCss(theme.shadow, 0.2),
      "--app-shadow-xs": shadowToCss(theme.shadow, 0.35),
      "--app-shadow-sm": shadowToCss(theme.shadow, 0.5),
      "--app-shadow-md": shadowToCss(theme.shadow, 0.75),
      "--app-shadow-lg": shadowToCss(theme.shadow),
      "--app-shadow-xl": shadowToCss(theme.shadow, 1.35),
      "--app-shadow-2xl": shadowToCss(theme.shadow, 1.8),
    },
  };
}
