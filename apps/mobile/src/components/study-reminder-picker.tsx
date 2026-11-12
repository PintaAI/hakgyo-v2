import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { type ReactNode, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import {
  formatReminderTime,
  REMINDER_TIME_PRESETS,
  STUDY_MINUTE_OPTIONS,
  type StudyReminder,
} from "../lib/study-reminder-plan";
import { hapticSelection } from "../lib/haptics";
import { useAppTheme } from "../providers/AppThemeProvider";

export type StudyReminderChoice = Omit<StudyReminder, "enabled">;

function isPreset(choice: StudyReminderChoice) {
  return REMINDER_TIME_PRESETS.some(
    (preset) => preset.hour === choice.hour && preset.minute === choice.minute,
  );
}

function OptionRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-foreground">{label}</Text>
      <View className="flex-row gap-2">{children}</View>
    </View>
  );
}

/**
 * One of four equal tiles in a row: a value and a caption under it. Equal
 * widths keep each row on one line down to 320pt wide screens.
 */
function OptionTile({
  value,
  caption,
  selected,
  onPress,
  accessibilityLabel,
}: {
  value: string;
  caption: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`min-h-14 flex-1 items-center justify-center rounded-2xl px-1 py-2 active:opacity-70 ${selected ? "bg-primary" : "bg-muted"}`}
      onPress={() => {
        if (!selected) hapticSelection();
        onPress();
      }}
      style={{ borderCurve: "continuous" }}
    >
      <Text
        className={`text-base font-black tabular-nums ${selected ? "text-primary-foreground" : "text-foreground"}`}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text
        className={`text-[11px] font-semibold ${selected ? "text-primary-foreground" : "text-muted-foreground"}`}
        numberOfLines={1}
      >
        {caption}
      </Text>
    </Pressable>
  );
}

/**
 * How long a learner plans to study each day and when to be reminded: preset
 * tiles, plus "Atur sendiri" for any time (an inline wheel on iOS, the
 * system dialog on Android).
 */
export function StudyReminderPicker({
  value,
  onChange,
}: {
  value: StudyReminderChoice;
  onChange: (value: StudyReminderChoice) => void;
}) {
  const { colorScheme, colors } = useAppTheme();
  const [pickingTime, setPickingTime] = useState(false);
  const custom = !isPreset(value);
  const time = new Date();
  time.setHours(value.hour, value.minute, 0, 0);

  const setTime = (date: Date) =>
    onChange({ ...value, hour: date.getHours(), minute: date.getMinutes() });

  return (
    <View className="gap-4">
      <OptionRow label="Belajar berapa menit sehari?">
        {STUDY_MINUTE_OPTIONS.map((minutes) => (
          <OptionTile
            accessibilityLabel={`${minutes} menit`}
            caption="menit"
            key={minutes}
            onPress={() => onChange({ ...value, minutes })}
            selected={value.minutes === minutes}
            value={String(minutes)}
          />
        ))}
      </OptionRow>
      <OptionRow label="Ingatkan aku jam">
        {REMINDER_TIME_PRESETS.map((preset) => {
          const label = formatReminderTime(preset.hour, preset.minute);
          return (
            <OptionTile
              accessibilityLabel={`${preset.label}, jam ${label}`}
              caption={preset.label}
              key={preset.label}
              onPress={() => {
                setPickingTime(false);
                onChange({
                  ...value,
                  hour: preset.hour,
                  minute: preset.minute,
                });
              }}
              selected={
                value.hour === preset.hour && value.minute === preset.minute
              }
              value={label}
            />
          );
        })}
        <OptionTile
          accessibilityLabel={
            custom
              ? `Atur sendiri, jam ${formatReminderTime(value.hour, value.minute)}`
              : "Atur jam sendiri"
          }
          caption={custom ? "Atur sendiri" : "sendiri"}
          onPress={() => setPickingTime((open) => !open)}
          selected={custom || pickingTime}
          value={custom ? formatReminderTime(value.hour, value.minute) : "Atur"}
        />
      </OptionRow>
      {pickingTime && Platform.OS === "ios" ? (
        <DateTimePicker
          accentColor={colors.primary}
          display="spinner"
          locale="id_ID"
          mode="time"
          onValueChange={(_, date) => setTime(date)}
          style={{ height: 160 }}
          themeVariant={colorScheme === "dark" ? "dark" : "light"}
          value={time}
        />
      ) : null}
      {pickingTime && Platform.OS === "android" ? (
        // A dialog that opens on mount; unmount it once it closes.
        <DateTimePicker
          is24Hour
          mode="time"
          negativeButton={{ label: "Batal" }}
          onDismiss={() => setPickingTime(false)}
          onValueChange={(_, date) => {
            setPickingTime(false);
            setTime(date);
          }}
          positiveButton={{ label: "Pilih" }}
          presentation="dialog"
          value={time}
        />
      ) : null}
    </View>
  );
}
