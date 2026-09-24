import { Icon } from "@expo/ui";

export const toolbarIcons = {
  back: Icon.select({
    ios: "chevron.left",
    android: import("@expo/material-symbols/arrow_back.xml"),
  }),
  close: Icon.select({
    ios: "xmark",
    android: import("@expo/material-symbols/close.xml"),
  }),
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
  keyboard: Icon.select({
    ios: "keyboard",
    android: import("@expo/material-symbols/keyboard.xml"),
  }),
  keyboardHide: Icon.select({
    ios: "keyboard.chevron.compact.down",
    android: import("@expo/material-symbols/keyboard_hide.xml"),
  }),
  hint: Icon.select({
    ios: "lightbulb.fill",
    android: import("@expo/material-symbols/lightbulb.xml"),
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
