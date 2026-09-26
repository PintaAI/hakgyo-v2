import { describe, expect, test } from "bun:test";
import {
  CLIENT_HEADER,
  MIN_SYNC_PROTOCOL,
  UPGRADE_REQUIRED_MESSAGE,
} from "@hakgyo/shared/mobile-sync";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter } from "~/server/api/trpc";

import {
  assertSupportedProtocol,
  resolveClientProtocol,
  UpgradeRequiredError,
  upgradeRequiredError,
} from "./protocol";

describe("resolveClientProtocol", () => {
  test("prefers the input, then the client header", () => {
    const headers = new Headers({ [CLIENT_HEADER]: "protocol=7;runtime=ios" });
    expect(resolveClientProtocol({ rawInput: { protocol: 3 }, headers })).toBe(
      3,
    );
    expect(resolveClientProtocol({ rawInput: {}, headers })).toBe(7);
    expect(
      resolveClientProtocol({ rawInput: { protocol: "3" }, headers }),
    ).toBe(7);
    expect(resolveClientProtocol({ rawInput: undefined, headers: null })).toBe(
      null,
    );
  });
});

describe("assertSupportedProtocol", () => {
  test("rejects old or missing protocols with an upgrade cause", () => {
    for (const protocol of [null, undefined, MIN_SYNC_PROTOCOL - 1]) {
      let error: unknown;
      try {
        assertSupportedProtocol(protocol);
      } catch (cause) {
        error = cause;
      }
      expect(error).toBeInstanceOf(TRPCError);
      const trpcError = error as TRPCError;
      expect(trpcError.code).toBe("PRECONDITION_FAILED");
      expect(trpcError.message).toBe(UPGRADE_REQUIRED_MESSAGE);
      expect(trpcError.cause).toBeInstanceOf(UpgradeRequiredError);
      expect((trpcError.cause as UpgradeRequiredError).minProtocol).toBe(
        MIN_SYNC_PROTOCOL,
      );
    }
    expect(() => assertSupportedProtocol(MIN_SYNC_PROTOCOL)).not.toThrow();
    expect(() => assertSupportedProtocol(MIN_SYNC_PROTOCOL + 1)).not.toThrow();
  });
});

describe("errorFormatter", () => {
  test("adds upgradeRequired for upgrade errors only", () => {
    const format = (error: TRPCError) =>
      createTRPCRouter({})._def._config.errorFormatter({
        error,
        type: "query",
        path: "mobileSyncV2.getManifest",
        input: undefined,
        ctx: undefined,
        shape: {
          message: error.message,
          code: -32000 as never,
          data: {
            code: error.code,
            httpStatus: 412,
            path: "mobileSyncV2.getManifest",
          },
        },
      });
    expect(format(upgradeRequiredError()).data.upgradeRequired).toEqual({
      minProtocol: MIN_SYNC_PROTOCOL,
    });
    expect(
      format(new TRPCError({ code: "PRECONDITION_FAILED" })).data
        .upgradeRequired,
    ).toBeNull();
  });
});
