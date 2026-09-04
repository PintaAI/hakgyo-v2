"use client";

import { createContext, useContext, useMemo } from "react";

import {
  parseOrganizationTheme,
  type OrganizationTheme,
} from "~/lib/organization-theme";

const OrganizationThemeContext = createContext<OrganizationTheme | null>(null);

export function OrganizationThemeProvider({
  children,
  theme,
}: {
  children: React.ReactNode;
  theme: unknown;
}) {
  const value = useMemo(() => parseOrganizationTheme(theme), [theme]);

  return (
    <OrganizationThemeContext value={value}>
      {children}
    </OrganizationThemeContext>
  );
}

export function useOrganizationTheme() {
  return useContext(OrganizationThemeContext);
}
