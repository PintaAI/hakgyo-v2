import { View } from "react-native";

const heights = { sm: "h-1", md: "h-1.5" } as const;

/**
 * A thin progress bar. Pass `value` and `max` for a counted progress (for
 * example 3 of 8 items); pass only a `value` between 0 and 1 for a fraction.
 */
export function ProgressBar({
  value,
  max,
  size = "md",
  className = "w-full",
  accessibilityLabel,
}: {
  value: number;
  max?: number;
  size?: keyof typeof heights;
  /** Width and flex classes; defaults to the full width. */
  className?: string;
  accessibilityLabel?: string;
}) {
  const fraction = max === undefined ? value : max > 0 ? value / max : 0;
  const percent = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityValue={
        max === undefined
          ? { min: 0, max: 100, now: percent }
          : { min: 0, max, now: value }
      }
      className={`${heights[size]} ${className} overflow-hidden rounded-full bg-muted`}
    >
      <View
        className="h-full rounded-full bg-primary"
        style={{ width: `${percent}%` }}
      />
    </View>
  );
}
