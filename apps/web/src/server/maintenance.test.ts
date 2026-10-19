import { afterEach, describe, expect, test } from "bun:test";
import {
  MAINTENANCE_ERROR_CODE,
  type MaintenanceState,
} from "@hakgyo/shared/mobile-sync";
import { TRPCError } from "@trpc/server";

import { env } from "~/env";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { TERMINAL_FAILURE_CODES } from "~/server/mobile/apply-operations";
import { createRequestCache } from "~/server/request-cache";
import { isMaintenanceExemptPath } from "~/lib/maintenance-paths";

import {
  isBlockedByMaintenance,
  maintenanceError,
  MaintenanceError,
  maintenanceResponse,
  parseMaintenanceConfig,
  procedureAccess,
  retryAfterSeconds,
  skipCronDuringMaintenance,
} from "./maintenance";

const readOnly: MaintenanceState = {
  mode: "read_only",
  message: null,
  startsAt: null,
  until: "2026-10-20T18:00:00.000Z",
};

describe("parseMaintenanceConfig", () => {
  test("is off unless the mode names a maintenance mode", () => {
    expect(parseMaintenanceConfig({})).toBeNull();
    expect(parseMaintenanceConfig({ MAINTENANCE_MODE: "off" })).toBeNull();
    expect(parseMaintenanceConfig({ MAINTENANCE_MODE: "maybe" })).toBeNull();
  });

  test("normalizes the message and timestamps", () => {
    expect(
      parseMaintenanceConfig({
        MAINTENANCE_MODE: " Read_Only ",
        MAINTENANCE_MESSAGE: "  Migrasi database.  ",
        MAINTENANCE_STARTS_AT: "2026-10-20T22:00:00+07:00",
        MAINTENANCE_UNTIL: "not a date",
      }),
    ).toEqual({
      mode: "read_only",
      message: "Migrasi database.",
      startsAt: "2026-10-20T15:00:00.000Z",
      until: null,
    });
    expect(
      parseMaintenanceConfig({
        MAINTENANCE_MODE: "full",
        MAINTENANCE_MESSAGE: " ",
      }),
    ).toEqual({ mode: "full", message: null, startsAt: null, until: null });
  });
});

describe("isBlockedByMaintenance", () => {
  const modes = [null, "scheduled", "read_only", "full"] as const;
  const types = ["query", "mutation", "subscription"] as const;
  const expected: Record<string, boolean> = {
    "null:query": false,
    "null:mutation": false,
    "null:subscription": false,
    "scheduled:query": false,
    "scheduled:mutation": false,
    "scheduled:subscription": false,
    "read_only:query": false,
    "read_only:mutation": true,
    "read_only:subscription": false,
    "full:query": true,
    "full:mutation": true,
    "full:subscription": true,
  };

  test("blocks writes in read_only and everything in full", () => {
    for (const mode of modes) {
      for (const type of types) {
        expect(isBlockedByMaintenance(mode, procedureAccess(type))).toBe(
          expected[`${mode}:${type}`]!,
        );
      }
    }
  });

  test("never blocks superadmins", () => {
    for (const mode of modes) {
      for (const type of types) {
        expect(
          isBlockedByMaintenance(mode, procedureAccess(type), {
            superadmin: true,
          }),
        ).toBe(false);
      }
    }
  });
});

describe("maintenance errors", () => {
  test("use a transient code the sync engine never dead-letters", () => {
    const error = maintenanceError(readOnly);
    expect(error.code).toBe("SERVICE_UNAVAILABLE");
    expect(error.code).toBe(MAINTENANCE_ERROR_CODE);
    // Terminal codes eventually move queued learner work to the dead-letter
    // list; maintenance must never use one of them.
    expect(TERMINAL_FAILURE_CODES.has(error.code)).toBe(false);
    for (const code of [
      "BAD_REQUEST",
      "FORBIDDEN",
      "NOT_FOUND",
      "CONFLICT",
      "PRECONDITION_FAILED",
    ]) {
      expect(error.code).not.toBe(code);
    }
  });

  test("carry the Indonesian message and the state as data.maintenance", () => {
    const error = maintenanceError(readOnly);
    expect(error.message).toContain("Hakgyo sedang dalam pemeliharaan");
    expect(error.message).toContain(
      "Perkiraan selesai Rabu, 21 Oktober, 01.00 WIB.",
    );
    expect(error.cause).toBeInstanceOf(MaintenanceError);

    const format = (trpcError: TRPCError) =>
      createTRPCRouter({})._def._config.errorFormatter({
        error: trpcError,
        type: "mutation",
        path: "mobileSyncV2.commit",
        input: undefined,
        ctx: undefined,
        shape: {
          message: trpcError.message,
          code: -32603,
          data: {
            code: trpcError.code,
            httpStatus: 503,
            path: "mobileSyncV2.commit",
          },
        },
      });
    expect(format(error).data.maintenance).toEqual(readOnly);
    expect(format(error).data.upgradeRequired).toBeNull();
    expect(
      format(new TRPCError({ code: "SERVICE_UNAVAILABLE" })).data.maintenance,
    ).toBeNull();
  });

  test("route responses are 503 with Retry-After when the end is known", async () => {
    const now = Date.parse("2026-10-20T17:00:00.000Z");
    expect(retryAfterSeconds(readOnly, now)).toBe(3600);
    expect(retryAfterSeconds(readOnly, Date.parse(readOnly.until!))).toBeNull();
    expect(retryAfterSeconds({ ...readOnly, until: null }, now)).toBeNull();

    const response = maintenanceResponse(readOnly, now);
    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("3600");
    expect(await response.json()).toEqual({
      code: "MAINTENANCE",
      message: maintenanceError(readOnly).message,
      maintenance: readOnly,
    });
    expect(
      maintenanceResponse({ ...readOnly, until: null }).headers.get(
        "retry-after",
      ),
    ).toBeNull();
  });
});

describe("maintenance middleware", () => {
  // Tests run with SKIP_ENV_VALIDATION, where `env` is a plain object.
  const mutableEnv = env as unknown as Record<string, string | undefined>;
  const original = {
    MAINTENANCE_MODE: mutableEnv.MAINTENANCE_MODE,
    SUPERADMIN_EMAILS: mutableEnv.SUPERADMIN_EMAILS,
  };
  afterEach(() => Object.assign(mutableEnv, original));

  const router = createTRPCRouter({
    read: publicProcedure.query(() => "read"),
    write: publicProcedure.mutation(() => "written"),
    protectedWrite: protectedProcedure.mutation(() => "written"),
  });

  function caller(email: string | null) {
    return router.createCaller({
      db: {} as never,
      headers: new Headers(),
      actorKind: "session",
      actorUserId: email ? "user-1" : null,
      session: email
        ? ({ user: { id: "user-1", email }, session: {} } as never)
        : null,
      requestCache: createRequestCache(),
    });
  }

  async function code(work: Promise<unknown>) {
    try {
      await work;
      return "OK";
    } catch (error) {
      return error instanceof TRPCError ? error.code : "UNKNOWN";
    }
  }

  test("read_only rejects mutations only, full rejects everything", async () => {
    mutableEnv.SUPERADMIN_EMAILS = "admin@example.com";

    mutableEnv.MAINTENANCE_MODE = "scheduled";
    expect(await code(caller(null).write())).toBe("OK");

    mutableEnv.MAINTENANCE_MODE = "read_only";
    expect(await code(caller(null).read())).toBe("OK");
    expect(await code(caller(null).write())).toBe("SERVICE_UNAVAILABLE");
    // Maintenance answers before authentication does.
    expect(await code(caller(null).protectedWrite())).toBe(
      "SERVICE_UNAVAILABLE",
    );
    expect(await code(caller("admin@example.com").protectedWrite())).toBe("OK");

    mutableEnv.MAINTENANCE_MODE = "full";
    expect(await code(caller("learner@example.com").read())).toBe(
      "SERVICE_UNAVAILABLE",
    );
    expect(await code(caller("admin@example.com").read())).toBe("OK");
  });

  test("crons skip with a 200 while writes are blocked", async () => {
    mutableEnv.MAINTENANCE_MODE = "scheduled";
    expect(await skipCronDuringMaintenance()).toBeNull();
    mutableEnv.MAINTENANCE_MODE = "read_only";
    const skipped = await skipCronDuringMaintenance();
    expect(skipped?.status).toBe(200);
    expect(await skipped?.json()).toEqual({
      skipped: "maintenance",
      mode: "read_only",
    });
  });
});

describe("isMaintenanceExemptPath", () => {
  test("keeps sign-in and the superadmin area reachable in full", () => {
    expect(isMaintenanceExemptPath("/auth")).toBe(true);
    expect(isMaintenanceExemptPath("/auth/continue")).toBe(true);
    expect(isMaintenanceExemptPath("/superadmin/media")).toBe(true);
    expect(isMaintenanceExemptPath("/authors")).toBe(false);
    expect(isMaintenanceExemptPath("/learn")).toBe(false);
    expect(isMaintenanceExemptPath(null)).toBe(false);
  });
});
