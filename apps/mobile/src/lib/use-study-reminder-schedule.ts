import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";

import { useAppTheme } from "../providers/AppThemeProvider";
import { useSyncIndex } from "../sync/hooks";
import { localDateKey } from "./optimistic-gamification";
import { getStudyReminder, scheduleStudyReminders } from "./study-reminder";

/**
 * Whether the learner earned XP today, from the synced gamification summary
 * (correct vocabulary answers update it at once, other activity at the next
 * sync). `studiedToday()` reads the date when called, so a screen left open
 * past midnight does not answer for yesterday.
 */
export function useStudiedToday() {
  const { activeOrganizationId } = useAppTheme();
  const { data } = useSyncIndex(activeOrganizationId);
  const activeDates = data?.gamification.weeklyActivity.activeDates;
  const activeDatesRef = useRef(activeDates);
  useEffect(() => {
    activeDatesRef.current = activeDates;
  }, [activeDates]);
  const studiedToday = useCallback(
    () => activeDatesRef.current?.includes(localDateKey(new Date())) ?? false,
    [],
  );
  return {
    studiedToday,
    /** Changes when today's first activity lands. */
    studiedTodayAtRender:
      activeDates?.includes(localDateKey(new Date())) ?? false,
  };
}

/**
 * Keeps the daily study reminders scheduled for the signed-in app: on launch,
 * on every return to the foreground (the window moves forward a day), and
 * when today's first activity drops today's reminder.
 */
export function useStudyReminderSchedule() {
  const { studiedToday, studiedTodayAtRender } = useStudiedToday();

  useEffect(() => {
    const schedule = () => {
      const reminder = getStudyReminder();
      if (!reminder.enabled) return;
      void scheduleStudyReminders(reminder, {
        studiedToday: studiedToday(),
      }).catch(() => undefined);
    };
    schedule();
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") schedule();
    });
    return () => subscription.remove();
  }, [studiedToday, studiedTodayAtRender]);
}
