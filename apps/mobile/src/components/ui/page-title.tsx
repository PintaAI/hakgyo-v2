import { Text } from "react-native";

/** The in-content title at the top of a tab root. */
export function PageTitle({ children }: { children: string }) {
  return (
    <Text
      accessibilityRole="header"
      className="text-[26px] font-black leading-8 tracking-tight text-foreground"
    >
      {children}
    </Text>
  );
}
