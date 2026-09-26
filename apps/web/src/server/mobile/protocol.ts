import {
  CLIENT_HEADER,
  MIN_SYNC_PROTOCOL,
  parseClientHeader,
  UPGRADE_REQUIRED_MESSAGE,
} from "@hakgyo/shared/mobile-sync";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "~/server/api/trpc";

/**
 * Thrown (as the `cause` of a PRECONDITION_FAILED TRPCError) when a client
 * speaks a protocol older than `MIN_SYNC_PROTOCOL`. The error formatter in
 * `~/server/api/trpc` recognizes it by `name` and adds
 * `data.upgradeRequired: { minProtocol }` to the error shape.
 */
export class UpgradeRequiredError extends Error {
  readonly minProtocol: number;

  constructor(minProtocol: number) {
    super(UPGRADE_REQUIRED_MESSAGE);
    this.name = "UpgradeRequiredError";
    this.minProtocol = minProtocol;
  }
}

export function upgradeRequiredError() {
  return new TRPCError({
    code: "PRECONDITION_FAILED",
    message: UPGRADE_REQUIRED_MESSAGE,
    cause: new UpgradeRequiredError(MIN_SYNC_PROTOCOL),
  });
}

/**
 * Protocol announced by a request: the `protocol` field of the input when
 * present, otherwise the `x-hakgyo-client` header. `null` when neither is set.
 */
export function resolveClientProtocol(input: {
  rawInput: unknown;
  headers: Pick<Headers, "get"> | null | undefined;
}): number | null {
  const raw = input.rawInput;
  if (
    typeof raw === "object" &&
    raw !== null &&
    "protocol" in raw &&
    typeof raw.protocol === "number" &&
    Number.isFinite(raw.protocol)
  ) {
    return raw.protocol;
  }
  return parseClientHeader(input.headers?.get(CLIENT_HEADER)).protocol;
}

/** Throws UPGRADE_REQUIRED unless `protocol` is at least `MIN_SYNC_PROTOCOL`. */
export function assertSupportedProtocol(protocol: number | null | undefined) {
  if (
    protocol === null ||
    protocol === undefined ||
    protocol < MIN_SYNC_PROTOCOL
  ) {
    throw upgradeRequiredError();
  }
}

/**
 * `protectedProcedure` that also gates on the sync protocol. Every protocol 2
 * input carries `protocol: number`; the `x-hakgyo-client` header is the
 * fallback (and what the bundle route uses). Requests announcing nothing are
 * treated as too old.
 */
export const mobileProtocolProcedure = protectedProcedure.use(
  async ({ ctx, getRawInput, next }) => {
    assertSupportedProtocol(
      resolveClientProtocol({
        rawInput: await getRawInput(),
        headers: ctx.headers,
      }),
    );
    return next();
  },
);
