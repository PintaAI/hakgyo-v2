import { Icon } from "@expo/ui";

export const toolbarIcons = {
  menu: Icon.select({
    ios: "sidebar.left",
    android: import("@expo/material-symbols/menu.xml"),
  }),
  search: Icon.select({
    ios: "magnifyingglass",
    android: import("@expo/material-symbols/search.xml"),
  }),
  notifications: Icon.select({
    ios: "bell",
    android: import("@expo/material-symbols/notifications.xml"),
  }),
  home: Icon.select({
    ios: "house.fill",
    android: import("@expo/material-symbols/home.xml"),
  }),
  submit: Icon.select({
    ios: "paperplane.fill",
    android: import("@expo/material-symbols/send.xml"),
  }),
  next: Icon.select({
    ios: "arrow.right",
    android: import("@expo/material-symbols/arrow_forward.xml"),
  }),
  pause: Icon.select({
    ios: "pause.fill",
    android: import("@expo/material-symbols/pause.xml"),
  }),
  mic: Icon.select({
    ios: "mic.fill",
    android: import("@expo/material-symbols/mic.xml"),
  }),
  stop: Icon.select({
    ios: "stop.fill",
    android: import("@expo/material-symbols/stop.xml"),
  }),
} as const;
