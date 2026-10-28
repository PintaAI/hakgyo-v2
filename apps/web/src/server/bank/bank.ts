import { epsTopikBlueprint } from "@hakgyo/shared";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type {
  BankItemStatus,
  PrismaClient,
} from "../../../generated/prisma/client";
import {
  bankReadinessProblem,
  bankStatuses,
  bankStatusLabels,
  bankTransitions,
  MAX_BANK_BATCH,
} from "~/lib/bank-status";
import { getBlockNotePlainText } from "~/lib/blocknote/document";
import { HAKGYO_SYSTEM_ORGANIZATION_ID } from "~/server/foundation/constants";

/**
 * The EPS-TOPIK question bank (docs/eps-question-generator.md sections 3 and 6): assessments of kind
 * BANK in the Hakgyo system organization, authored in the ordinary editor. Each question moves
 * DRAFT → REVIEW → LIVE (the generator picks only LIVE ones) and is RETIRED instead of deleted.
 * Every procedure here is superadmin-only.
 */

/** Questions a pilot of this many packages needs per type (section 7: about 120 for 3). */
export const PILOT_PACKAGES = 3;

export const setBankStatusInput = z.object({
  assessmentId: z.string().min(1),
  questionIds: z.array(z.string().min(1)).min(1).max(MAX_BANK_BATCH),
  status: z.enum(bankStatuses),
});

export const listBankQuestionsInput = z.object({
  assessmentId: z.string().min(1),
  status: z.enum(bankStatuses).optional(),
});

const emptyCounts = (): Record<BankItemStatus, number> => ({
  DRAFT: 0,
  REVIEW: 0,
  LIVE: 0,
  RETIRED: 0,
});

/** How many slots of each type one package has. */
const slotsPerType = new Map<string, number>();
for (const section of epsTopikBlueprint.sections) {
  for (const slot of section.slots) {
    slotsPerType.set(slot.type, (slotsPerType.get(slot.type) ?? 0) + 1);
  }
}

async function requireBank(db: PrismaClient, assessmentId: string) {
  const bank = await db.assessment.findFirst({
    where: {
      id: assessmentId,
      kind: "BANK",
      organizationId: HAKGYO_SYSTEM_ORGANIZATION_ID,
    },
    select: { id: true, title: true },
  });
  if (!bank) throw new TRPCError({ code: "NOT_FOUND" });
  return bank;
}

/** Whether the user can open bank assessments in the editor (a member of the Hakgyo organization). */
async function systemMembership(db: PrismaClient, userId: string) {
  return db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: HAKGYO_SYSTEM_ORGANIZATION_ID,
        userId,
      },
    },
    select: { id: true, role: true },
  });
}

/** Banks with their questions counted per type tag and status, against the pilot targets. */
export async function getBankOverview(db: PrismaClient, userId: string) {
  const [organization, membership, banks] = await Promise.all([
    db.organization.findUnique({
      where: { id: HAKGYO_SYSTEM_ORGANIZATION_ID },
      select: { slug: true },
    }),
    systemMembership(db, userId),
    db.assessment.findMany({
      where: { kind: "BANK", organizationId: HAKGYO_SYSTEM_ORGANIZATION_ID },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        questions: { select: { tags: true, bankStatus: true } },
      },
    }),
  ]);
  return {
    organizationSlug: organization?.slug ?? null,
    canEdit: Boolean(membership),
    pilotPackages: PILOT_PACKAGES,
    banks: banks.map((bank) => {
      const counts = new Map<string, Record<BankItemStatus, number>>();
      for (const question of bank.questions) {
        const type =
          question.tags.find((tag) => tag.startsWith("eps:")) ?? "untagged";
        const row = counts.get(type) ?? emptyCounts();
        row[question.bankStatus ?? "DRAFT"] += 1;
        counts.set(type, row);
      }
      return {
        id: bank.id,
        title: bank.title,
        total: bank.questions.length,
        types: [...new Set([...slotsPerType.keys(), ...counts.keys()])].map(
          (type) => ({
            type,
            target: (slotsPerType.get(type) ?? 0) * PILOT_PACKAGES,
            counts: counts.get(type) ?? emptyCounts(),
          }),
        ),
      };
    }),
  };
}

/** Makes the superadmin an owner of the Hakgyo organization, so the bank opens in the editor. */
export async function joinSystemOrganization(db: PrismaClient, userId: string) {
  await db.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: HAKGYO_SYSTEM_ORGANIZATION_ID,
        userId,
      },
    },
    create: {
      organizationId: HAKGYO_SYSTEM_ORGANIZATION_ID,
      userId,
      role: "OWNER",
    },
    update: { role: "OWNER" },
  });
  return { joined: true };
}

export async function createBank(
  db: PrismaClient,
  input: { title: string },
  userId: string,
) {
  const membership = await systemMembership(db, userId);
  if (!membership) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Gabung ke organisasi Hakgyo dulu.",
    });
  }
  return db.assessment.create({
    data: {
      organizationId: HAKGYO_SYSTEM_ORGANIZATION_ID,
      createdByMembershipId: membership.id,
      kind: "BANK",
      title: input.title,
      description:
        "Bank soal Hakgyo. Soal di sini tidak dipakai langsung oleh murid.",
    },
    select: { id: true },
  });
}

export async function listBankQuestions(
  db: PrismaClient,
  input: z.infer<typeof listBankQuestionsInput>,
) {
  await requireBank(db, input.assessmentId);
  const questions = await db.assessmentQuestion.findMany({
    where: {
      assessmentId: input.assessmentId,
      ...(input.status ? { bankStatus: input.status } : {}),
    },
    orderBy: { position: "asc" },
    take: MAX_BANK_BATCH,
    select: {
      id: true,
      position: true,
      type: true,
      prompt: true,
      tags: true,
      bankStatus: true,
      groupId: true,
      updatedAt: true,
      options: { select: { isCorrect: true } },
    },
  });
  return questions.map(({ prompt, options, ...question }) => ({
    ...question,
    preview: getBlockNotePlainText(prompt).slice(0, 160),
    optionCount: options.length,
    correctCount: options.filter((option) => option.isCorrect).length,
  }));
}

/**
 * Moves questions to another status where the move is allowed and, for REVIEW and LIVE, the
 * question is complete. Returns what moved and why the others did not.
 */
export async function setBankStatus(
  db: PrismaClient,
  input: z.infer<typeof setBankStatusInput>,
) {
  await requireBank(db, input.assessmentId);
  const questions = await db.assessmentQuestion.findMany({
    where: { assessmentId: input.assessmentId, id: { in: input.questionIds } },
    select: {
      id: true,
      position: true,
      type: true,
      tags: true,
      bankStatus: true,
      options: { select: { isCorrect: true } },
    },
  });
  const movable = new Map<BankItemStatus, string[]>();
  const skipped: Array<{ questionId: string; reason: string }> = [];
  for (const question of questions) {
    const from = question.bankStatus ?? "DRAFT";
    if (from === input.status) continue;
    if (!bankTransitions[from].includes(input.status)) {
      skipped.push({
        questionId: question.id,
        reason: `tidak bisa dari ${bankStatusLabels[from]} ke ${bankStatusLabels[input.status]}`,
      });
      continue;
    }
    const problem =
      input.status === "REVIEW" || input.status === "LIVE"
        ? bankReadinessProblem({
            type: question.type,
            tags: question.tags,
            optionCount: question.options.length,
            correctCount: question.options.filter((option) => option.isCorrect)
              .length,
          })
        : null;
    if (problem) {
      skipped.push({ questionId: question.id, reason: problem });
      continue;
    }
    const group = movable.get(from) ?? [];
    group.push(question.id);
    movable.set(from, group);
  }
  // Each move only applies if the question is still where it was checked (another review may
  // have moved it meanwhile).
  let moved = 0;
  for (const [from, ids] of movable) {
    const result = await db.assessmentQuestion.updateMany({
      where: { id: { in: ids }, bankStatus: from },
      data: { bankStatus: input.status },
    });
    moved += result.count;
  }
  return { moved, skipped };
}
