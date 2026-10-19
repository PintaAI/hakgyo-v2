import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Text, View } from "react-native";

import { useAppTheme } from "../../providers/AppThemeProvider";

export type PageTitleIcon = {
  /** SF Symbol, matching the tab's icon. */
  symbol: SymbolViewProps["name"];
  /** Glyph shown where SF Symbols are unavailable (Android). */
  fallback: string;
};

function TitleIcon({ icon }: { icon: PageTitleIcon }) {
  const { colors } = useAppTheme();
  return (
    <View
      accessible={false}
      className="size-9 items-center justify-center rounded-xl bg-primary/10"
    >
      <SymbolView
        fallback={
          <Text className="text-base font-black text-primary">
            {icon.fallback}
          </Text>
        }
        name={icon.symbol}
        size={18}
        tintColor={colors.primary}
        weight="semibold"
      />
    </View>
  );
}

/** The in-content title at the top of a tab root, optionally with its icon. */
export function PageTitle({
  children,
  icon,
}: {
  children: string;
  icon?: PageTitleIcon;
}) {
  const title = (
    <Text
      accessibilityRole="header"
      className="text-[26px] font-black leading-8 tracking-tight text-foreground"
    >
      {children}
    </Text>
  );
  if (!icon) return title;
  return (
    <View className="flex-row items-center gap-3">
      <TitleIcon icon={icon} />
      {title}
    </View>
  );
}
