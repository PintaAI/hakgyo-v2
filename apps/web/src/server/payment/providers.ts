import { TRPCError } from "@trpc/server";

import type {
  PaymentMethod,
  PaymentProvider,
} from "../../../generated/prisma/enums";
import type { PaymentInstructions } from "~/lib/payments/payment";
import { toDynamicQris } from "~/lib/qris";
import type { CheckoutDestinations } from "~/server/payment/settings";

export type ChargeRequest = {
  reference: string;
  amount: number;
  method: PaymentMethod;
  destinations: CheckoutDestinations;
};

export type Charge = {
  instructions: PaymentInstructions;
  /** Set by gateways so their webhooks can find the payment. */
  providerPaymentId?: string;
  providerData?: Record<string, unknown>;
  expiresAt?: Date | null;
};

/**
 * Creates the charge a learner pays. MANUAL builds instructions from the
 * organization's own QRIS and bank accounts and staff confirm the money.
 * A gateway adapter (Midtrans, Xendit) would call the gateway here, return
 * its QR string or virtual account as instructions plus its transaction id,
 * and confirm payments from a webhook through `markPaymentPaid`.
 */
export type PaymentProviderAdapter = {
  provider: PaymentProvider;
  createCharge(request: ChargeRequest): Promise<Charge> | Charge;
};

export const manualPaymentProvider: PaymentProviderAdapter = {
  provider: "MANUAL",
  createCharge({ amount, method, destinations }) {
    if (method === "QRIS") {
      const qris = destinations.qris;
      if (!qris) throw methodUnavailable();
      return {
        instructions: {
          kind: "QRIS",
          payload: toDynamicQris(qris.payload, amount),
          merchantName: qris.merchantName,
          merchantCity: qris.merchantCity,
        },
      };
    }

    if (destinations.bankAccounts.length === 0) throw methodUnavailable();
    return {
      instructions: {
        kind: "BANK_TRANSFER",
        accounts: destinations.bankAccounts.map((account) => ({
          bankCode: account.bankCode,
          bankName: account.bankName,
          accountNumber: account.accountNumber,
          accountHolder: account.accountHolder,
        })),
      },
    };
  },
};

function methodUnavailable() {
  return new TRPCError({
    code: "PRECONDITION_FAILED",
    message: "Metode pembayaran ini belum tersedia.",
  });
}

/** The adapter that handles `method`; every method is manual for now. */
export function paymentProviderFor(_method: PaymentMethod) {
  return manualPaymentProvider;
}
