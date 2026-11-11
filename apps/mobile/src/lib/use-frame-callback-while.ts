import { useCallback } from "react";
import {
  useAnimatedReaction,
  useFrameCallback,
  type FrameInfo,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

/**
 * `useFrameCallback` that only runs while `running` (a worklet) is true.
 *
 * A registered frame callback asks for a new frame every frame even when it
 * returns at once, so the UI thread never rests and a ProMotion display is
 * held at 120 Hz for as long as the component is mounted. Here the callback
 * is switched off until there is something to step, and off again after.
 * It starts a frame or two after `running` turns true.
 */
export function useFrameCallbackWhile(
  running: () => boolean,
  callback: (frame: FrameInfo) => void,
) {
  const frame = useFrameCallback(callback, false);
  const setActive = useCallback(
    (active: boolean) => frame.setActive(active),
    [frame],
  );
  useAnimatedReaction(
    running,
    (now, previous) => {
      if (now !== previous) scheduleOnRN(setActive, now);
    },
    [running, setActive],
  );
}
