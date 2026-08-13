import "server-only";

import { randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";

import { env } from "~/env";
import { db } from "~/server/db";
import {
  decryptZoomTokenValue,
  encryptZoomTokenValue,
} from "~/server/integrations/zoom-token";

const apiBaseUrl = "https://api.zoom.us/v2";
const oauthBaseUrl = "https://zoom.us/oauth";
const zoomRedirectUri = `${env.APP_URL}/api/integrations/zoom/callback`;
const requestTimeoutMs = 10_000;

type ZoomTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
};

type ZoomUser = { id: string; account_id: string };

type ZoomMeeting = {
  id: number;
  uuid: string;
  join_url: string;
};

class ZoomRequestError extends Error {
  constructor(readonly status: number) {
    super(`Zoom request failed with status ${status}`);
  }
}

export type ZoomMeetingInput = {
  title: string;
  agenda?: string | null;
  startsAt: Date;
  durationMinutes: number;
  timezone: string;
};

export function encryptZoomToken(value: string) {
  return encryptZoomTokenValue(value, env.ZOOM_TOKEN_ENCRYPTION_KEY);
}

function decryptZoomToken(value: string) {
  return decryptZoomTokenValue(value, env.ZOOM_TOKEN_ENCRYPTION_KEY);
}

function basicAuthorization() {
  return `Basic ${Buffer.from(`${env.ZOOM_CLIENT_ID}:${env.ZOOM_CLIENT_SECRET}`).toString("base64")}`;
}

async function zoomFetch<T>(url: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(requestTimeoutMs),
    });
  } catch (error) {
    console.error("Zoom request could not be completed", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Zoom is temporarily unavailable",
    });
  }
  if (!response.ok) {
    console.error("Zoom rejected a request", { status: response.status });
    throw new ZoomRequestError(response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function requestToken(body: URLSearchParams) {
  return zoomFetch<ZoomTokenResponse>(`${oauthBaseUrl}/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthorization(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
}

export function getZoomAuthorizationUrl(state: string) {
  const url = new URL(`${oauthBaseUrl}/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", env.ZOOM_CLIENT_ID);
  url.searchParams.set("redirect_uri", zoomRedirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeZoomCode(code: string) {
  const tokens = await requestToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: zoomRedirectUri,
    }),
  );
  const user = await zoomFetch<ZoomUser>(`${apiBaseUrl}/users/me`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  return { tokens, user };
}

async function getAccessToken(organizationId: string) {
  const connection = await db.zoomConnection.findUnique({
    where: { organizationId },
  });
  if (connection?.status !== "CONNECTED") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Connect the organization to Zoom first",
    });
  }
  if (connection.accessTokenExpiresAt.getTime() > Date.now() + 5 * 60_000) {
    return decryptZoomToken(connection.encryptedAccessToken);
  }

  try {
    return await db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${organizationId}))`;
        const current = await tx.zoomConnection.findUnique({
          where: { organizationId },
        });
        if (current?.status !== "CONNECTED") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Reconnect the organization to Zoom",
          });
        }
        if (current.accessTokenExpiresAt.getTime() > Date.now() + 5 * 60_000) {
          return decryptZoomToken(current.encryptedAccessToken);
        }

        const tokens = await requestToken(
          new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: decryptZoomToken(current.encryptedRefreshToken),
          }),
        );
        await tx.zoomConnection.update({
          where: { id: current.id },
          data: {
            encryptedAccessToken: encryptZoomToken(tokens.access_token),
            encryptedRefreshToken: encryptZoomToken(tokens.refresh_token),
            accessTokenExpiresAt: new Date(
              Date.now() + tokens.expires_in * 1000,
            ),
            scope: tokens.scope,
          },
        });
        return tokens.access_token;
      },
      { timeout: 15_000 },
    );
  } catch (error) {
    if (
      error instanceof ZoomRequestError &&
      [400, 401].includes(error.status)
    ) {
      await db.zoomConnection.updateMany({
        where: { id: connection.id, status: "CONNECTED" },
        data: { status: "EXPIRED" },
      });
    }
    throw error;
  }
}

async function zoomApi<T>(
  organizationId: string,
  path: string,
  init: RequestInit,
) {
  try {
    const accessToken = await getAccessToken(organizationId);
    return await zoomFetch<T>(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch (error) {
    if (!(error instanceof ZoomRequestError)) throw error;
    throw new TRPCError({
      code: error.status === 429 ? "TOO_MANY_REQUESTS" : "BAD_REQUEST",
      message:
        error.status === 429
          ? "Zoom rate limit reached; try again shortly"
          : "Zoom rejected the request",
    });
  }
}

function meetingBody(input: ZoomMeetingInput) {
  return {
    topic: input.title,
    agenda: input.agenda ?? "",
    type: 2,
    start_time: input.startsAt.toISOString(),
    duration: input.durationMinutes,
    timezone: input.timezone,
    settings: { join_before_host: false, waiting_room: true },
  };
}

export function createZoomMeeting(
  organizationId: string,
  input: ZoomMeetingInput,
) {
  return zoomApi<ZoomMeeting>(organizationId, "/users/me/meetings", {
    method: "POST",
    body: JSON.stringify(meetingBody(input)),
  });
}

export function updateZoomMeeting(
  organizationId: string,
  meetingId: string,
  input: ZoomMeetingInput,
) {
  return zoomApi<void>(organizationId, `/meetings/${meetingId}`, {
    method: "PATCH",
    body: JSON.stringify(meetingBody(input)),
  });
}

export function deleteZoomMeeting(organizationId: string, meetingId: string) {
  return zoomApi<void>(organizationId, `/meetings/${meetingId}`, {
    method: "DELETE",
  });
}

export async function revokeZoomConnection(organizationId: string) {
  const connection = await db.zoomConnection.findUnique({
    where: { organizationId },
  });
  if (!connection) throw new TRPCError({ code: "NOT_FOUND" });
  try {
    await zoomFetch(`${oauthBaseUrl}/revoke`, {
      method: "POST",
      headers: {
        Authorization: basicAuthorization(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        token: decryptZoomToken(connection.encryptedAccessToken),
      }),
    });
  } catch (error) {
    console.error("Zoom token could not be revoked remotely", error);
  } finally {
    await db.zoomConnection.update({
      where: { id: connection.id },
      data: {
        status: "REVOKED",
        encryptedAccessToken: encryptZoomToken(
          randomBytes(32).toString("base64url"),
        ),
        encryptedRefreshToken: encryptZoomToken(
          randomBytes(32).toString("base64url"),
        ),
        accessTokenExpiresAt: new Date(),
      },
    });
  }
}
