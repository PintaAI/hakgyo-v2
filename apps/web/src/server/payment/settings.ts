import { TRPCError } from "@trpc/server";

import type { Prisma } from "../../../generated/prisma/client";
import {
  bankNameForCode,
  isKnownBankCode,
  OTHER_BANK_CODE,
} from "~/lib/payments/banks";
import { normalizeQris, validateQris } from "~/lib/qris";

type Database = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

const bankAccountSelect = {
  id: true,
  bankCode: true,
  bankName: true,
  accountNumber: true,
  accountHolder: true,
  enabled: true,
  position: true,
} satisfies Prisma.OrganizationBankAccountSelect;

/** Everything the payment settings page shows. Callers check permission. */
export async function getPaymentSettings(db: Database, organizationId: string) {
  const [qris, bankAccounts] = await Promise.all([
    db.organizationQris.findUnique({
      where: { organizationId },
      select: {
        payload: true,
        merchantName: true,
        merchantCity: true,
        enabled: true,
        updatedAt: true,
      },
    }),
    db.organizationBankAccount.findMany({
      where: { organizationId },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: bankAccountSelect,
    }),
  ]);
  return { qris, bankAccounts };
}

/** Enabled destinations learners can pay to. */
export async function getCheckoutDestinations(
  db: Database,
  organizationId: string,
) {
  const settings = await getPaymentSettings(db, organizationId);
  return {
    qris: settings.qris?.enabled ? settings.qris : null,
    bankAccounts: settings.bankAccounts.filter(({ enabled }) => enabled),
  };
}

export type CheckoutDestinations = Awaited<
  ReturnType<typeof getCheckoutDestinations>
>;

export function availablePaymentMethods(destinations: CheckoutDestinations) {
  return [
    ...(destinations.qris ? (["QRIS"] as const) : []),
    ...(destinations.bankAccounts.length > 0
      ? (["BANK_TRANSFER"] as const)
      : []),
  ];
}

/** Stores a static QRIS after validating it; dynamic codes are refused. */
export async function saveOrganizationQris(
  db: Database,
  input: { organizationId: string; payload: string },
) {
  const payload = normalizeQris(input.payload);
  const validation = validateQris(payload);
  if (!validation.valid) {
    throw new TRPCError({ code: "BAD_REQUEST", message: validation.error });
  }
  if (validation.info.isDynamic) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Gunakan QRIS statis dari merchant. QRIS dinamis hanya berlaku untuk satu nominal.",
    });
  }
  const data = {
    payload,
    merchantName: validation.info.merchantName,
    merchantCity: validation.info.merchantCity,
    enabled: true,
  };
  return db.organizationQris.upsert({
    where: { organizationId: input.organizationId },
    create: { organizationId: input.organizationId, ...data },
    update: data,
    select: { merchantName: true, merchantCity: true, enabled: true },
  });
}

/** Resolves the stored bank name: the listed name, or the custom one for OTHER. */
export function resolveBankName(bankCode: string, customName?: string | null) {
  if (bankCode === OTHER_BANK_CODE) {
    const name = customName?.trim();
    if (!name) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Isi nama bank untuk pilihan bank lainnya.",
      });
    }
    return name;
  }
  if (!isKnownBankCode(bankCode)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Bank tidak dikenal" });
  }
  return bankNameForCode(bankCode)!;
}

export async function createOrganizationBankAccount(
  db: Database,
  input: {
    organizationId: string;
    bankCode: string;
    bankName?: string | null;
    accountNumber: string;
    accountHolder: string;
  },
) {
  const last = await db.organizationBankAccount.findFirst({
    where: { organizationId: input.organizationId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  return db.organizationBankAccount.create({
    data: {
      organizationId: input.organizationId,
      bankCode: input.bankCode,
      bankName: resolveBankName(input.bankCode, input.bankName),
      accountNumber: input.accountNumber,
      accountHolder: input.accountHolder,
      position: (last?.position ?? -1) + 1,
    },
    select: bankAccountSelect,
  });
}

export async function updateOrganizationBankAccount(
  db: Database,
  input: {
    organizationId: string;
    bankAccountId: string;
    bankCode?: string;
    bankName?: string | null;
    accountNumber?: string;
    accountHolder?: string;
    enabled?: boolean;
  },
) {
  const existing = await db.organizationBankAccount.findFirst({
    where: { id: input.bankAccountId, organizationId: input.organizationId },
    select: { bankCode: true, bankName: true },
  });
  if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
  const bankCode = input.bankCode ?? existing.bankCode;
  const bankName =
    input.bankCode !== undefined || input.bankName !== undefined
      ? resolveBankName(bankCode, input.bankName ?? existing.bankName)
      : undefined;
  return db.organizationBankAccount.update({
    where: { id: input.bankAccountId },
    data: {
      bankCode,
      bankName,
      accountNumber: input.accountNumber,
      accountHolder: input.accountHolder,
      enabled: input.enabled,
    },
    select: bankAccountSelect,
  });
}
