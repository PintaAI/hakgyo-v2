import { db } from "~/server/db";
import { expo } from "~/server/notifications/sender";

/** Expo keeps receipts for about a day; older tickets can never resolve. */
const RECEIPT_READY_MS = 15 * 60_000;
const RECEIPT_EXPIRY_MS = 24 * 60 * 60_000;
const BATCH_SIZE = 1000;

export type ReceiptCheckResult = {
  checked: number;
  disabledTargets: number;
  expired: number;
};

/**
 * Reads delivery receipts for Expo tickets older than 15 minutes, disables
 * devices Expo reports as unregistered, and deletes settled tickets. Tickets
 * without a receipt yet are retried on the next run until they expire.
 */
export async function checkPushReceipts(
  now = new Date(),
): Promise<ReceiptCheckResult> {
  const { count: expired } = await db.pushTicket.deleteMany({
    where: { createdAt: { lt: new Date(now.getTime() - RECEIPT_EXPIRY_MS) } },
  });
  const tickets = await db.pushTicket.findMany({
    where: { createdAt: { lte: new Date(now.getTime() - RECEIPT_READY_MS) } },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
    select: { id: true, ticketId: true, pushTargetId: true },
  });
  if (tickets.length === 0) {
    return { checked: 0, disabledTargets: 0, expired };
  }

  const settledIds: string[] = [];
  const goneTargetIds = new Set<string>();
  for (const chunk of expo.chunkPushNotificationReceiptIds(
    tickets.map((ticket) => ticket.ticketId),
  )) {
    const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
    for (const ticket of tickets) {
      const receipt = receipts[ticket.ticketId];
      if (!receipt) continue;
      settledIds.push(ticket.id);
      if (
        receipt.status === "error" &&
        receipt.details?.error === "DeviceNotRegistered"
      ) {
        goneTargetIds.add(ticket.pushTargetId);
      } else if (receipt.status === "error") {
        console.warn("Expo push receipt error", {
          ticketId: ticket.ticketId,
          error: receipt.details?.error,
          message: receipt.message,
        });
      }
    }
  }

  const [disabled] = await Promise.all([
    goneTargetIds.size > 0
      ? db.pushTarget.updateMany({
          where: { id: { in: [...goneTargetIds] }, disabledAt: null },
          data: { disabledAt: now, disabledReason: "DeviceNotRegistered" },
        })
      : { count: 0 },
    settledIds.length > 0
      ? db.pushTicket.deleteMany({ where: { id: { in: settledIds } } })
      : null,
  ]);

  return {
    checked: settledIds.length,
    disabledTargets: disabled.count,
    expired,
  };
}
