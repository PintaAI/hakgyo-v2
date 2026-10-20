import "server-only";

import { randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";

import { env } from "~/env";
import { db } from "~/server/db";
import {
  connectInstance,
  createInstance,
  deleteInstance,
  EvolutionApiError,
  EvolutionApiUnavailableError,
  type EvolutionQrCode,
  fetchInstanceInfo,
  logoutInstance,
} from "~/server/whatsapp/client";
import {
  decryptInstanceToken,
  encryptInstanceToken,
  instanceNameFor,
  isWhatsappEnabled,
  requireWhatsappConfig,
  WEBHOOK_SECRET_HEADER,
} from "~/server/whatsapp/config";
import { normalizeWhatsappNumber, phoneFromJid } from "~/lib/whatsapp";

/**
 * Linking an organization's WhatsApp number: one Evolution API instance per
 * organization, paired by scanning a QR code with the phone. Connection
 * changes arrive through the webhook; while the pairing dialog is open,
 * `getWhatsappPairing` also asks the server directly so pairing works when
 * the webhook cannot reach this deployment (local development).
 */

function requireEnabled() {
  if (!isWhatsappEnabled()) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Integrasi WhatsApp belum diaktifkan di server ini.",
    });
  }
}

function unavailable(error: unknown): never {
  if (error instanceof TRPCError) throw error;
  if (error instanceof EvolutionApiUnavailableError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Server WhatsApp sedang tidak dapat dihubungi. Coba lagi nanti.",
    });
  }
  if (error instanceof EvolutionApiError && error.status === 503) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Server WhatsApp belum diaktifkan. Hubungi tim Hakgyo.",
    });
  }
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "WhatsApp menolak permintaan. Coba lagi nanti.",
  });
}

const connectionSelect = {
  id: true,
  status: true,
  phoneJid: true,
  initialParticipantPhone: true,
  autoCreateGroups: true,
  connectedAt: true,
  disconnectedAt: true,
  createdAt: true,
  connectedBy: { select: { user: { select: { id: true, name: true } } } },
} as const;

export async function getWhatsappConnection(organizationId: string) {
  const connection = await db.whatsappConnection.findUnique({
    where: { organizationId },
    select: connectionSelect,
  });
  return {
    enabled: isWhatsappEnabled(),
    connection: connection
      ? { ...connection, phone: phoneFromJid(connection.phoneJid) }
      : null,
  };
}

function qrFrom(response: unknown): EvolutionQrCode | null {
  if (!response || typeof response !== "object") return null;
  const value = response as EvolutionQrCode & { qrcode?: EvolutionQrCode };
  if (value.base64 || value.pairingCode) return value;
  if (value.qrcode?.base64 || value.qrcode?.pairingCode) return value.qrcode;
  return null;
}

async function markConnected(
  organizationId: string,
  ownerJid: string | null | undefined,
) {
  await db.whatsappConnection.updateMany({
    where: { organizationId, status: { not: "CONNECTED" } },
    data: {
      status: "CONNECTED",
      phoneJid: ownerJid ?? undefined,
      connectedAt: new Date(),
      disconnectedAt: null,
    },
  });
}

/**
 * Starts pairing: creates the organization's instance (or reuses the one
 * waiting for a scan) and returns its QR code.
 */
export async function startWhatsappConnection(input: {
  organizationId: string;
  membershipId: string;
}) {
  requireEnabled();
  const config = requireWhatsappConfig();
  const instanceName = instanceNameFor(input.organizationId);
  const existing = await db.whatsappConnection.findUnique({
    where: { organizationId: input.organizationId },
    select: { status: true, encryptedInstanceToken: true },
  });
  if (existing?.status === "CONNECTED") {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Nomor WhatsApp organisasi sudah terhubung.",
    });
  }

  try {
    if (existing) {
      try {
        const qr = qrFrom(
          await connectInstance(
            instanceName,
            decryptInstanceToken(existing.encryptedInstanceToken),
          ),
        );
        if (qr)
          return {
            qrBase64: qr.base64 ?? null,
            pairingCode: qr.pairingCode ?? null,
          };
      } catch (error) {
        // The instance is gone from the server (or its token changed):
        // create it again below.
        if (!(error instanceof EvolutionApiError)) throw error;
      }
    }

    const token = randomBytes(32).toString("hex");
    // A leftover instance with this name (for example after a database reset)
    // would block creating it again.
    await deleteInstance(instanceName).catch(() => undefined);
    const created = await createInstance({
      instanceName,
      token,
      webhookUrl: `${env.APP_URL}/api/whatsapp/webhook`,
      webhookHeaders: { [WEBHOOK_SECRET_HEADER]: config.webhookSecret },
    });
    const encryptedInstanceToken = encryptInstanceToken(created.hash ?? token);
    await db.whatsappConnection.upsert({
      where: { organizationId: input.organizationId },
      create: {
        organizationId: input.organizationId,
        connectedByMembershipId: input.membershipId,
        instanceName,
        encryptedInstanceToken,
      },
      update: {
        connectedByMembershipId: input.membershipId,
        encryptedInstanceToken,
        status: "PENDING",
        phoneJid: null,
      },
    });
    const qr =
      qrFrom(created) ??
      qrFrom(await connectInstance(instanceName, created.hash ?? token));
    return {
      qrBase64: qr?.base64 ?? null,
      pairingCode: qr?.pairingCode ?? null,
    };
  } catch (error) {
    console.error("Failed to start WhatsApp pairing", error);
    unavailable(error);
  }
}

/**
 * Pairing progress for the open QR dialog: marks the connection connected as
 * soon as the server reports it, otherwise returns the current QR code (it
 * rotates every few seconds while waiting).
 */
export async function getWhatsappPairing(organizationId: string) {
  requireEnabled();
  const connection = await db.whatsappConnection.findUnique({
    where: { organizationId },
    select: { status: true, instanceName: true, encryptedInstanceToken: true },
  });
  if (!connection) return { status: "NONE" as const, qrBase64: null };
  if (connection.status === "CONNECTED") {
    return { status: "CONNECTED" as const, qrBase64: null };
  }
  const token = decryptInstanceToken(connection.encryptedInstanceToken);
  try {
    const info = await fetchInstanceInfo(connection.instanceName, token);
    if (info?.connectionStatus === "open") {
      await markConnected(organizationId, info.ownerJid);
      return { status: "CONNECTED" as const, qrBase64: null };
    }
    const qr = qrFrom(await connectInstance(connection.instanceName, token));
    return { status: "PENDING" as const, qrBase64: qr?.base64 ?? null };
  } catch (error) {
    console.error("Failed to read WhatsApp pairing", error);
    unavailable(error);
  }
}

/**
 * Logs the number out, deletes its instance and cancels queued work. Groups
 * stay in WhatsApp and their links stay on the cohorts.
 */
export async function disconnectWhatsapp(organizationId: string) {
  const connection = await db.whatsappConnection.findUnique({
    where: { organizationId },
    select: { id: true, instanceName: true, encryptedInstanceToken: true },
  });
  if (!connection) throw new TRPCError({ code: "NOT_FOUND" });
  if (isWhatsappEnabled()) {
    const token = decryptInstanceToken(connection.encryptedInstanceToken);
    await logoutInstance(connection.instanceName, token).catch(
      (error: unknown) => {
        console.error("WhatsApp instance could not be logged out", error);
      },
    );
    await deleteInstance(connection.instanceName).catch((error: unknown) => {
      console.error("WhatsApp instance could not be deleted", error);
    });
  }
  await db.$transaction([
    db.whatsappOutbox.updateMany({
      where: { organizationId, status: "PENDING" },
      data: { status: "CANCELLED", lastError: "Nomor WhatsApp diputus." },
    }),
    db.whatsappConnection.delete({ where: { id: connection.id } }),
  ]);
}

export async function updateWhatsappSettings(input: {
  organizationId: string;
  autoCreateGroups?: boolean;
  initialParticipantPhone?: string | null;
}) {
  let initialParticipantPhone: string | null | undefined;
  if (input.initialParticipantPhone !== undefined) {
    initialParticipantPhone = input.initialParticipantPhone?.trim()
      ? normalizeWhatsappNumber(input.initialParticipantPhone)
      : null;
    if (
      initialParticipantPhone === null &&
      input.initialParticipantPhone?.trim()
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Nomor WhatsApp tidak valid.",
      });
    }
  }
  const updated = await db.whatsappConnection.updateMany({
    where: { organizationId: input.organizationId },
    data: {
      autoCreateGroups: input.autoCreateGroups,
      initialParticipantPhone,
    },
  });
  if (updated.count !== 1) throw new TRPCError({ code: "NOT_FOUND" });
}

/** `CONNECTION_UPDATE` webhook: Evolution API reports open/close/connecting. */
export async function applyConnectionUpdate(input: {
  instanceName: string;
  state: string | undefined;
  wuid: string | null | undefined;
}) {
  const connection = await db.whatsappConnection.findUnique({
    where: { instanceName: input.instanceName },
    select: { organizationId: true, status: true },
  });
  if (!connection) return;
  if (input.state === "open") {
    await markConnected(connection.organizationId, input.wuid);
  } else if (
    (input.state === "close" || input.state === "refused") &&
    connection.status === "CONNECTED"
  ) {
    // A closed pairing attempt keeps the connection PENDING; only a linked
    // number becomes disconnected.
    await db.whatsappConnection.updateMany({
      where: { instanceName: input.instanceName, status: "CONNECTED" },
      data: { status: "DISCONNECTED", disconnectedAt: new Date() },
    });
  }
}
