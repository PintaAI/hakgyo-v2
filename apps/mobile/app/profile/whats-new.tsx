import * as Updates from "expo-updates";
import { Text } from "react-native";

import { EmptyState, StudyScreen } from "../../src/components/learning-ui";
import { ReleaseNoteList } from "../../src/components/release-notes";
import {
  APP_VERSION,
  installedReleaseNotes,
} from "../../src/lib/release-notes";

const installed = Updates.updateId
  ? `versi ${APP_VERSION} (pembaruan ${Updates.updateId.slice(0, 8)})`
  : `versi ${APP_VERSION}`;

/** Pengaturan → Yang baru: every release note this bundle ships. */
export default function WhatsNewScreen() {
  return (
    <StudyScreen title="Yang baru" headerShown>
      <Text className="text-sm leading-5 text-muted-foreground">
        Kamu memakai Hakgyo {installed}. Pembaruan kecil terpasang otomatis
        saat aplikasi dibuka ulang.
      </Text>
      {installedReleaseNotes.length ? (
        <ReleaseNoteList notes={installedReleaseNotes} />
      ) : (
        <EmptyState>Belum ada catatan pembaruan.</EmptyState>
      )}
    </StudyScreen>
  );
}
