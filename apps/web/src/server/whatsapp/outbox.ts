import "server-only";

import type { Prisma } from "../../../generated/prisma/client";
import type { WhatsappOutboxKind } from "../../../generated/prisma/enums";
import { db } from "~/server/db";
import {
  EvolutionApiError,
  EvolutionApiUnavailableError,
} from "~/server/whatsapp/client";
import {
  decryptInstanceToken,
  isWhatsappEnabled,
} from "~/server/whatsapp/config";
import {
  type ActiveConnection,
  createCohortGroup,
  type CreateGroupPayload,
  sendCohortGroupMessage,
  WhatsappWorkCancelled,
  WhatsappWorkError,
} from "~/server/whatsapp/groups";
import {
  deferredUntil,
  MAX_ATTEMPTS,
  MESSAGES_PER_CONNECTION_PER_RUN,
  remainingBudget,
  retryDelayMs,
  sendGapMs,
  STALE_CLAIM_MS,
} from "~/server/whatsapp/pacing";

/**
 * The WhatsApp outbox: every group creation and group message goes through a
 * `WhatsappOutbox` row, so sends are paced per number, retried, and never
 * repeated. Rows are claimed with a conditional update like the reminder
 * claims, so overlapping cron runs send once.
 */

export type OutboxInput = {
  organizationId: string;
  cohortId: string;
  kind: WhatsappOutboxKind;
  dedupeKey: string;
  payload: Prisma.InputJsonValue;
  sendAfter?: Date;
  expiresAt?: Date | null;
};

/** Queues rows; keys already queued are skipped. Returns how many were new. */
export async function enqueueWhatsapp(rows: OutboxInput[]) {
  if (rows.length === 0 || !isWhatsappEnabled()) return 0;
  const result = await db.whatsappOutbox.createMany({
    data: rows.map((row) => ({ ...row, expiresAt: row.expiresAt ?? null })),
    skipDuplicates: true,
  });
  return result.count;
}

/** Cancels queued rows whose key starts with `dedupePrefix`. */
export async function cancelWhatsappOutbox(dedupePrefix: string) {
  await db.whatsappOutbox.updateMany({
    where: { dedupeKey: { startsWith: dedupePrefix }, status: "PENDING" },
    data: { status: "CANCELLED", lastError: "Tidak diperlukan lagi." },
  });
}

export async function loadActiveConnection(
  organizationId: string,
): Promise<ActiveConnection | null> {
  const connection = await db.whatsappConnection.findUnique({
    where: { organizationId },
    select: {
      status: true,
      instanceName: true,
      encryptedInstanceToken: true,
      initialParticipantPhone: true,
    },
  });
  if (connection?.status !== "CONNECTED") return null;
  return {
    organizationId,
    instanceName: connection.instanceName,
    token: decryptInstanceToken(connection.encryptedInstanceToken),
    initialParticipantPhone: connection.initialParticipantPhone,
  };
}

async function sentCounts(organizationId: string, now: Date) {
  const hourAgo = new Date(now.getTime() - 60 * 60_000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60_000);
  const sent = (kind: WhatsappOutboxKind, since: Date) =>
    db.whatsappOutbox.count({
      where: { organizationId, kind, status: "SENT", sentAt: { gte: since } },
    });
  const [groupsLastHour, groupsLastDay, messagesLastDay] = await Promise.all([
    sent("CREATE_GROUP", hourAgo),
    sent("CREATE_GROUP", dayAgo),
    sent("GROUP_MESSAGE", dayAgo),
  ]);
  return remainingBudget({ groupsLastHour, groupsLastDay, messagesLastDay });
}

export type OutboxOutcome =
  | { status: "SKIPPED" }
  | { status: "SENT" }
  | { status: "CANCELLED"; reason: string }
  | { status: "RETRY"; error: string }
  | { status: "FAILED"; error: string };

function errorText(error: unknown) {
  if (error instanceof WhatsappWorkError) return error.message;
  if (error instanceof EvolutionApiUnavailableError) {
    return "Server WhatsApp sedang tidak dapat dihubungi.";
  }
  if (error instanceof EvolutionApiError) {
    return `WhatsApp menolak permintaan (status ${error.status}).`;
  }
  return error instanceof Error ? error.message : "Terjadi kesalahan.";
}

function isPermanent(error: unknown) {
  if (error instanceof WhatsappWorkError) return error.permanent;
  if (error instanceof EvolutionApiError) return error.permanent;
  return false;
}

/**
 * Claims and runs one queued row. `retry: false` (a staff member waiting on
 * the result) turns failures into FAILED instead of a later retry.
 */
export async function runOutboxRow(
  rowId: string,
  connection: ActiveConnection,
  options: { now?: Date; retry?: boolean } = {},
): Promise<OutboxOutcome> {
  const now = options.now ?? new Date();
  const claimed = await db.whatsappOutbox.updateMany({
    where: { id: rowId, status: "PENDING", sendAfter: { lte: now } },
    data: { status: "SENDING", claimedAt: now, attempts: { increment: 1 } },
  });
  if (claimed.count !== 1) return { status: "SKIPPED" };
  const row = await db.whatsappOutbox.findUniqueOrThrow({
    where: { id: rowId },
  });

  const finish = (data: Prisma.WhatsappOutboxUpdateManyMutationInput) =>
    db.whatsappOutbox.updateMany({
      where: { id: rowId, status: "SENDING", claimedAt: now },
      data: { claimedAt: null, ...data },
    });

  if (row.expiresAt && row.expiresAt <= now) {
    await finish({ status: "CANCELLED", lastError: "Kedaluwarsa." });
    return { status: "CANCELLED", reason: "Kedaluwarsa." };
  }

  try {
    if (row.kind === "CREATE_GROUP") {
      await createCohortGroup(
        connection,
        row.cohortId,
        row.payload as CreateGroupPayload,
      );
    } else {
      const { text } = row.payload as { text: string };
      await sendCohortGroupMessage(connection, row.cohortId, text);
    }
    await finish({ status: "SENT", sentAt: new Date(), lastError: null });
    return { status: "SENT" };
  } catch (error) {
    if (error instanceof WhatsappWorkCancelled) {
      await finish({ status: "CANCELLED", lastError: error.message });
      return { status: "CANCELLED", reason: error.message };
    }
    const message = errorText(error);
    console.error("WhatsApp outbox row failed", {
      rowId,
      kind: row.kind,
      attempts: row.attempts,
      error,
    });
    if (
      options.retry === false ||
      isPermanent(error) ||
      row.attempts >= MAX_ATTEMPTS
    ) {
      await finish({ status: "FAILED", lastError: message });
      return { status: "FAILED", error: message };
    }
    await finish({
      status: "PENDING",
      lastError: message,
      sendAfter: new Date(now.getTime() + retryDelayMs(row.attempts)),
    });
    return { status: "RETRY", error: message };
  }
}

/**
 * Runs one queued row now when the number's budget allows it; otherwise it
 * stays queued for the cron. For staff waiting on a result (manual creation).
 */
export async function runOutboxRowNow(
  rowId: string,
  connection: ActiveConnection,
): Promise<OutboxOutcome | { status: "QUEUED" }> {
  const row = await db.whatsappOutbox.findUniqueOrThrow({
    where: { id: rowId },
    select: { kind: true },
  });
  const now = new Date();
  const budget = await sentCounts(connection.organizationId, now);
  if (budget[row.kind] <= 0) {
    await db.whatsappOutbox.updateMany({
      where: { id: rowId, status: "PENDING" },
      data: { sendAfter: deferredUntil(row.kind, now) },
    });
    return { status: "QUEUED" };
  }
  return runOutboxRow(rowId, connection, { now, retry: false });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type OutboxSweepResult = {
  sent: number;
  failed: number;
  retried: number;
  cancelled: number;
  deferred: number;
};

/**
 * One cron sweep: releases abandoned claims, cancels expired rows, then sends
 * due rows per connected number, sequentially with random gaps and within the
 * number's budget. Numbers are handled in parallel. Stops starting sends at
 * `deadline` so the run ends well within the function limit.
 */
export async function processWhatsappOutbox(
  now = new Date(),
  deadline = new Date(now.getTime() + 180_000),
): Promise<OutboxSweepResult> {
  const result: OutboxSweepResult = {
    sent: 0,
    failed: 0,
    retried: 0,
    cancelled: 0,
    deferred: 0,
  };
  if (!isWhatsappEnabled()) return result;

  await db.whatsappOutbox.updateMany({
    where: {
      status: "SENDING",
      claimedAt: { lt: new Date(now.getTime() - STALE_CLAIM_MS) },
    },
    data: { status: "PENDING", claimedAt: null },
  });
  const expired = await db.whatsappOutbox.updateMany({
    where: { status: "PENDING", expiresAt: { lte: now } },
    data: { status: "CANCELLED", lastError: "Kedaluwarsa." },
  });
  result.cancelled += expired.count;

  const due = await db.whatsappOutbox.findMany({
    where: {
      status: "PENDING",
      sendAfter: { lte: now },
      organization: { whatsappConnection: { status: "CONNECTED" } },
    },
    orderBy: { sendAfter: "asc" },
    take: 200,
    select: { id: true, organizationId: true, kind: true },
  });
  const byOrganization = Map.groupBy(due, (row) => row.organizationId);

  await Promise.all(
    [...byOrganization].map(async ([organizationId, rows]) => {
      const connection = await loadActiveConnection(organizationId);
      if (!connection) return;
      const budget = await sentCounts(organizationId, now);
      let attempted = 0;
      for (const row of rows) {
        if (attempted >= MESSAGES_PER_CONNECTION_PER_RUN) break;
        if (Date.now() >= deadline.getTime()) break;
        if (budget[row.kind] <= 0) {
          await db.whatsappOutbox.updateMany({
            where: { id: row.id, status: "PENDING" },
            data: { sendAfter: deferredUntil(row.kind, now) },
          });
          result.deferred++;
          continue;
        }
        if (attempted > 0) await sleep(sendGapMs());
        const outcome = await runOutboxRow(row.id, connection);
        if (outcome.status === "SKIPPED") continue;
        attempted++;
        if (outcome.status === "SENT") {
          budget[row.kind]--;
          result.sent++;
        } else if (outcome.status === "FAILED") result.failed++;
        else if (outcome.status === "RETRY") result.retried++;
        else result.cancelled++;
      }
    }),
  );
  return result;
}
