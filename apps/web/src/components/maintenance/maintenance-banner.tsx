import {
  maintenanceMessage,
  type MaintenanceState,
} from "@hakgyo/shared/mobile-sync";
import { WrenchIcon } from "lucide-react";

const titles: Record<MaintenanceState["mode"], string> = {
  scheduled: "Pemeliharaan terjadwal.",
  read_only: "Sedang pemeliharaan.",
  full: "Sedang pemeliharaan.",
};

/**
 * Slim notice above every page while maintenance is announced or active.
 * Rendered on the server from `getMaintenanceState()`, so it costs no extra
 * request; times are formatted in WIB (`maintenanceMessage`), never in the
 * server's zone.
 */
export function MaintenanceBanner({ state }: { state: MaintenanceState }) {
  return (
    <div
      role="status"
      className="flex items-start gap-2 border-b bg-amber-50 px-4 py-2.5 text-sm text-amber-950 sm:items-center sm:justify-center sm:px-6 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <WrenchIcon
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 sm:mt-0"
      />
      <p className="min-w-0 text-pretty">
        <span className="font-semibold">{titles[state.mode]}</span>{" "}
        {maintenanceMessage(state)}
      </p>
    </div>
  );
}
