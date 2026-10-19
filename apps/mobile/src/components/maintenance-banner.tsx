import {
  maintenanceMessage,
  maintenanceSchedule,
  type MaintenanceState,
} from "@hakgyo/shared/mobile-sync";
import { Text } from "react-native";

import { useMobileSync } from "../providers/MobileSyncProvider";
import { Callout } from "./ui/callout";

const KEEP_STUDYING =
  "Kamu tetap bisa belajar seperti biasa. Progres tersimpan di perangkat ini dan disinkronkan setelah pemeliharaan selesai.";

/** Indonesian notice text; times are in WIB (see `maintenanceSchedule`). */
export function maintenanceBannerText(state: MaintenanceState) {
  if (state.mode === "scheduled") {
    return {
      title: "Pemeliharaan terjadwal",
      body: `${maintenanceMessage(state)} Selama pemeliharaan kamu tetap bisa belajar, dan progresnya disinkronkan setelah selesai.`,
    };
  }
  return {
    title: "Sedang pemeliharaan",
    body: [state.message, KEEP_STUDYING, maintenanceSchedule(state)]
      .filter(Boolean)
      .join(" "),
  };
}

/**
 * Non-blocking notice on the tab screens while the server announces or runs
 * maintenance. Studying works as if offline; nothing here stops the learner.
 */
export function MaintenanceBanner() {
  const { maintenance } = useMobileSync();
  if (!maintenance) return null;
  const { title, body } = maintenanceBannerText(maintenance);
  return (
    <Callout>
      <Text className="font-bold">{title}. </Text>
      {body}
    </Callout>
  );
}
