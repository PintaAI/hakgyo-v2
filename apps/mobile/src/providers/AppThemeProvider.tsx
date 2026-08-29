import { VariableContextProvider } from "nativewind";
import { createContext, useContext, type ReactNode } from "react";
import { useColorScheme } from "react-native";

import {
  themeColors,
  themeVariables,
  type ColorScheme,
  type ThemeColors,
} from "../theme/colors";

const AppThemeContext = createContext<{
  colorScheme: ColorScheme;
  colors: ThemeColors;
} | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const colors = themeColors[colorScheme];

  return (
    <AppThemeContext.Provider value={{ colorScheme, colors }}>
      <VariableContextProvider value={themeVariables[colorScheme]}>
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
