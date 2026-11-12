import { useState } from "react";
import { Text } from "react-native";

import { StudyScreen } from "../../src/components/learning-ui";
import {
  SettingsSection,
  SettingsToggleRow,
} from "../../src/components/settings-ui";
import {
  StudyReminderPicker,
  type StudyReminderChoice,
} from "../../src/components/study-reminder-picker";
import {
  enableStudyReminder,
  getStudyReminder,
  updateStudyReminder,
} from "../../src/lib/study-reminder";
import { studyReminderSummary } from "../../src/lib/study-reminder-plan";
import { useStudiedToday } from "../../src/lib/use-study-reminder-schedule";

/** Pengaturan → Pengingat belajar: the daily local study reminder. */
export default function StudyReminderScreen() {
  const { studiedToday } = useStudiedToday();
  const [reminder, setReminder] = useState(getStudyReminder);
  const [saving, setSaving] = useState(false);

  const change = (choice: StudyReminderChoice) => {
    const next = { ...reminder, ...choice };
    setReminder(next);
    if (next.enabled) {
      void updateStudyReminder(next, { studiedToday: studiedToday() }).catch(
        () => undefined,
      );
    }
  };

  const toggle = async (enabled: boolean) => {
    setSaving(true);
    try {
      if (enabled) {
        await enableStudyReminder(reminder, { studiedToday: studiedToday() });
      } else {
        await updateStudyReminder(
          { ...reminder, enabled: false },
          { studiedToday: studiedToday() },
        );
      }
    } catch {
      // Saved but not scheduled: the next launch schedules it again.
    } finally {
      // Turning on saves only once permitted; keep the unsaved choice.
      const stored = getStudyReminder();
      setReminder((current) => ({ ...current, enabled: stored.enabled }));
      setSaving(false);
    }
  };

  return (
    <StudyScreen title="Pengingat belajar" headerShown>
      <SettingsSection title="Pengingat harian">
        <SettingsToggleRow
          detail={studyReminderSummary(reminder)}
          disabled={saving}
          label="Ingatkan aku tiap hari"
          onValueChange={(enabled) => void toggle(enabled)}
          symbol="alarm.fill"
          value={reminder.enabled}
        />
      </SettingsSection>
      <StudyReminderPicker onChange={change} value={reminder} />
      <Text className="text-sm leading-5 text-muted-foreground">
        Pengingat dikirim oleh ponsel ini, jadi tetap muncul walau sedang
        offline. Kalau hari itu kamu sudah belajar, pengingatnya dilewati.
      </Text>
    </StudyScreen>
  );
}
