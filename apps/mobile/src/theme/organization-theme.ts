import {
  createOrganizationThemeTokens,
  parseOrganizationTheme,
} from "@hakgyo/shared";

import { createThemeVariables, themeColors, type ColorScheme } from "./colors";

export function createMobileTheme(
  colorScheme: ColorScheme,
  value: unknown,
) {
  const theme = parseOrganizationTheme(value);
  const colors = theme
    ? createOrganizationThemeTokens(theme, colorScheme)
    : themeColors[colorScheme];
  return {
    colors,
    variables: createThemeVariables(colors),
  };
}
