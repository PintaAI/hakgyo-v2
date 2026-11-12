import * as Haptics from "expo-haptics";

// Haptic feedback, fire and forget: a device without a haptic engine (or a
// build without the module) just stays silent. Keep it for moments the learner
// caused: a choice, a right or wrong answer, something finished.

const quiet = () => undefined;

/** A choice among options changed (a tile, a chip, a list row). */
export function hapticSelection() {
  Haptics.selectionAsync().catch(quiet);
}

/** Something finished well: a correct answer, a reminder set, a test passed. */
export function hapticSuccess() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    quiet,
  );
}

/** A wrong answer. */
export function hapticError() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
    quiet,
  );
}

/** A light tap, for a press that moves the learner on. */
export function hapticTap() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(quiet);
}
