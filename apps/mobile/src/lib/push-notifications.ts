import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const DEVICE_ID_KEY = "hakgyo.push.deviceId";
const OPT_OUT_KEY = "hakgyo.push.optOut";
const PROMPTED_KEY = "hakgyo.push.prompted";

/** Android channel every server push targets (`channelId` in the sender). */
export const DEFAULT_CHANNEL_ID = "default";

/**
 * Stable per-install id sent as `deviceId` to `notification.registerDevice`.
 * It survives token rotation so the server keeps one row per device.
 */
export async function getPushDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = createUuidV4();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  return id;
}

// Not security-sensitive: the id only groups a device's token rotations.
function createUuidV4() {
  const bytes = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 256),
  );
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Set when the learner turns notifications off in Profile. */
export async function isPushOptedOut() {
  return (await SecureStore.getItemAsync(OPT_OUT_KEY)) === "1";
}

export async function setPushOptedOut(optedOut: boolean) {
  if (optedOut) await SecureStore.setItemAsync(OPT_OUT_KEY, "1");
  else await SecureStore.deleteItemAsync(OPT_OUT_KEY);
}

/** The contextual pre-permission prompt is shown at most once. */
export async function wasPushPrompted() {
  return (await SecureStore.getItemAsync(PROMPTED_KEY)) === "1";
}

export async function markPushPrompted() {
  await SecureStore.setItemAsync(PROMPTED_KEY, "1");
}

/**
 * Android 13+ only shows the permission dialog, and only issues a token,
 * once a channel exists, so create it before asking.
 */
async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
    name: "Umum",
    importance: Notifications.AndroidImportance.HIGH,
  });
}

export type PushPermission = "granted" | "undetermined" | "denied" | "blocked";

function toPermission(
  response: Notifications.NotificationPermissionsStatus,
): PushPermission {
  if (response.granted) return "granted";
  const iosStatus = response.ios?.status;
  if (
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL
  ) {
    return "granted";
  }
  if (response.status === "undetermined") return "undetermined";
  // Once the OS stops asking, only the system settings can re-enable it.
  return response.canAskAgain ? "denied" : "blocked";
}

export async function getPushPermission(): Promise<PushPermission> {
  await ensureAndroidChannel();
  return toPermission(await Notifications.getPermissionsAsync());
}

export async function requestPushPermission(): Promise<PushPermission> {
  await ensureAndroidChannel();
  const current = toPermission(await Notifications.getPermissionsAsync());
  if (current === "granted" || current === "blocked") return current;
  return toPermission(
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    }),
  );
}

/** Push only works on physical devices in a development or store build. */
export const isPushSupported = Device.isDevice && Platform.OS !== "web";

export async function getExpoPushToken(): Promise<string> {
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) throw new Error("EAS projectId is missing");
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

export function getDeviceDetails() {
  return {
    deviceName: (Device.deviceName ?? Device.modelName ?? undefined)?.slice(
      0,
      200,
    ),
    os: Platform.OS,
    appVersion: Constants.expoConfig?.version,
  };
}
