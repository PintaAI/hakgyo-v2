import {
  createOrganizationThemeTokens,
  DEFAULT_ORGANIZATION_THEME,
} from "@hakgyo/shared";

export const themeColors = {
  light: createOrganizationThemeTokens(DEFAULT_ORGANIZATION_THEME, "light"),
  dark: createOrganizationThemeTokens(DEFAULT_ORGANIZATION_THEME, "dark"),
};

export type ColorScheme = keyof typeof themeColors;
export type ThemeColors = {
  [Name in keyof (typeof themeColors)["light"]]: string;
};

export function withOpacity(color: string, opacity: number) {
  const hex = color.match(/^#([0-9a-f]{6})$/i)?.[1];
  if (!hex) return color;
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function parseColor(color: string) {
  const hex = color.match(/^#([0-9a-f]{6})$/i)?.[1];
  if (hex) {
    return {
      red: Number.parseInt(hex.slice(0, 2), 16),
      green: Number.parseInt(hex.slice(2, 4), 16),
      blue: Number.parseInt(hex.slice(4, 6), 16),
      alpha: 1,
    };
  }
  const rgb = color.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i,
  );
  if (!rgb) return null;
  return {
    red: Number(rgb[1]),
    green: Number(rgb[2]),
    blue: Number(rgb[3]),
    alpha: rgb[4] === undefined ? 1 : Number(rgb[4]),
  };
}

/**
 * Composites a (possibly translucent) overlay onto an opaque base and returns
 * the solid result. Falls back to the overlay when either color is not hex or
 * rgb(a).
 */
export function blendOver(base: string, overlay: string) {
  const below = parseColor(base);
  const above = parseColor(overlay);
  if (!below || !above) return overlay;
  const mix = (from: number, to: number) =>
    Math.round(from + (to - from) * above.alpha);
  return `rgb(${mix(below.red, above.red)}, ${mix(below.green, above.green)}, ${mix(below.blue, above.blue)})`;
}

const variableNames = {
  background: "--color-background",
  foreground: "--color-foreground",
  card: "--color-card",
  cardForeground: "--color-card-foreground",
  popover: "--color-popover",
  popoverForeground: "--color-popover-foreground",
  primary: "--color-primary",
  primaryForeground: "--color-primary-foreground",
  secondary: "--color-secondary",
  secondaryForeground: "--color-secondary-foreground",
  muted: "--color-muted",
  mutedForeground: "--color-muted-foreground",
  accent: "--color-accent",
  accentForeground: "--color-accent-foreground",
  destructive: "--color-destructive",
  destructiveForeground: "--color-destructive-foreground",
  border: "--color-border",
  input: "--color-input",
  ring: "--color-ring",
  chart1: "--color-chart-1",
  chart2: "--color-chart-2",
  chart3: "--color-chart-3",
  chart4: "--color-chart-4",
  chart5: "--color-chart-5",
  sidebar: "--color-sidebar",
  sidebarForeground: "--color-sidebar-foreground",
  sidebarPrimary: "--color-sidebar-primary",
  sidebarPrimaryForeground: "--color-sidebar-primary-foreground",
  sidebarAccent: "--color-sidebar-accent",
  sidebarAccentForeground: "--color-sidebar-accent-foreground",
  sidebarBorder: "--color-sidebar-border",
  sidebarRing: "--color-sidebar-ring",
} as const;

export function createThemeVariables(colors: ThemeColors) {
  return Object.fromEntries(
    Object.entries(variableNames).map(([name, variable]) => [
      variable,
      colors[name as keyof ThemeColors],
    ]),
  ) as Record<`--${string}`, string>;
}

export const themeVariables = {
  light: createThemeVariables(themeColors.light),
  dark: createThemeVariables(themeColors.dark),
} as const;
