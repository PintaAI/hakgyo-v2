import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

import { useTourTarget } from "./tour-provider";
import type { TourTargetId } from "./tours";

/** Wraps `children` in a view a tour can measure and light up. */
export function TourTarget({
  id,
  enabled = true,
  onDemoPress,
  children,
  ...props
}: ViewProps & {
  id: TourTargetId;
  /** Off for copies a tour must not point at (pages out of view). */
  enabled?: boolean;
  /** What a scripted demo's tap on this target does (`src/demo`). */
  onDemoPress?: () => void;
  children: ReactNode;
}) {
  const ref = useTourTarget(id, enabled, onDemoPress);
  return (
    <View ref={ref} collapsable={false} {...props}>
      {children}
    </View>
  );
}
