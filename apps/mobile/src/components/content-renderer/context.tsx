import { createContext, useContext, type ReactNode } from "react";
import { Linking } from "react-native";

import { useAppTheme } from "../../providers/AppThemeProvider";
import type { ThemeColors } from "../../theme/colors";
import type { AssetUrlResolver, ContentBlockRenderer } from "./types";

type ContentRendererContextValue = {
  colors: ThemeColors;
  onOpenUrl: (url: string) => void | Promise<void>;
  renderers: Readonly<Record<string, ContentBlockRenderer>>;
  resolveAssetUrl?: AssetUrlResolver;
};

const ContentRendererContext =
  createContext<ContentRendererContextValue | null>(null);

export function ContentRendererProvider({
  children,
  onOpenUrl,
  renderers,
  resolveAssetUrl,
}: {
  children: ReactNode;
  onOpenUrl?: (url: string) => void | Promise<void>;
  renderers: Readonly<Record<string, ContentBlockRenderer>>;
  resolveAssetUrl?: AssetUrlResolver;
}) {
  const { colors } = useAppTheme();

  return (
    <ContentRendererContext.Provider
      value={{
        colors,
        onOpenUrl:
          onOpenUrl ??
          ((url) => {
            if (!/^(https?:|mailto:|tel:)/i.test(url)) return;
            void Linking.openURL(url).catch(() => undefined);
          }),
        renderers,
        resolveAssetUrl,
      }}
    >
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
