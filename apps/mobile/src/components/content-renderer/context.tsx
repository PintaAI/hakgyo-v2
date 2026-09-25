import { createContext, useContext, useMemo, type ReactNode } from "react";
import { Linking } from "react-native";

import { useAppTheme } from "../../providers/AppThemeProvider";
import type { ThemeColors } from "../../theme/colors";
import type {
  AssetUrlResolver,
  ContentBlockRenderer,
  ResourceReferenceData,
  ResourceReferenceType,
} from "./types";

type ContentRendererContextValue = {
  colors: ThemeColors;
  onOpenUrl: (url: string) => void | Promise<void>;
  onOpenResource?: (
    type: ResourceReferenceType,
    resourceId: string,
    courseItemId: string | null,
  ) => void;
  renderers: Readonly<Record<string, ContentBlockRenderer>>;
  resourceReferences?: ResourceReferenceData;
  resolveAssetUrl?: AssetUrlResolver;
  onReadingProgress?: (key: string, finished: boolean) => void;
};

const ContentRendererContext =
  createContext<ContentRendererContextValue | null>(null);

function openExternalUrl(url: string) {
  if (!/^(https?:|mailto:|tel:)/i.test(url)) return;
  void Linking.openURL(url).catch(() => undefined);
}

export function ContentRendererProvider({
  children,
  onOpenUrl,
  onOpenResource,
  onReadingProgress,
  renderers,
  resourceReferences,
  resolveAssetUrl,
}: {
  children: ReactNode;
  onReadingProgress?: (key: string, finished: boolean) => void;
  onOpenUrl?: (url: string) => void | Promise<void>;
  onOpenResource?: (
    type: ResourceReferenceType,
    resourceId: string,
    courseItemId: string | null,
  ) => void;
  renderers: Readonly<Record<string, ContentBlockRenderer>>;
  resourceReferences?: ResourceReferenceData;
  resolveAssetUrl?: AssetUrlResolver;
}) {
  const { colors } = useAppTheme();
  const value = useMemo<ContentRendererContextValue>(
    () => ({
      colors,
      onOpenUrl: onOpenUrl ?? openExternalUrl,
      onOpenResource,
      onReadingProgress,
      renderers,
      resourceReferences,
      resolveAssetUrl,
    }),
    [
      colors,
      onOpenResource,
      onReadingProgress,
      onOpenUrl,
      renderers,
      resourceReferences,
      resolveAssetUrl,
    ],
  );

  return (
    <ContentRendererContext.Provider value={value}>
      {children}
    </ContentRendererContext.Provider>
  );
}

export function useContentRenderer() {
  const context = useContext(ContentRendererContext);
  if (!context) {
    throw new Error(
      "useContentRenderer must be used within ContentRendererProvider",
    );
  }

  return context;
}
