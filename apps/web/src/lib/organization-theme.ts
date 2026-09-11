import {
  createOrganizationThemePalette,
  getReadableForeground,
  type OrganizationTheme,
} from "@hakgyo/shared";

export {
  createOrganizationThemePalette,
  DEFAULT_ORGANIZATION_THEME,
  normalizeOrganizationTheme,
  organizationThemeSchema,
  parseOrganizationTheme,
  type OrganizationTheme,
  type OrganizationThemeDraft,
} from "@hakgyo/shared";

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
