/**
 * Server maintenance mode, shared by the web server (which reports it) and
 * the clients (which recognize it). See `docs/maintenance.md`.
 *
 * - `scheduled`: an announcement only; nothing is blocked.
 * - `read_only`: reads work, writes are rejected.
 * - `full`: every request is rejected.
 */
export const MAINTENANCE_MODES = ["scheduled", "read_only", "full"] as const;

export type MaintenanceMode = (typeof MAINTENANCE_MODES)[number];

export type MaintenanceState = {
  mode: MaintenanceMode;
  /** Operator text (Indonesian) replacing the default description. */
  message: string | null;
  /** ISO datetime the maintenance starts (announced by `scheduled`). */
  startsAt: string | null;
  /** ISO datetime the maintenance is expected to end. */
  until: string | null;
};

/**
 * tRPC code of maintenance errors (HTTP 503). It must stay transient: the sync
 * engine retries it forever and never dead-letters queued work because of it.
 * Never use BAD_REQUEST, FORBIDDEN, NOT_FOUND, CONFLICT or PRECONDITION_FAILED
 * for maintenance.
 */
export const MAINTENANCE_ERROR_CODE = "SERVICE_UNAVAILABLE";

/** `code` of the JSON body non-tRPC routes answer with during maintenance (503). */
export const MAINTENANCE_RESPONSE_CODE = "MAINTENANCE";

/** Maintenance windows are announced in Western Indonesia Time (UTC+7, no DST). */
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const WEEKDAYS = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];
const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/**
 * "Senin, 20 Oktober, 22.00 WIB". Computed by hand rather than with `Intl` so
 * every runtime (Node on Vercel in UTC, Hermes) renders the same text.
 */
export function formatMaintenanceTime(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return null;
  const wib = new Date(time + WIB_OFFSET_MS);
  const hours = String(wib.getUTCHours()).padStart(2, "0");
  const minutes = String(wib.getUTCMinutes()).padStart(2, "0");
  return `${WEEKDAYS[wib.getUTCDay()]}, ${wib.getUTCDate()} ${MONTHS[wib.getUTCMonth()]}, ${hours}.${minutes} WIB`;
}

const DEFAULT_DESCRIPTIONS: Record<MaintenanceMode, string> = {
  scheduled: "Hakgyo akan menjalani pemeliharaan terjadwal.",
  read_only:
    "Hakgyo sedang dalam pemeliharaan, jadi perubahan untuk sementara belum bisa disimpan.",
  full: "Hakgyo sedang dalam pemeliharaan dan untuk sementara tidak dapat diakses.",
};

/** "Mulai …. Perkiraan selesai …." from the known timestamps, or "". */
export function maintenanceSchedule(state: MaintenanceState) {
  const startsAt =
    state.mode === "scheduled" && state.startsAt
      ? formatMaintenanceTime(state.startsAt)
      : null;
  const until = state.until ? formatMaintenanceTime(state.until) : null;
  return [
    startsAt ? `Mulai ${startsAt}.` : null,
    until ? `Perkiraan selesai ${until}.` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

/** The operator's text (or the default for the mode) followed by the schedule. */
export function maintenanceMessage(state: MaintenanceState) {
  return [
    state.message ?? DEFAULT_DESCRIPTIONS[state.mode],
    maintenanceSchedule(state),
  ]
    .filter(Boolean)
    .join(" ");
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export function isMaintenanceState(value: unknown): value is MaintenanceState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    MAINTENANCE_MODES.includes(candidate.mode as MaintenanceMode) &&
    isNullableString(candidate.message) &&
    isNullableString(candidate.startsAt) &&
    isNullableString(candidate.until)
  );
}

/**
 * The maintenance state carried by a tRPC error (`data.maintenance`) or by the
 * parsed JSON body of a 503 route response (`maintenance`), else null.
 */
export function maintenanceFromError(error: unknown): MaintenanceState | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as {
    data?: { maintenance?: unknown } | null;
    maintenance?: unknown;
  };
  const value = candidate.data?.maintenance ?? candidate.maintenance;
  return isMaintenanceState(value) ? value : null;
}
