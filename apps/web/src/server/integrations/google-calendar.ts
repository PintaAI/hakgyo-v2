import "server-only";

import { randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";

import { env } from "~/env";
import { db } from "~/server/db";
import { decryptToken, encryptToken } from "~/server/integrations/token-crypto";

const calendarBase = "https://www.googleapis.com/calendar/v3";
const redirectUri = `${env.APP_URL}/api/integrations/google-meet/callback`;
const scope = "openid email https://www.googleapis.com/auth/calendar.events";
const timeoutMs = 10_000;

// Keep the existing 32-byte integration key so connecting Google does not require a new secret.
export const encryptGoogleToken = (value: string) =>
  encryptToken(value, env.ZOOM_TOKEN_ENCRYPTION_KEY);
const decryptGoogleToken = (value: string) =>
  decryptToken(value, env.ZOOM_TOKEN_ENCRYPTION_KEY);

type GoogleTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
};
type GoogleUser = { sub: string; email: string; email_verified?: boolean };
type CalendarEvent = {
  id: string;
  hangoutLink?: string;
  conferenceData?: {
    createRequest?: { status?: { statusCode?: string } };
    entryPoints?: Array<{ entryPointType: string; uri: string }>;
  };
};
export type GoogleMeetingInput = {
  title: string;
  agenda?: string | null;
  startsAt: Date;
  durationMinutes: number;
  timezone: string;
};

class GoogleRequestError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`Google request failed with status ${status}`);
  }
}

async function googleFetch<T>(url: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    console.error("Google request could not be completed", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Google Calendar is temporarily unavailable",
    });
  }
  if (!response.ok) {
    const body = (await response.text().catch(() => "")).slice(0, 2000);
    console.error("Google rejected a request", {
      status: response.status,
      method: init.method,
      body,
    });
    throw new GoogleRequestError(response.status, body);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function getGoogleAuthorizationUrl(state: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.BETTER_AUTH_GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

async function requestToken(body: URLSearchParams) {
  return googleFetch<GoogleTokens>("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      ...Object.fromEntries(body),
      client_id: env.BETTER_AUTH_GOOGLE_CLIENT_ID,
      client_secret: env.BETTER_AUTH_GOOGLE_CLIENT_SECRET,
    }),
  });
}

export async function exchangeGoogleCode(code: string) {
  const tokens = await requestToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  );
  const user = await googleFetch<GoogleUser>(
    "https://openidconnect.googleapis.com/v1/userinfo",
    { headers: { Authorization: `Bearer ${tokens.access_token}` } },
  );
  if (!user.sub || !user.email || user.email_verified === false) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Google account email is unavailable",
    });
  }
  return { tokens, user };
}

async function getAccessToken(organizationId: string) {
  const connection = await db.googleCalendarConnection.findUnique({
    where: { organizationId },
  });
  if (connection?.status !== "CONNECTED") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Connect the organization to Google Meet first",
    });
  }
  if (connection.accessTokenExpiresAt.getTime() > Date.now() + 60_000) {
    return decryptGoogleToken(connection.encryptedAccessToken);
  }
  try {
    return await db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`google-calendar:${organizationId}`}))`;
        const current = await tx.googleCalendarConnection.findUnique({
          where: { organizationId },
        });
        if (current?.status !== "CONNECTED") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Reconnect Google Meet",
          });
        }
        if (current.accessTokenExpiresAt.getTime() > Date.now() + 60_000) {
          return decryptGoogleToken(current.encryptedAccessToken);
        }
        const tokens = await requestToken(
          new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: decryptGoogleToken(current.encryptedRefreshToken),
          }),
        );
        await tx.googleCalendarConnection.update({
          where: { id: current.id },
          data: {
            encryptedAccessToken: encryptGoogleToken(tokens.access_token),
            ...(tokens.refresh_token
              ? {
                  encryptedRefreshToken: encryptGoogleToken(
                    tokens.refresh_token,
                  ),
                }
              : {}),
            accessTokenExpiresAt: new Date(
              Date.now() + tokens.expires_in * 1000,
            ),
            scope: tokens.scope ?? current.scope,
          },
        });
        return tokens.access_token;
      },
      { timeout: 15_000 },
    );
  } catch (error) {
    if (
      error instanceof GoogleRequestError &&
      [400, 401].includes(error.status)
    ) {
      await db.googleCalendarConnection.updateMany({
        where: { id: connection.id, status: "CONNECTED" },
        data: { status: "EXPIRED" },
      });
    }
    throw error;
  }
}

async function calendarApi<T>(
  organizationId: string,
  path: string,
  init: RequestInit,
) {
  try {
    const token = await getAccessToken(organizationId);
    return await googleFetch<T>(`${calendarBase}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch (error) {
    if (!(error instanceof GoogleRequestError)) throw error;
    if (error.status === 401) {
      await db.googleCalendarConnection.updateMany({
        where: { organizationId, status: "CONNECTED" },
        data: { status: "EXPIRED" },
      });
    }
    throw new TRPCError({
      code: error.status === 429 ? "TOO_MANY_REQUESTS" : "BAD_REQUEST",
      message:
        error.status === 429
          ? "Google Calendar rate limit reached; try again shortly"
          : `Google Calendar rejected the request (${error.status})`,
    });
  }
}

function eventBody(input: GoogleMeetingInput) {
  return {
    summary: input.title,
    description: input.agenda ?? "",
    start: { dateTime: input.startsAt.toISOString(), timeZone: input.timezone },
    end: {
      dateTime: new Date(
        input.startsAt.getTime() + input.durationMinutes * 60_000,
      ).toISOString(),
      timeZone: input.timezone,
    },
  };
}

function videoUrl(event: CalendarEvent) {
  return (
    event.conferenceData?.entryPoints?.find(
      (point) => point.entryPointType === "video",
    )?.uri ??
    event.hangoutLink ??
    null
  );
}

export async function createGoogleMeeting(
  organizationId: string,
  input: GoogleMeetingInput,
) {
  const calendarId = "primary";
  const event = await calendarApi<CalendarEvent>(
    organizationId,
    `/calendars/${calendarId}/events?conferenceDataVersion=1`,
    {
      method: "POST",
      body: JSON.stringify({
        ...eventBody(input),
        conferenceData: {
          createRequest: {
            requestId: randomBytes(16).toString("hex"),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
    },
  );
  return { calendarId, eventId: event.id, joinUrl: videoUrl(event) };
}

export async function getGoogleMeetingJoinUrl(
  organizationId: string,
  calendarId: string,
  eventId: string,
) {
  const event = await calendarApi<CalendarEvent>(
    organizationId,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "GET" },
  );
  const status = event.conferenceData?.createRequest?.status?.statusCode;
  if (status === "failure") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Google Meet link generation failed",
    });
  }
  return videoUrl(event);
}

export function updateGoogleMeeting(
  organizationId: string,
  calendarId: string,
  eventId: string,
  input: GoogleMeetingInput,
) {
  return calendarApi<CalendarEvent>(
    organizationId,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?conferenceDataVersion=1`,
    { method: "PATCH", body: JSON.stringify(eventBody(input)) },
  );
}

export function deleteGoogleMeeting(
  organizationId: string,
  calendarId: string,
  eventId: string,
) {
  return calendarApi<void>(
    organizationId,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE" },
  );
}

export async function revokeGoogleConnection(organizationId: string) {
  const connection = await db.googleCalendarConnection.findUnique({
    where: { organizationId },
  });
  if (!connection) throw new TRPCError({ code: "NOT_FOUND" });
  // Google's revocation endpoint revokes every grant for this Cloud project,
  // including Google sign-in. Remove the organizer grant locally instead.
  await db.googleCalendarConnection.update({
    where: { id: connection.id },
    data: {
      status: "REVOKED",
      encryptedAccessToken: encryptGoogleToken(
        randomBytes(32).toString("base64url"),
      ),
      encryptedRefreshToken: encryptGoogleToken(
        randomBytes(32).toString("base64url"),
      ),
      accessTokenExpiresAt: new Date(),
    },
  });
}
