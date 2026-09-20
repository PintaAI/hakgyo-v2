"use client";

import { useLayoutEffect } from "react";

import {
  createOrganizationThemeRuntime,
  type OrganizationTheme,
} from "~/lib/organization-theme";

function applyOrganizationTheme(theme: OrganizationTheme) {
  const runtime = createOrganizationThemeRuntime(theme);
  Object.assign(document.documentElement.dataset, runtime.dataset);
  for (const [property, value] of Object.entries(runtime.properties)) {
    document.documentElement.style.setProperty(property, value);
  }
}

export function OrganizationThemeBootstrap({
  theme,
}: {
  theme: OrganizationTheme | null;
}) {
  useLayoutEffect(() => {
    if (theme) applyOrganizationTheme(theme);
  }, [theme]);

  if (!theme) return null;

  const runtime = createOrganizationThemeRuntime(theme);
  const serializedRuntime = JSON.stringify(runtime).replaceAll("<", "\\u003c");

  return (
    <script
      data-organization-theme-bootstrap=""
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html: `(function(){var root=document.documentElement;var theme=${serializedRuntime};Object.assign(root.dataset,theme.dataset);Object.entries(theme.properties).forEach(function(entry){root.style.setProperty(entry[0],entry[1]);});})();`,
      }}
    />
  );
}
