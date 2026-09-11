import { parseOrganizationTheme, type OrganizationTheme } from "@hakgyo/shared";
import Storage from "expo-sqlite/kv-store";
import { VariableContextProvider } from "nativewind";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";

import { authClient } from "../lib/auth-client";
import { api } from "../lib/trpc";
import { type ColorScheme, type ThemeColors } from "../theme/colors";
import { createMobileTheme } from "../theme/organization-theme";

const STORAGE_VERSION = 1;

export type AvailableOrganizationTheme = {
  organizationId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  theme: OrganizationTheme;
  updatedAt: string;
};

type StoredThemeLibrary = {
  version: typeof STORAGE_VERSION;
  selectedOrganizationId: string | null;
  themes: AvailableOrganizationTheme[];
};

type AppThemeContextValue = {
  colorScheme: ColorScheme;
  colors: ThemeColors;
  activeTheme: AvailableOrganizationTheme | null;
  availableThemes: AvailableOrganizationTheme[];
  isHydrated: boolean;
  isRefreshingThemes: boolean;
  selectTheme: (organizationId: string | null) => Promise<void>;
  refreshThemes: () => Promise<void>;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function storageKey(userId: string) {
  return `hakgyo:organization-themes:v${STORAGE_VERSION}:${userId}`;
}

function parseStoredThemeLibrary(
  value: string | null,
): StoredThemeLibrary | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;
    if (record.version !== STORAGE_VERSION || !Array.isArray(record.themes)) {
      return null;
    }
    const themes = record.themes.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const item = entry as Record<string, unknown>;
      const theme = parseOrganizationTheme(item.theme);
      if (
        !theme ||
        typeof item.organizationId !== "string" ||
        typeof item.name !== "string" ||
        typeof item.slug !== "string" ||
        (item.logoUrl !== null && typeof item.logoUrl !== "string") ||
        typeof item.updatedAt !== "string"
      ) {
        return [];
      }
      return [
        {
          organizationId: item.organizationId,
          name: item.name,
          slug: item.slug,
          logoUrl: item.logoUrl,
          theme,
          updatedAt: item.updatedAt,
        } satisfies AvailableOrganizationTheme,
      ];
    });
    const selectedOrganizationId =
      typeof record.selectedOrganizationId === "string"
        ? record.selectedOrganizationId
        : null;
    return {
      version: STORAGE_VERSION,
      selectedOrganizationId,
      themes,
    };
  } catch {
    return null;
  }
}

async function persistThemeLibrary(
  userId: string,
  selectedOrganizationId: string | null,
  themes: AvailableOrganizationTheme[],
) {
  await Storage.setItem(
    storageKey(userId),
    JSON.stringify({
      version: STORAGE_VERSION,
      selectedOrganizationId,
      themes,
    } satisfies StoredThemeLibrary),
  );
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const userId = session?.user.id ?? null;
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const [hydratedUserId, setHydratedUserId] = useState<string | null>();
  const [availableThemes, setAvailableThemes] = useState<
    AvailableOrganizationTheme[]
  >([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<
    string | null
  >(null);
  const themesQuery = api.organization.listAvailableThemes.useQuery(
    { cacheScope: userId ?? "signed-out" },
    {
      enabled: Boolean(userId),
      staleTime: 15 * 60 * 1000,
      refetchOnReconnect: true,
    },
  );

  useEffect(() => {
    let active = true;
    setHydratedUserId(undefined);
    setAvailableThemes([]);
    setSelectedOrganizationId(null);
    if (!userId) {
      setHydratedUserId(null);
      return () => {
        active = false;
      };
    }

    void Storage.getItem(storageKey(userId))
      .then((storedValue) => {
        if (!active) return;
        const stored = parseStoredThemeLibrary(storedValue);
        const themes = stored?.themes ?? [];
        const selected = themes.some(
          ({ organizationId }) =>
            organizationId === stored?.selectedOrganizationId,
        )
          ? (stored?.selectedOrganizationId ?? null)
          : null;
        setAvailableThemes(themes);
        setSelectedOrganizationId(selected);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setHydratedUserId(userId);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || hydratedUserId !== userId || !themesQuery.data) return;
    const themes = themesQuery.data.map((organization) => ({
      organizationId: organization.id,
      name: organization.name,
      slug: organization.slug,
      logoUrl: organization.logoUrl,
      theme: organization.theme,
      updatedAt: organization.updatedAt.toISOString(),
    }));
    const selected = themes.some(
      ({ organizationId }) => organizationId === selectedOrganizationId,
    )
      ? selectedOrganizationId
      : null;
    setAvailableThemes(themes);
    setSelectedOrganizationId(selected);
    void persistThemeLibrary(userId, selected, themes);
  }, [hydratedUserId, selectedOrganizationId, themesQuery.data, userId]);

  const activeTheme =
    availableThemes.find(
      ({ organizationId }) => organizationId === selectedOrganizationId,
    ) ?? null;
  const mobileTheme = createMobileTheme(
    colorScheme,
    activeTheme?.theme ?? null,
  );
  const isHydrated = !isSessionPending && hydratedUserId === (userId ?? null);

  async function selectTheme(organizationId: string | null) {
    const selected =
      organizationId !== null &&
      availableThemes.some((theme) => theme.organizationId === organizationId)
        ? organizationId
        : null;
    setSelectedOrganizationId(selected);
    if (userId) {
      await persistThemeLibrary(userId, selected, availableThemes);
    }
  }

  async function refreshThemes() {
    if (userId) await themesQuery.refetch();
  }

  return (
    <AppThemeContext.Provider
      value={{
        colorScheme,
        colors: mobileTheme.colors,
        activeTheme,
        availableThemes,
        isHydrated,
        isRefreshingThemes: themesQuery.isRefetching,
        selectTheme,
        refreshThemes,
      }}
    >
      <VariableContextProvider value={mobileTheme.variables}>
        {children}
      </VariableContextProvider>
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const theme = useContext(AppThemeContext);
  if (!theme) {
    throw new Error("useAppTheme must be used within AppThemeProvider");
  }
  return theme;
}
