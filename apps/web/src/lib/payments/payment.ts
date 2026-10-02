import { z } from "zod";

import { defineManagedImage } from "~/lib/managed-image";

export type PaymentStatus =
  "PENDING" | "SUBMITTED" | "PAID" | "REJECTED" | "CANCELLED" | "EXPIRED";
export type PaymentMethod = "QRIS" | "BANK_TRANSFER";

/** Payments still waiting on the learner or on staff. */
export const openPaymentStatuses = ["PENDING", "SUBMITTED"] as const;

/**
 * Allowed status changes. Staff may still approve a cancelled, expired or
 * rejected payment when the money did arrive, and may revert an approval.
 * Gateways reuse the same rules (PENDING to PAID or EXPIRED).
 */
const transitions: Record<PaymentStatus, readonly PaymentStatus[]> = {
  PENDING: ["SUBMITTED", "PAID", "REJECTED", "CANCELLED", "EXPIRED"],
  SUBMITTED: ["SUBMITTED", "PAID", "REJECTED", "CANCELLED"],
  REJECTED: ["SUBMITTED", "PAID"],
  CANCELLED: ["PAID"],
  EXPIRED: ["PAID"],
  PAID: ["REJECTED"],
};

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus) {
  return transitions[from].includes(to);
}

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: "Menunggu pembayaran",
  SUBMITTED: "Menunggu verifikasi",
  PAID: "Lunas",
  REJECTED: "Ditolak",
  CANCELLED: "Dibatalkan",
  EXPIRED: "Kedaluwarsa",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  QRIS: "QRIS",
  BANK_TRANSFER: "Transfer bank",
};

export function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Where to pay, snapshotted on the payment at checkout so later changes to
 * the organization's settings do not alter what the learner was shown.
 */
export const paymentInstructionsSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("QRIS"),
    payload: z.string(),
    merchantName: z.string(),
    merchantCity: z.string(),
  }),
  z.object({
    kind: z.literal("BANK_TRANSFER"),
    accounts: z.array(
      z.object({
        bankCode: z.string(),
        bankName: z.string(),
        accountNumber: z.string(),
        accountHolder: z.string(),
      }),
    ),
  }),
]);

export type PaymentInstructions = z.infer<typeof paymentInstructionsSchema>;

export const MAX_PAYMENT_PROOF_SIZE = 10 * 1024 * 1024;

export const paymentProofContentTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type PaymentProofContentType = (typeof paymentProofContentTypes)[number];

const paymentProof = defineManagedImage({
  contentTypes: paymentProofContentTypes,
  maxSize: MAX_PAYMENT_PROOF_SIZE,
});

/** Proofs are private: they are served through short-lived signed URLs. */
function paymentProofPrefix(paymentId: string) {
  return `payment-proofs/${encodeURIComponent(paymentId)}/`;
}

export function createPaymentProofKey(
  paymentId: string,
  fileSize: number,
  contentType: PaymentProofContentType,
) {
  return paymentProof.createKey(
    paymentProofPrefix(paymentId),
    fileSize,
    contentType,
  );
}

export function parsePaymentProofKey(key: string, paymentId: string) {
  return paymentProof.parseKey(key, paymentProofPrefix(paymentId));
}
