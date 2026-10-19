import { CLIENT_HEADER, parseClientHeader } from "@hakgyo/shared/mobile-sync";
import { after } from "next/server";

import type { db } from "~/server/db";

type Db = Pick<typeof db, "$executeRaw">;

export type MobileClientVersion = {
  platform: "ios" | "android";
  protocol: number;
  runtime: string | null;
  updateId: string | null;
};

const PLATFORMS = new Set(["ios", "android"]);
/** Runtime versions and EAS Update ids are far shorter; the header is client input. */
const MAX_FIELD_LENGTH = 64;

function field(value: string | null) {
  return value ? value.slice(0, MAX_FIELD_LENGTH) : null;
}

/**
 * The mobile build announced by the `x-hakgyo-client` header, or null when the
 * request does not come from a native client (builds older than the
 * `platform` field, web, MCP).
 */
export function mobileClientVersionFromHeaders(
  headers: Pick<Headers, "get"> | null | undefined,
): MobileClientVersion | null {
  const client = parseClientHeader(headers?.get(CLIENT_HEADER));
  if (client.protocol === null || !client.platform) return null;
  if (!PLATFORMS.has(client.platform)) return null;
  return {
    platform: client.platform as MobileClientVersion["platform"],
    protocol: client.protocol,
    runtime: field(client.runtime),
    updateId: field(client.update),
  };
}

/**
 * Stores the user's newest build for the platform. The row is only written
 * when the build changed or `lastSeenAt` is over an hour old, so the manifest
 * poll rarely writes.
 */
export async function recordMobileClientVersion(
  db: Db,
  userId: string,
  client: MobileClientVersion,
) {
  await db.$executeRaw`
    INSERT INTO "mobileClientVersion"
      ("userId", "platform", "protocol", "runtime", "updateId", "lastSeenAt")
    VALUES
      (${userId}, ${client.platform}, ${client.protocol}, ${client.runtime},
       ${client.updateId}, CURRENT_TIMESTAMP)
    ON CONFLICT ("userId", "platform") DO UPDATE SET
      "protocol" = EXCLUDED."protocol",
      "runtime" = EXCLUDED."runtime",
      "updateId" = EXCLUDED."updateId",
      "lastSeenAt" = EXCLUDED."lastSeenAt"
    WHERE "mobileClientVersion"."protocol" IS DISTINCT FROM EXCLUDED."protocol"
       OR "mobileClientVersion"."runtime" IS DISTINCT FROM EXCLUDED."runtime"
       OR "mobileClientVersion"."updateId" IS DISTINCT FROM EXCLUDED."updateId"
       OR "mobileClientVersion"."lastSeenAt" < CURRENT_TIMESTAMP - INTERVAL '1 hour'
  `;
}

/**
 * Records the request's mobile build after the response when inside a
 * Next.js request, inline otherwise. Failures are logged, never thrown: the
 * record is diagnostics only.
 */
export async function recordMobileClientVersionInBackground(
  db: Db,
  userId: string,
  headers: Pick<Headers, "get"> | null | undefined,
) {
  const client = mobileClientVersionFromHeaders(headers);
  if (!client) return;
  const run = () =>
    recordMobileClientVersion(db, userId, client).catch((error: unknown) => {
      console.error("Failed to record the mobile client version", error);
    });
  try {
    after(run);
  } catch {
    await run();
  }
}
