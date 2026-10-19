import {
  MAINTENANCE_ERROR_CODE,
  MAINTENANCE_MODES,
  MAINTENANCE_RESPONSE_CODE,
  maintenanceMessage,
  type MaintenanceMode,
  type MaintenanceState,
} from "@hakgyo/shared/mobile-sync";
import { TRPCError } from "@trpc/server";

import { env } from "~/env";

/**
 * Maintenance mode (docs/maintenance.md). Every reader goes through
 * `getMaintenanceState()`, so the source (environment variables today, Vercel
 * Global Config later) can change without touching callers. The flag is never
 * stored in Postgres: the database may be what is under maintenance.
 */

export type MaintenanceConfig = {
  MAINTENANCE_MODE?: string;
  MAINTENANCE_MESSAGE?: string;
  MAINTENANCE_STARTS_AT?: string;
  MAINTENANCE_UNTIL?: string;
};

function isoOrNull(value: string | undefined) {
  if (!value?.trim()) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

/**
 * Null when maintenance is off. `src/env.js` validates the variables; this
 * stays lenient for builds that skip validation: an unknown mode reads as off
 * and an unparsable timestamp as unknown.
 */
export function parseMaintenanceConfig(
  config: MaintenanceConfig,
): MaintenanceState | null {
  const mode = config.MAINTENANCE_MODE?.trim().toLowerCase();
  if (!MAINTENANCE_MODES.includes(mode as MaintenanceMode)) return null;
  // An empty (or blank) message falls back to the default text.
  const message = config.MAINTENANCE_MESSAGE?.trim();
  return {
    mode: mode as MaintenanceMode,
    message: message === undefined || message === "" ? null : message,
    startsAt: isoOrNull(config.MAINTENANCE_STARTS_AT),
    until: isoOrNull(config.MAINTENANCE_UNTIL),
  };
}

/** The current maintenance state, or null when maintenance is off. */
export async function getMaintenanceState(): Promise<MaintenanceState | null> {
  return parseMaintenanceConfig(env);
}

/** Reads are blocked only in `full`; writes in `read_only` and `full`. */
export type MaintenanceAccess = "read" | "write";

export function procedureAccess(
  type: "query" | "mutation" | "subscription",
): MaintenanceAccess {
  return type === "mutation" ? "write" : "read";
}

/**
 * Whether maintenance rejects a request. `scheduled` only announces; superadmins
 * bypass `read_only` and `full` so they can verify the system during a window.
 */
export function isBlockedByMaintenance(
  mode: MaintenanceMode | null | undefined,
  access: MaintenanceAccess,
  options: { superadmin?: boolean } = {},
) {
  if (!mode || mode === "scheduled" || options.superadmin) return false;
  return mode === "full" || access === "write";
}

/**
 * Thrown (as the `cause` of a SERVICE_UNAVAILABLE TRPCError) while maintenance
 * blocks a procedure. The error formatter in `~/server/api/trpc` recognizes it
 * by `name` and adds `data.maintenance` to the error shape.
 */
export class MaintenanceError extends Error {
  readonly state: MaintenanceState;

  constructor(state: MaintenanceState) {
    super(maintenanceMessage(state));
    this.name = "MaintenanceError";
    this.state = state;
  }
}

/**
 * SERVICE_UNAVAILABLE is transient for the mobile sync engine. Terminal codes
 * (BAD_REQUEST, FORBIDDEN, NOT_FOUND, CONFLICT, PRECONDITION_FAILED) would
 * eventually dead-letter queued learner work.
 */
export function maintenanceError(state: MaintenanceState) {
  return new TRPCError({
    code: MAINTENANCE_ERROR_CODE,
    message: maintenanceMessage(state),
    cause: new MaintenanceError(state),
  });
}

/** For code outside tRPC procedures (MCP tools calling services directly). */
export async function assertMaintenanceAllows(access: MaintenanceAccess) {
  const state = await getMaintenanceState();
  if (state && isBlockedByMaintenance(state.mode, access)) {
    throw maintenanceError(state);
  }
}

/** Seconds until the announced end, or null when unknown or already past. */
export function retryAfterSeconds(state: MaintenanceState, now = Date.now()) {
  if (!state.until) return null;
  const seconds = Math.ceil((Date.parse(state.until) - now) / 1000);
  return seconds > 0 ? seconds : null;
}

export type MaintenanceResponseBody = {
  code: typeof MAINTENANCE_RESPONSE_CODE;
  message: string;
  maintenance: MaintenanceState;
};

/** 503 for route handlers, with `Retry-After` when the end is known. */
export function maintenanceResponse(state: MaintenanceState, now = Date.now()) {
  const body: MaintenanceResponseBody = {
    code: MAINTENANCE_RESPONSE_CODE,
    message: maintenanceMessage(state),
    maintenance: state,
  };
  const retryAfter = retryAfterSeconds(state, now);
  return Response.json(body, {
    status: 503,
    headers: {
      "Cache-Control": "no-store",
      ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}),
    },
  });
}

/** The 503 response when maintenance blocks this kind of request, else null. */
export async function blockDuringMaintenance(access: MaintenanceAccess) {
  const state = await getMaintenanceState();
  return state && isBlockedByMaintenance(state.mode, access)
    ? maintenanceResponse(state)
    : null;
}

/**
 * Wraps a route handler: answers 503 while maintenance blocks `access`
 * requests, otherwise runs the handler.
 */
export function guardRoute<Args extends unknown[]>(
  access: MaintenanceAccess,
  handler: (...args: Args) => Response | Promise<Response>,
) {
  return async (...args: Args) =>
    (await blockDuringMaintenance(access)) ?? handler(...args);
}

/**
 * Cron routes write, so they skip while writes are blocked. The 200 keeps the
 * scheduled GitHub workflows (`curl --fail-with-body`) from failing every run.
 */
export async function skipCronDuringMaintenance() {
  const state = await getMaintenanceState();
  return state && isBlockedByMaintenance(state.mode, "write")
    ? Response.json({ skipped: "maintenance", mode: state.mode })
    : null;
}

/** True while maintenance rejects writes (for best-effort writes such as counters). */
export async function writesBlockedByMaintenance() {
  const state = await getMaintenanceState();
  return isBlockedByMaintenance(state?.mode, "write");
}
