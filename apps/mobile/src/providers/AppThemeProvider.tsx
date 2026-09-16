import type { RouterOutputs } from "@hakgyo/api";
import { parseOrganizationTheme } from "@hakgyo/shared";
import { useGlobalSearchParams } from "expo-router";
import Storage from "expo-sqlite/kv-store";
import { VariableContextProvider } from "nativewind";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AppState, useColorScheme } from "react-native";

import { authClient } from "../lib/auth-client";
import { api } from "../lib/trpc";
import { type ColorScheme, type ThemeColors } from "../theme/colors";
import { createMobileTheme } from "../theme/organization-theme";

const STORAGE_VERSION = 2;

export type ActiveBrandContext = RouterOutputs["brand"]["getContext"];
export type AvailableOrganizationBrand =
  RouterOutputs["brand"]["listAvailableContexts"][number];

type StoredBrandLibrary = {
  version: typeof STORAGE_VERSION;
  selectedOrganizationId: string | null;
  organizations: AvailableOrganizationBrand[];
};

type AppThemeContextValue = {
  colorScheme: ColorScheme;
  colors: ThemeColors;
  activeBrand: ActiveBrandContext;
  activeOrganizationId: string | null;
  availableOrganizations: AvailableOrganizationBrand[];
  isHydrated: boolean;
  isRefreshingOrganizations: boolean;
  selectOrganization: (organizationId: string) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
};

const defaultBrand: ActiveBrandContext = {
  organizationId: null,
  name: "Hakgyo",
  slug: null,
  logoUrl: null,
  theme: null,
  themeEnabled: false,
  isThemed: false,
  source: "default",
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function storageKey(userId: string) {
  return `hakgyo:brand-workspaces:v${STORAGE_VERSION}:${userId}`;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseStoredOrganization(
  value: unknown,
): AvailableOrganizationBrand | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.organizationId !== "string" ||
    typeof item.name !== "string" ||
    typeof item.slug !== "string" ||
    (item.logoUrl !== null && typeof item.logoUrl !== "string") ||
    typeof item.themeEnabled !== "boolean"
  ) {
    return null;
  }
  const theme = item.themeEnabled ? parseOrganizationTheme(item.theme) : null;
  return {
    organizationId: item.organizationId,
    name: item.name,
    slug: item.slug,
    logoUrl: item.logoUrl,
    theme,
    themeEnabled: item.themeEnabled,
    isThemed: theme !== null,
    source: "organization",
  };
}

function parseStoredBrandLibrary(
  value: string | null,
): StoredBrandLibrary | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;
    if (
      record.version !== STORAGE_VERSION ||
      !Array.isArray(record.organizations)
    ) {
      return null;
    }
    const organizations = record.organizations.flatMap((organization) => {
      const parsedOrganization = parseStoredOrganization(organization);
      return parsedOrganization ? [parsedOrganization] : [];
    });
    return {
      version: STORAGE_VERSION,
      selectedOrganizationId:
        typeof record.selectedOrganizationId === "string"
          ? record.selectedOrganizationId
          : null,
      organizations,
    };
  } catch {
    return null;
  }
}

async function persistBrandLibrary(
  userId: string,
  selectedOrganizationId: string | null,
  organizations: AvailableOrganizationBrand[],
) {
  await Storage.setItem(
    storageKey(userId),
    JSON.stringify({
      version: STORAGE_VERSION,
      selectedOrganizationId,
      organizations,
    } satisfies StoredBrandLibrary),
  );
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const routeParams = useGlobalSearchParams<{
    cohortId?: string | string[];
    courseId?: string | string[];
  }>();
  const userId = session?.user.id ?? null;
  const routeCohortId = firstParam(routeParams.cohortId);
  const routeCourseId = firstParam(routeParams.courseId);
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const [hydratedUserId, setHydratedUserId] = useState<string | null>();
  const [availableOrganizations, setAvailableOrganizations] = useState<
    AvailableOrganizationBrand[]
  >([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<
    string | null
  >(null);
  const organizationsQuery = api.brand.listAvailableContexts.useQuery(
    undefined,
    {
      enabled: Boolean(userId),
      staleTime: 60_000,
      refetchInterval: 60_000,
      refetchOnReconnect: true,
    },
  );
  const routeBrandQuery = api.brand.getContext.useQuery(
    { cohortId: routeCohortId, courseId: routeCourseId },
    {
      enabled: Boolean(routeCohortId || routeCourseId),
      retry: false,
      staleTime: 60_000,
    },
  );

  const refetchOrganizations = organizationsQuery.refetch;
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && userId) void refetchOrganizations();
    });
    return () => subscription.remove();
  }, [refetchOrganizations, userId]);

  useEffect(() => {
    let active = true;
    setHydratedUserId(undefined);
    setAvailableOrganizations([]);
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
        const stored = parseStoredBrandLibrary(storedValue);
        const organizations = stored?.organizations ?? [];
        const selected = organizations.some(
          ({ organizationId }) =>
            organizationId === stored?.selectedOrganizationId,
        )
          ? (stored?.selectedOrganizationId ?? null)
          : (organizations[0]?.organizationId ?? null);
        setAvailableOrganizations(organizations);
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
    if (!userId || hydratedUserId !== userId || !organizationsQuery.data) {
      return;
    }
    const organizations = organizationsQuery.data.flatMap((organization) => {
      const parsed = parseStoredOrganization(organization);
      return parsed ? [parsed] : [];
    });
    const selected = organizations.some(
      ({ organizationId }) => organizationId === selectedOrganizationId,
    )
      ? selectedOrganizationId
      : (organizations[0]?.organizationId ?? null);
    setAvailableOrganizations(organizations);
    setSelectedOrganizationId(selected);
    void persistBrandLibrary(userId, selected, organizations);
  }, [hydratedUserId, organizationsQuery.data, selectedOrganizationId, userId]);

  useEffect(() => {
    const routeOrganizationId = routeBrandQuery.data?.organizationId;
    if (
      !userId ||
      !routeOrganizationId ||
      routeOrganizationId === selectedOrganizationId ||
      !availableOrganizations.some(
        ({ organizationId }) => organizationId === routeOrganizationId,
      )
    ) {
      return;
    }
    setSelectedOrganizationId(routeOrganizationId);
    void persistBrandLibrary(
      userId,
      routeOrganizationId,
      availableOrganizations,
    );
  }, [
    availableOrganizations,
    routeBrandQuery.data?.organizationId,
    selectedOrganizationId,
    userId,
  ]);

  const selectedBrand =
    availableOrganizations.find(
      ({ organizationId }) => organizationId === selectedOrganizationId,
    ) ?? defaultBrand;
  const routeBrand = routeBrandQuery.data;
  const activeBrand = routeBrand?.organizationId ? routeBrand : selectedBrand;
  const mobileTheme = createMobileTheme(colorScheme, activeBrand.theme);
  const isHydrated = !isSessionPending && hydratedUserId === (userId ?? null);

  async function selectOrganization(organizationId: string) {
    if (
      !availableOrganizations.some(
        (organization) => organization.organizationId === organizationId,
      )
    ) {
      return;
    }
    setSelectedOrganizationId(organizationId);
    if (userId) {
      await persistBrandLibrary(userId, organizationId, availableOrganizations);
    }
  }

  async function refreshOrganizations() {
    if (userId) await organizationsQuery.refetch();
  }

  return (
    <AppThemeContext.Provider
      value={{
        colorScheme,
        colors: mobileTheme.colors,
        activeBrand,
        activeOrganizationId: activeBrand.organizationId,
        availableOrganizations,
        isHydrated,
        isRefreshingOrganizations: organizationsQuery.isRefetching,
        selectOrganization,
        refreshOrganizations,
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
