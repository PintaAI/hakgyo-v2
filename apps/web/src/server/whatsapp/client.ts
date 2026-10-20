import "server-only";

import { requireWhatsappConfig } from "~/server/whatsapp/config";

/**
 * Thin REST client for Hakgyo's Evolution API server (v2.4+). Paths and bodies
 * follow the server's routers (`src/api/routes/*.router.ts` upstream). Instance
 * routes authenticate with the instance token; creating instances needs the
 * global key.
 */

const requestTimeoutMs = 20_000;

export class EvolutionApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(
      `Evolution API request failed with status ${status}${body ? `: ${body.slice(0, 500)}` : ""}`,
    );
  }

  /** Bad requests and missing groups do not get better with retries. */
  get permanent() {
    return this.status === 400 || this.status === 404;
  }
}

/** The server is unreachable or did not answer in time. */
export class EvolutionApiUnavailableError extends Error {}

async function evolutionFetch<T>(
  path: string,
  init: { method: string; apiKey: string; body?: unknown },
): Promise<T> {
  const { apiUrl } = requireWhatsappConfig();
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      method: init.method,
      headers: {
        apikey: init.apiKey,
        ...(init.body === undefined
          ? {}
          : { "Content-Type": "application/json" }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
  } catch (error) {
    console.error("Evolution API request could not be completed", path, error);
    throw new EvolutionApiUnavailableError("Evolution API is unreachable");
  }
  const text = await response.text().catch(() => "");
  if (!response.ok) {
    console.error("Evolution API rejected a request", {
      status: response.status,
      method: init.method,
      path,
      body: text.slice(0, 2000),
    });
    throw new EvolutionApiError(response.status, text);
  }
  return (text ? JSON.parse(text) : undefined) as T;
}

function instancePath(route: string, instanceName: string) {
  return `/${route}/${encodeURIComponent(instanceName)}`;
}

export type EvolutionQrCode = {
  base64?: string;
  code?: string;
  pairingCode?: string | null;
  count?: number;
};

export type EvolutionConnectionState = "open" | "close" | "connecting";

export async function createInstance(input: {
  instanceName: string;
  token: string;
  webhookUrl: string;
  webhookHeaders: Record<string, string>;
}) {
  const { apiKey } = requireWhatsappConfig();
  return evolutionFetch<{
    hash?: string;
    qrcode?: EvolutionQrCode;
  }>("/instance/create", {
    method: "POST",
    apiKey,
    body: {
      instanceName: input.instanceName,
      token: input.token,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
      // Hakgyo never reads chats; keep the linked phone's state untouched.
      groupsIgnore: true,
      readMessages: false,
      readStatus: false,
      syncFullHistory: false,
      alwaysOnline: false,
      webhook: {
        enabled: true,
        url: input.webhookUrl,
        headers: input.webhookHeaders,
        byEvents: false,
        base64: false,
        // Every webhook is a billed function call: connection changes only.
        events: ["CONNECTION_UPDATE"],
      },
    },
  });
}

/** Starts (or restarts) pairing and returns the current QR code. */
export async function connectInstance(instanceName: string, token: string) {
  return evolutionFetch<EvolutionQrCode & { instance?: unknown }>(
    instancePath("instance/connect", instanceName),
    { method: "GET", apiKey: token },
  );
}

export async function getConnectionState(instanceName: string, token: string) {
  const result = await evolutionFetch<{
    instance?: { state?: EvolutionConnectionState };
  }>(instancePath("instance/connectionState", instanceName), {
    method: "GET",
    apiKey: token,
  });
  return result.instance?.state ?? "close";
}

/** The instance row: connection status and the linked number once paired. */
export async function fetchInstanceInfo(instanceName: string, token: string) {
  const result = await evolutionFetch<
    { ownerJid?: string | null; connectionStatus?: EvolutionConnectionState }[]
  >(
    `/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`,
    { method: "GET", apiKey: token },
  );
  return result[0] ?? null;
}

export async function logoutInstance(instanceName: string, token: string) {
  await evolutionFetch(instancePath("instance/logout", instanceName), {
    method: "DELETE",
    apiKey: token,
  });
}

export async function deleteInstance(instanceName: string) {
  const { apiKey } = requireWhatsappConfig();
  await evolutionFetch(instancePath("instance/delete", instanceName), {
    method: "DELETE",
    apiKey,
  });
}

/**
 * WhatsApp needs one participant besides the linked number. The server drops
 * participants that are not on WhatsApp before creating the group.
 */
export async function createGroup(
  instanceName: string,
  token: string,
  input: { subject: string; description?: string; participants: string[] },
) {
  return evolutionFetch<{ id: string; subject?: string }>(
    instancePath("group/create", instanceName),
    {
      method: "POST",
      apiKey: token,
      body: {
        subject: input.subject,
        ...(input.description ? { description: input.description } : {}),
        participants: input.participants,
      },
    },
  );
}

/** `image` is a URL the server downloads, or base64. */
export async function updateGroupPicture(
  instanceName: string,
  token: string,
  input: { groupJid: string; image: string },
) {
  await evolutionFetch(instancePath("group/updateGroupPicture", instanceName), {
    method: "POST",
    apiKey: token,
    body: input,
  });
}

export async function getGroupInviteUrl(
  instanceName: string,
  token: string,
  groupJid: string,
) {
  const result = await evolutionFetch<{
    inviteUrl?: string;
    inviteCode?: string;
  }>(
    `${instancePath("group/inviteCode", instanceName)}?groupJid=${encodeURIComponent(groupJid)}`,
    { method: "GET", apiKey: token },
  );
  if (result.inviteUrl) return result.inviteUrl;
  if (result.inviteCode)
    return `https://chat.whatsapp.com/${result.inviteCode}`;
  throw new EvolutionApiError(404, "No invite code returned");
}

/** Throws a 404 EvolutionApiError when the group is gone or the number left it. */
export async function findGroupInfo(
  instanceName: string,
  token: string,
  groupJid: string,
) {
  return evolutionFetch<{ id: string; subject?: string }>(
    `${instancePath("group/findGroupInfos", instanceName)}?groupJid=${encodeURIComponent(groupJid)}`,
    { method: "GET", apiKey: token },
  );
}

export async function sendText(
  instanceName: string,
  token: string,
  input: { to: string; text: string },
) {
  await evolutionFetch(instancePath("message/sendText", instanceName), {
    method: "POST",
    apiKey: token,
    body: { number: input.to, text: input.text, linkPreview: true },
  });
}
