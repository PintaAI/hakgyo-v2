import { epsTopikBlueprint } from "@hakgyo/shared";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type {
  BankItemStatus,
  PrismaClient,
} from "../../../generated/prisma/client";
import { getBlockNotePlainText } from "~/lib/blocknote/document";
import { HAKGYO_SYSTEM_ORGANIZATION_ID } from "~/server/foundation/constants";

/**
 * The EPS-TOPIK question bank (docs/eps-question-generator.md sections 3 and 6): assessments of kind
 * BANK in the Hakgyo system organization, authored in the ordinary editor. Each question moves
 * DRAFT → REVIEW → LIVE (the generator picks only LIVE ones) and is RETIRED instead of deleted.
 * Every procedure here is superadmin-only.
 */

export const bankStatuses = ["DRAFT", "REVIEW", "LIVE", "RETIRED"] as const;

/** Questions a pilot of this many packages needs per type (section 7: about 120 for 3). */
export const PILOT_PACKAGES = 3;

export const setBankStatusInput = z.object({
  assessmentId: z.string().min(1),
  questionIds: z.array(z.string().min(1)).min(1).max(200),
  status: z.enum(bankStatuses),
});

export const listBankQuestionsInput = z.object({
  assessmentId: z.string().min(1),
  status: z.enum(bankStatuses).optional(),
});

/** Allowed moves: forward through review, back to draft from review, retire or revive. */
const transitions: Record<BankItemStatus, readonly BankItemStatus[]> = {
  DRAFT: ["REVIEW", "RETIRED"],
  REVIEW: ["LIVE", "DRAFT", "RETIRED"],
  LIVE: ["RETIRED", "REVIEW"],
  RETIRED: ["REVIEW"],
};

const statusLabels: Record<BankItemStatus, string> = {
  DRAFT: "Draf",
  REVIEW: "Perlu review",
  LIVE: "Siap dipakai",
  RETIRED: "Pensiun",
};

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
  const slotsPerType = new Map<string, number>();
  for (const section of epsTopikBlueprint.sections) {
    for (const slot of section.slots) {
      slotsPerType.set(slot.type, (slotsPerType.get(slot.type) ?? 0) + 1);
    }
  }
  return {
    organizationSlug: organization?.slug ?? null,
    canEdit: Boolean(membership),
    pilotPackages: PILOT_PACKAGES,
    banks: banks.map((bank) => {
      const counts = new Map<string, Record<BankItemStatus, number>>();
      for (const question of bank.questions) {
        const type =
          question.tags.find((tag) => tag.startsWith("eps:")) ?? "untagged";
        const row = counts.get(type) ?? {
          DRAFT: 0,
          REVIEW: 0,
          LIVE: 0,
          RETIRED: 0,
        };
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
            counts: counts.get(type) ?? {
              DRAFT: 0,
              REVIEW: 0,
              LIVE: 0,
              RETIRED: 0,
            },
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
    take: 500,
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

/** Why a question can't go to review or live yet, in Indonesian (null when it can). */
function readinessProblem(question: {
  type: string;
  tags: string[];
  optionCount: number;
  correctCount: number;
}) {
  if (question.type !== "SINGLE_CHOICE") return "harus pilihan tunggal";
  if (question.optionCount !== 4) return "harus punya 4 pilihan";
  if (question.correctCount !== 1) return "harus punya tepat 1 jawaban benar";
  if (!question.tags.some((tag) => tag.startsWith("eps:"))) {
    return "belum diberi label tipe (eps:…)";
  }
  if (!question.tags.some((tag) => tag.startsWith("level:"))) {
    return "belum diberi label tingkat (level:…)";
  }
  return null;
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
  const moved: string[] = [];
  const skipped: Array<{ questionId: string; reason: string }> = [];
  for (const question of questions) {
    const from = question.bankStatus ?? "DRAFT";
    if (from === input.status) continue;
    if (!transitions[from].includes(input.status)) {
      skipped.push({
        questionId: question.id,
        reason: `tidak bisa dari ${statusLabels[from]} ke ${statusLabels[input.status]}`,
      });
      continue;
    }
    const problem =
      input.status === "REVIEW" || input.status === "LIVE"
        ? readinessProblem({
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
    moved.push(question.id);
  }
  if (moved.length) {
    await db.assessmentQuestion.updateMany({
      where: { id: { in: moved } },
      data: { bankStatus: input.status },
    });
  }
  return { moved: moved.length, skipped };
}
