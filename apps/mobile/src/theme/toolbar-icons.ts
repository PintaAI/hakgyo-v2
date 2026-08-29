import { Icon } from "@expo/ui";

export const toolbarIcons = {
  menu: Icon.select({
    ios: "sidebar.left",
    android: import("@expo/material-symbols/menu.xml"),
  }),
} as const;
