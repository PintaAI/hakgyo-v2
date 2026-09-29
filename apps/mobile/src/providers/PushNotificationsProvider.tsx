import { useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, AppState, Linking } from "react-native";

import { authClient } from "../lib/auth-client";
import { requestLearnCohortFocus } from "../lib/learn-cohort-focus";
import {
  getNotificationTarget,
  getPushedEntity,
  matchingIndicatorKeys,
  matchingNoticeIds,
} from "../lib/notification-target";
import {
  getDeviceDetails,
  getExpoPushToken,
  getPushDeviceId,
  getPushPermission,
  isPushOptedOut,
  isPushSupported,
  markPushPrompted,
  type PushPermission,
  requestPushPermission,
  setPushOptedOut,
  wasPushPrompted,
} from "../lib/push-notifications";
import { useSidebarIndicators } from "../lib/sidebar-indicators";
import { api } from "../lib/trpc";
import { useSyncNotices, type LearnerIndex } from "../sync/hooks";
import type { LocalIndexRecord } from "../sync/local-data";
import type { SyncNotice } from "../sync/notices";
import { indexScope, syncQueryKeys } from "../sync/query-keys";
import { useAppTheme } from "./AppThemeProvider";
import { useMobileSyncActions } from "./MobileSyncProvider";

// Show pushes that arrive while the app is open like any other notification.
Notifications.setNotificationHandler({
  handleNotification: () =>
    Promise.resolve({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
});

/**
 * - `unsupported`: simulator, Expo Go or a build without push credentials.
 * - `off`: the learner turned notifications off in Profile.
 * - `undetermined` / `denied` / `blocked`: OS permission state.
 * - `unregistered`: permitted, but the server call failed (offline).
 * - `enabled`: this device is registered with the server.
 */
export type PushStatus =
  | "loading"
  | "unsupported"
  | "off"
  | "undetermined"
  | "denied"
  | "blocked"
  | "unregistered"
  | "enabled";

type PushNotificationsValue = {
  status: PushStatus;
  /** Profile switch: asks for permission when needed and registers. */
  setEnabled: (enabled: boolean) => Promise<void>;
  /**
   * Shows the one-time pre-permission prompt from a screen where
   * notifications obviously help (Tugas, events). No-op otherwise.
   */
  promptInContext: () => void;
  /** Stops pushes to this device; call before signing out. */
  unregisterDevice: () => Promise<void>;
};

const PushNotificationsContext = createContext<PushNotificationsValue | null>(
  null,
);

/** Render inside the root navigator so taps can route immediately. */
export function PushNotificationsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;
  const [status, setStatus] = useState<PushStatus>("loading");
  // mutate/mutateAsync are stable across renders; the mutation objects are not.
  const { mutateAsync: registerDevice } =
    api.notification.registerDevice.useMutation();
  const { mutateAsync: disableDevice } =
    api.notification.disableDevice.useMutation();
  const { mutate: markRead } = api.notification.markRead.useMutation();
  const utils = api.useUtils();
  const registeredRef = useRef<string | null>(null);
  const promptingRef = useRef(false);
  const queryClient = useQueryClient();
  const { activeOrganizationId } = useAppTheme();
  const { checkForUpdates } = useMobileSyncActions();
  const { dismiss: dismissNotices } = useSyncNotices(null);
  const { markSeen } = useSidebarIndicators();

  /**
   * Pushes announce changes the Pembaruan drawer derives from sync data, so
   * pull them in now instead of at the next poll. After a tap, clear the
   * drawer items about the same change so it is not unread twice.
   */
  const syncPushedChange = useCallback(
    async (data: unknown, opened: boolean) => {
      const organizationId = activeOrganizationId ?? undefined;
      await checkForUpdates(organizationId).catch(() => undefined);
      if (!opened) return;
      const entity = getPushedEntity(data);
      const notices =
        queryClient.getQueryData<SyncNotice[]>(syncQueryKeys.notices()) ?? [];
      const noticeIds = matchingNoticeIds(notices, entity);
      if (noticeIds.length > 0) dismissNotices(noticeIds);
      const index = queryClient.getQueryData<LocalIndexRecord<LearnerIndex>>(
        syncQueryKeys.index(indexScope(activeOrganizationId)),
      );
      const keys = matchingIndicatorKeys(
        index?.index.sidebarIndicators?.items ?? [],
        entity,
      );
      if (keys.length > 0) markSeen(keys);
    },
    [
      activeOrganizationId,
      checkForUpdates,
      dismissNotices,
      markSeen,
      queryClient,
    ],
  );
  // Listeners subscribe once; they always call the latest version.
  const syncPushedChangeRef = useRef(syncPushedChange);
  useEffect(() => {
    syncPushedChangeRef.current = syncPushedChange;
  }, [syncPushedChange]);

  const register = useCallback(async () => {
    if (!userId) return;
    // Already registered this session; token rotations clear the ref.
    if (registeredRef.current === userId) {
      setStatus("enabled");
      return;
    }
    let token: string;
    try {
      token = await getExpoPushToken();
    } catch {
      // No FCM/APNs credentials in this build (e.g. Android without
      // google-services.json).
      setStatus("unsupported");
      return;
    }
    try {
      await registerDevice({
        deviceId: await getPushDeviceId(),
        expoPushToken: token,
        ...getDeviceDetails(),
      });
      registeredRef.current = userId;
      setStatus("enabled");
    } catch {
      // Offline or server error: retried on the next foreground.
      setStatus("unregistered");
    }
  }, [registerDevice, userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    if (!isPushSupported) {
      setStatus("unsupported");
      return;
    }
    if (await isPushOptedOut()) {
      setStatus("off");
      return;
    }
    const permission = await getPushPermission();
    if (permission === "granted") await register();
    else setStatus(permission);
  }, [register, userId]);

  // Register silently whenever permission already exists (fresh sign-in,
  // permission granted in system settings, token rotation). Never prompts.
  useEffect(() => {
    if (!userId) {
      registeredRef.current = null;
      setStatus("loading");
      return;
    }
    void refresh();
    const appState = AppState.addEventListener("change", (next) => {
      if (next === "active") void refresh();
    });
    const tokenSubscription = Notifications.addPushTokenListener(() => {
      registeredRef.current = null;
      void refresh();
    });
    return () => {
      appState.remove();
      tokenSubscription.remove();
    };
  }, [refresh, userId]);

  // Open the notification's screen on tap, including the tap that launched
  // the app. Children (the navigator) mount first, so the route resolves.
  useEffect(() => {
    if (!userId) return;
    const handle = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      Notifications.clearLastNotificationResponse();
      const target = getNotificationTarget(
        response.notification.request.content.data,
      );
      const { notificationId } = target;
      if (notificationId) {
        markRead(
          { id: notificationId },
          { onSuccess: () => void utils.notification.unreadCount.invalidate() },
        );
      }
      void syncPushedChangeRef.current(
        response.notification.request.content.data,
        true,
      );
      if (target.kind === "cohort") {
        requestLearnCohortFocus(target.cohortId);
        router.navigate("/(home)/(tabs)/learn");
      } else if (target.kind === "route") {
        // Server-built route; expo-router shows its not-found screen for
        // routes a newer server adds before this app version has them.
        router.push(target.path as never);
      }
    };
    handle(Notifications.getLastNotificationResponse());
    const subscription =
      Notifications.addNotificationResponseReceivedListener(handle);
    // Arrived while the app is open: refresh so the drawer already has it.
    const received = Notifications.addNotificationReceivedListener(
      (notification) =>
        void syncPushedChangeRef.current(
          notification.request.content.data,
          false,
        ),
    );
    return () => {
      subscription.remove();
      received.remove();
    };
  }, [markRead, userId, utils]);

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      if (!userId || !isPushSupported) return;
      if (!enabled) {
        await setPushOptedOut(true);
        setStatus("off");
        registeredRef.current = null;
        await disableDevice({ deviceId: await getPushDeviceId() }).catch(
          () => undefined,
        );
        return;
      }
      await setPushOptedOut(false);
      await markPushPrompted();
      const permission = await requestPushPermission();
      if (permission === "granted") {
        await register();
        return;
      }
      setStatus(permission);
      if (permission === "blocked") {
        Alert.alert(
          "Notifikasi dimatikan",
          "Izinkan notifikasi untuk Hakgyo di pengaturan perangkat.",
          [
            { text: "Nanti", style: "cancel" },
            {
              text: "Buka pengaturan",
              onPress: () => void Linking.openSettings(),
            },
          ],
        );
      }
    },
    [disableDevice, register, userId],
  );

  const promptInContext = useCallback(() => {
    if (status !== "undetermined" || promptingRef.current) return;
    promptingRef.current = true;
    void (async () => {
      try {
        if (await wasPushPrompted()) return;
        await markPushPrompted();
        Alert.alert(
          "Aktifkan notifikasi?",
          "Dapatkan kabar saat tryout dibuka, pertemuan kelas dijadwalkan, atau Tugas selesai dinilai.",
          [
            { text: "Nanti", style: "cancel" },
            { text: "Aktifkan", onPress: () => void setEnabled(true) },
          ],
        );
      } finally {
        promptingRef.current = false;
      }
    })();
  }, [setEnabled, status]);

  const unregisterDevice = useCallback(async () => {
    registeredRef.current = null;
    if (!isPushSupported) return;
    await disableDevice({ deviceId: await getPushDeviceId() }).catch(
      () => undefined,
    );
  }, [disableDevice]);

  const value = useMemo(
    () => ({ status, setEnabled, promptInContext, unregisterDevice }),
    [promptInContext, setEnabled, status, unregisterDevice],
  );

  return (
    <PushNotificationsContext.Provider value={value}>
      {children}
    </PushNotificationsContext.Provider>
  );
}

export function usePushNotifications() {
  const value = useContext(PushNotificationsContext);
  if (!value) {
    throw new Error(
      "usePushNotifications must be used inside PushNotificationsProvider",
    );
  }
  return value;
}

export type { PushPermission };
