import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Alert, Linking, Platform } from "react-native";

import { localDateKey } from "./optimistic-gamification";
import {
  getPushPermission,
  type PushPermission,
  requestPushPermission,
} from "./push-notifications";
import {
  parseStudyReminder,
  planStudyReminderDates,
  type StudyReminder,
  studyReminderContent,
} from "./study-reminder-plan";

/**
 * The daily study reminder: a local notification at a time the learner picks
 * in onboarding or in Pengaturan, naming how many minutes they plan to study.
 * Stored on the device only. SecureStore, like the onboarding marker, so it
 * survives a sign-out; Reset aplikasi clears it.
 */
export const STUDY_REMINDER_KEY = "hakgyo.studyReminder";

const IDENTIFIER_PREFIX = "study-reminder:";
const CHANNEL_ID = "study-reminder";

export function getStudyReminder(): StudyReminder {
  return parseStudyReminder(SecureStore.getItem(STUDY_REMINDER_KEY));
}

export function saveStudyReminder(reminder: StudyReminder) {
  SecureStore.setItem(STUDY_REMINDER_KEY, JSON.stringify(reminder));
}

export async function cancelStudyReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((request) => request.identifier.startsWith(IDENTIFIER_PREFIX))
      .map((request) =>
        Notifications.cancelScheduledNotificationAsync(request.identifier),
      ),
  );
}

async function ensureChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Pengingat belajar",
    importance: Notifications.AndroidImportance.HIGH,
  });
}

// Runs one at a time, so overlapping calls (app focus and a save) never
// leave reminders from both behind.
let scheduling: Promise<void> = Promise.resolve();

/**
 * Replaces the scheduled reminders with the window `reminder` asks for, or
 * cancels them when it is off or notifications are not permitted.
 */
export function scheduleStudyReminders(
  reminder: StudyReminder,
  { studiedToday }: { studiedToday: boolean },
) {
  scheduling = scheduling
    .catch(() => undefined)
    .then(async () => {
      await cancelStudyReminders();
      if (!reminder.enabled) return;
      if ((await getPushPermission()) !== "granted") return;
      await ensureChannel();
      const dates = planStudyReminderDates(reminder, {
        now: new Date(),
        studiedToday,
      });
      for (const date of dates) {
        await Notifications.scheduleNotificationAsync({
          // One per day: scheduling the same day again replaces it.
          identifier: `${IDENTIFIER_PREFIX}${localDateKey(date)}`,
          content: {
            ...studyReminderContent(reminder.minutes, date),
            // Opens Hari ini through the push tap handler.
            data: { kind: "study-reminder", mobilePath: "/home" },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date,
            channelId: CHANNEL_ID,
          },
        });
      }
    });
  return scheduling;
}

/**
 * Turns the reminder on: asks for notification permission, then saves and
 * schedules it. Returns the permission; anything but `granted` saves
 * nothing. A blocked permission offers the system settings.
 */
export async function enableStudyReminder(
  reminder: Omit<StudyReminder, "enabled">,
  { studiedToday }: { studiedToday: boolean },
): Promise<PushPermission> {
  const permission = await requestPushPermission();
  if (permission !== "granted") {
    Alert.alert(
      "Notifikasi belum diizinkan",
      permission === "blocked"
        ? "Izinkan notifikasi untuk Hakgyo di pengaturan perangkat, lalu nyalakan pengingat lagi."
        : "Pengingat bisa kamu nyalakan kapan saja di Profil, Pengaturan.",
      permission === "blocked"
        ? [
            { text: "Nanti", style: "cancel" },
            {
              text: "Buka pengaturan",
              onPress: () => void Linking.openSettings(),
            },
          ]
        : undefined,
    );
    return permission;
  }
  const enabled = { ...reminder, enabled: true };
  saveStudyReminder(enabled);
  await scheduleStudyReminders(enabled, { studiedToday });
  return permission;
}

/** Saves `reminder` and schedules (or cancels) its notifications. */
export async function updateStudyReminder(
  reminder: StudyReminder,
  { studiedToday }: { studiedToday: boolean },
) {
  saveStudyReminder(reminder);
  await scheduleStudyReminders(reminder, { studiedToday });
}
