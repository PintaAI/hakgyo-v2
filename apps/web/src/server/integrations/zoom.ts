import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";

import { env } from "~/env";
import { db } from "~/server/db";

const apiBaseUrl = "https://api.zoom.us/v2";
const oauthBaseUrl = "https://zoom.us/oauth";

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

export type ZoomMeetingInput = {
  title: string;
  agenda?: string | null;
  startsAt: Date;
  durationMinutes: number;
  timezone: string;
};

function encryptionKey() {
  const key = Buffer.from(env.ZOOM_TOKEN_ENCRYPTION_KEY, "base64");
  if (key.length !== 32) {
    throw new Error("ZOOM_TOKEN_ENCRYPTION_KEY must decode to 32 bytes");
  }
  return key;
}

export function encryptZoomToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), ciphertext]
    .map((part) => part.toString("base64url"))
    .join(".");
}

function decryptZoomToken(value: string) {
  const [encodedIv, encodedTag, encodedCiphertext] = value.split(".");
  if (!encodedIv || !encodedTag || !encodedCiphertext) {
    throw new Error("Invalid encrypted Zoom token");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(encodedIv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function basicAuthorization() {
  return `Basic ${Buffer.from(`${env.ZOOM_CLIENT_ID}:${env.ZOOM_CLIENT_SECRET}`).toString("base64")}`;
}

async function zoomFetch<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.text();
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Zoom request failed (${response.status}): ${body.slice(0, 300)}`,
    });
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
  url.searchParams.set("redirect_uri", env.ZOOM_REDIRECT_URI);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeZoomCode(code: string) {
  const tokens = await requestToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: env.ZOOM_REDIRECT_URI,
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
    const tokens = await requestToken(
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: decryptZoomToken(connection.encryptedRefreshToken),
      }),
    );
    await db.zoomConnection.update({
      where: { id: connection.id },
      data: {
        encryptedAccessToken: encryptZoomToken(tokens.access_token),
        encryptedRefreshToken: encryptZoomToken(tokens.refresh_token),
        accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scope: tokens.scope,
      },
    });
    return tokens.access_token;
  } catch (error) {
    await db.zoomConnection.update({
      where: { id: connection.id },
      data: { status: "EXPIRED" },
    });
    throw error;
  }
}

async function zoomApi<T>(
  organizationId: string,
  path: string,
  init: RequestInit,
) {
  const accessToken = await getAccessToken(organizationId);
  return zoomFetch<T>(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
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
  const token = await getAccessToken(organizationId);
  await zoomFetch(`${oauthBaseUrl}/revoke`, {
    method: "POST",
    headers: {
      Authorization: basicAuthorization(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ token }),
  });
  await db.zoomConnection.update({
    where: { id: connection.id },
    data: { status: "REVOKED" },
  });
}
