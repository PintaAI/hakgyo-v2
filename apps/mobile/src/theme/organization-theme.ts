import {
  createOrganizationThemePalette,
  getReadableForeground,
  type OrganizationTheme,
} from "@hakgyo/shared";

import {
  createThemeVariables,
  themeColors,
  withOpacity,
  type ColorScheme,
  type ThemeColors,
} from "./colors";

export function createMobileTheme(
  colorScheme: ColorScheme,
  theme: OrganizationTheme | null,
) {
  if (!theme) {
    return {
      colors: themeColors[colorScheme] as ThemeColors,
      variables: createThemeVariables(themeColors[colorScheme]),
    };
  }

  const palette = createOrganizationThemePalette(theme);
  const primary = palette.primary[colorScheme];
  const foreground = palette.foreground[colorScheme];
  const colors: ThemeColors = {
    ...themeColors[colorScheme],
    background: palette.background[colorScheme],
    foreground,
    card: palette.card[colorScheme],
    cardForeground: foreground,
    popover: palette.card[colorScheme],
    popoverForeground: foreground,
    primary,
    primaryForeground: getReadableForeground(primary),
    secondary: palette.card[colorScheme],
    secondaryForeground: foreground,
    muted: palette.muted[colorScheme],
    mutedForeground: withOpacity(foreground, 0.68),
    accent: palette.sidebar[colorScheme],
    accentForeground: foreground,
    border: withOpacity(foreground, 0.12),
    input: withOpacity(foreground, 0.16),
    ring: primary,
    sidebar: palette.sidebar[colorScheme],
    sidebarForeground: foreground,
    sidebarPrimary: primary,
    sidebarPrimaryForeground: getReadableForeground(primary),
    sidebarAccent: palette.card[colorScheme],
    sidebarAccentForeground: foreground,
    sidebarBorder: withOpacity(foreground, 0.12),
    sidebarRing: primary,
  };

  const radius =
    theme.radius === "none" ? 0 : theme.radius === "small" ? 6 : 16;
  return {
    colors,
    variables: {
      ...createThemeVariables(colors),
      "--radius-sm": `${Math.max(0, radius - 4)}px`,
      "--radius-md": `${Math.max(0, radius - 2)}px`,
      "--radius-lg": `${radius}px`,
      "--radius-xl": `${radius + 6}px`,
      "--radius-2xl": `${radius + 12}px`,
      "--radius-3xl": `${radius + 18}px`,
      "--radius-4xl": `${radius + 24}px`,
    } as Record<`--${string}`, string>,
  };
}
