import {
  createOrganizationThemeTokens,
  type OrganizationTheme,
} from "@hakgyo/shared";

export {
  createOrganizationThemeTokens,
  DEFAULT_ORGANIZATION_THEME,
  normalizeOrganizationTheme,
  organizationThemeSchema,
  parseOrganizationTheme,
  type OrganizationTheme,
  type OrganizationThemeDraft,
} from "@hakgyo/shared";

function shadowToCss(shadow: OrganizationTheme["shadow"], scale = 1) {
  const scaled = (value: number) => Math.round(value * scale * 10) / 10;
  return `${scaled(shadow.x)}px ${scaled(shadow.y)}px ${scaled(shadow.blur)}px ${scaled(shadow.spread)}px rgb(0 0 0 / ${shadow.opacity}%)`;
}

/** Serializable first-paint adapter. No platform-specific color calculations. */
export function createOrganizationThemeRuntime(theme: OrganizationTheme) {
  const properties: Record<`--app-${string}`, string> = {};
  for (const mode of ["light", "dark"] as const) {
    for (const [name, color] of Object.entries(
      createOrganizationThemeTokens(theme, mode),
    )) {
      const token = name.replace(
        /[A-Z]|[0-9]/g,
        (part) => `-${part.toLowerCase()}`,
      );
      properties[`--app-${token}-${mode}`] = color;
    }
  }
  for (const [name, scale] of Object.entries({
    "2xs": 0.2,
    xs: 0.35,
    sm: 0.5,
    md: 0.75,
    lg: 1,
    xl: 1.35,
    "2xl": 1.8,
  })) {
    properties[`--app-shadow-${name}`] = shadowToCss(theme.shadow, scale);
  }
  return {
    dataset: {
      appColor: "generated",
      appDensity: theme.density,
      appFont: theme.font,
      appRadius: theme.radius,
      appShadow: "custom",
      appSize: theme.size,
    },
    properties,
  };
}
