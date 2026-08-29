import type { Href } from "expo-router";
import type { SymbolViewProps } from "expo-symbols";

export type AppArea = "main";

export type SidebarItem = {
  id: string;
  label: string;
  icon: SymbolViewProps["name"];
  route: Href;
  activePaths?: string[];
  replace?: boolean;
  children?: SidebarItem[];
};

export type SidebarSection = {
  label: string;
  area: AppArea;
  items: SidebarItem[];
};
