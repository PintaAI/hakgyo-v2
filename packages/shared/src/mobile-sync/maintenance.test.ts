import { describe, expect, test } from "bun:test";

import { shouldRetryQuery } from "../query-retry";
import {
  formatMaintenanceTime,
  isMaintenanceState,
  maintenanceFromError,
  maintenanceMessage,
  type MaintenanceState,
} from "./maintenance";

const readOnly: MaintenanceState = {
  mode: "read_only",
  message: null,
  startsAt: null,
  until: "2026-10-20T18:00:00.000Z",
};

describe("formatMaintenanceTime", () => {
  test("renders Western Indonesia Time regardless of the runtime zone", () => {
    // 18:00 UTC is 01:00 the next day in WIB.
    expect(formatMaintenanceTime("2026-10-20T18:00:00.000Z")).toBe(
      "Rabu, 21 Oktober, 01.00 WIB",
    );
    expect(formatMaintenanceTime("2026-10-20T22:00:00+07:00")).toBe(
      "Selasa, 20 Oktober, 22.00 WIB",
    );
    expect(formatMaintenanceTime("not a date")).toBeNull();
  });
});

describe("maintenanceMessage", () => {
  test("uses the default description per mode and appends the schedule", () => {
    expect(maintenanceMessage(readOnly)).toBe(
      "Hakgyo sedang dalam pemeliharaan, jadi perubahan untuk sementara belum bisa disimpan. Perkiraan selesai Rabu, 21 Oktober, 01.00 WIB.",
    );
    expect(
      maintenanceMessage({
        mode: "scheduled",
        message: "Pembaruan server.",
        startsAt: "2026-10-20T15:00:00.000Z",
        until: null,
      }),
    ).toBe("Pembaruan server. Mulai Selasa, 20 Oktober, 22.00 WIB.");
    expect(
      maintenanceMessage({
        mode: "full",
        message: null,
        // Only `scheduled` announces the start.
        startsAt: "2026-10-20T15:00:00.000Z",
        until: null,
      }),
    ).toBe(
      "Hakgyo sedang dalam pemeliharaan dan untuk sementara tidak dapat diakses.",
    );
  });
});

describe("maintenanceFromError", () => {
  test("reads tRPC error data and 503 route bodies", () => {
    expect(
      maintenanceFromError({
        message: "…",
        data: { code: "SERVICE_UNAVAILABLE", maintenance: readOnly },
      }),
    ).toEqual(readOnly);
    expect(
      maintenanceFromError({ code: "MAINTENANCE", maintenance: readOnly }),
    ).toEqual(readOnly);
    expect(
      maintenanceFromError({ data: { code: "SERVICE_UNAVAILABLE" } }),
    ).toBeNull();
    expect(
      maintenanceFromError({ data: { maintenance: { mode: "off" } } }),
    ).toBeNull();
    expect(maintenanceFromError(null)).toBeNull();
    expect(isMaintenanceState({ ...readOnly, until: 1 })).toBe(false);
  });

  test("queries do not retry maintenance errors", () => {
    expect(
      shouldRetryQuery(0, {
        data: { code: "SERVICE_UNAVAILABLE", maintenance: readOnly },
      }),
    ).toBe(false);
    expect(shouldRetryQuery(0, { data: { code: "SERVICE_UNAVAILABLE" } })).toBe(
      true,
    );
  });
});
