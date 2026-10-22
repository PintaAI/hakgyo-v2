import { useEffect, useState } from "react";
import { Modal, Platform } from "react-native";

import {
  markReleaseNotesSeen,
  unseenReleaseNotes,
} from "../lib/release-notes";
import { useAppTheme } from "../providers/AppThemeProvider";
import { ReleaseNotesPanel } from "./release-notes";
import { Action } from "./ui/action";

/**
 * Shows "Yang baru" once after an update (EAS Update or store build) brings
 * release notes the learner has not seen. Pengaturan → Yang baru keeps the
 * full history.
 */
export function WhatsNewPrompt() {
  const { colors } = useAppTheme();
  const [notes] = useState(unseenReleaseNotes);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notes.length === 0) return;
    // Let the first screen settle before presenting over it. Remember the
    // notes as soon as they show, so a crash or a killed app cannot loop.
    const timer = setTimeout(() => {
      markReleaseNotesSeen();
      setVisible(true);
    }, 800);
    return () => clearTimeout(timer);
  }, [notes]);

  const close = () => setVisible(false);

  return (
    <Modal
      animationType="slide"
      backdropColor={colors.background}
      onRequestClose={close}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <ReleaseNotesPanel
        symbol="sparkles"
        title="Yang baru di Hakgyo"
        description="Aplikasimu sudah diperbarui. Ini perubahannya."
        notes={notes}
        // Android has no page sheet; the modal is full screen there.
        insetTop={Platform.OS !== "ios"}
        actions={<Action onPress={close}>Lanjut belajar</Action>}
      />
    </Modal>
  );
}
