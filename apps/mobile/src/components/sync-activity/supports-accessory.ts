import { Platform } from "react-native";

/** The tab bar bottom accessory exists from iOS 26 (Liquid Glass) on. */
export const supportsTabBarAccessory =
  Platform.OS === "ios" && Number.parseInt(String(Platform.Version), 10) >= 26;
