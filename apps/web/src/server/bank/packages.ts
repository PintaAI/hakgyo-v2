import { randomBytes } from "node:crypto";

import { epsTopikBlueprint, type BlueprintDifficulty } from "@hakgyo/shared";
import { epsTypeByTag } from "@hakgyo/shared/eps-taxonomy";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { Prisma, PrismaClient } from "../../../generated/prisma/client";
import { getBlockNotePlainText } from "~/lib/blocknote/document";
import { collectMaterialAssetIds } from "~/lib/blocknote/material-assets";
import { requireAssessmentManagement } from "~/server/assessment/access";
import { questionCopyRows } from "~/server/assessment/copy";
import { sectionData } from "~/server/assessment/eps-preset";
import { getAssessmentLiveStatus } from "~/server/assessment/live-status";
import { lockAssessment } from "~/server/assessment/lock";
import {
  balancedKeyPositions,
  moveKeyTo,
  pickReplacement,
  refersToOptionNumbers,
  selectPackage,
  type BankUnit,
} from "~/server/bank/selection";
import { readPicks, type PackagePicks } from "~/server/bank/picks";
import { withTransactionRetry } from "~/server/db-retry";
import { HAKGYO_SYSTEM_ORGANIZATION_ID } from "~/server/foundation/constants";
import { toPrismaJsonValue } from "~/server/prisma-json";

/**
 * Packages (pemantapan) built from the bank for one organization (docs/eps-question-generator.md
 * section 4.1). The pilot builds them from superadmin; LPK owners will later. A package is a
 * GENERATED assessment with `contentLocked`, holding copies of LIVE bank questions that remember
 * their source, with shared bank media linked rather than copied.
 */

/** On every package: learners hear AI voices, and staff learn why the content is locked. */
export const PACKAGE_DESCRIPTION =
  "Paket pemantapan EPS-TOPIK dari Hakgyo. Audio dibuat dengan suara AI.";

export const previewPackageInput = z.object({
  organizationId: z.string().min(1),
  /** Leave out for a new random package; pass the same seed to see the same one again. */
  seed: z.string().trim().min(1).max(64).optional(),
});

export const createPackageInput = z.object({
  organizationId: z.string().min(1),
  seed: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1).max(200).optional(),
  /** The previewed question ids in slot order, so a bank change since then is caught. */
  questionIds: z.array(z.string().min(1)).min(1).max(200),
  /** The preview's clock (epoch ms), so recency weighs the same when the package is saved. */
  drawnAt: z.number().int().positive(),
});

const levelOf = (tags: readonly string[]) =>
  (tags.find((tag) => tag.startsWith("level:"))?.slice("level:".length) as
    BlueprintDifficulty | undefined) ?? null;
const topicOf = (tags: readonly string[]) =>
  tags.find((tag) => tag.startsWith("topik:")) ?? null;
const typeOf = (tags: readonly string[]) =>
  tags.map(epsTypeByTag).find(Boolean)?.tag ?? null;

const bankQuestionSelect = {
  id: true,
  type: true,
  prompt: true,
  explanation: true,
  tags: true,
  position: true,
  groupId: true,
  assessmentId: true,
  group: { select: { id: true, instructions: true, stimulus: true } },
  options: {
    orderBy: { position: "asc" },
    select: { content: true, isCorrect: true, position: true },
  },
} as const;

/** LIVE bank questions as units (a group is one unit, and only when all its questions are LIVE). */
async function loadBank(db: PrismaClient, organizationId: string) {
  const questions = await db.assessmentQuestion.findMany({
    where: {
      bankStatus: "LIVE",
      type: "SINGLE_CHOICE",
      assessment: {
        kind: "BANK",
        organizationId: HAKGYO_SYSTEM_ORGANIZATION_ID,
      },
    },
    orderBy: [{ assessmentId: "asc" }, { position: "asc" }],
    select: bankQuestionSelect,
  });
  const groupIds = [
    ...new Set(questions.flatMap(({ groupId }) => (groupId ? [groupId] : []))),
  ];
  const ids = questions.map(({ id }) => id);
  const [groupSizes, organizationUse, globalUse] = await Promise.all([
    groupIds.length
      ? db.assessmentQuestion.groupBy({
          by: ["groupId"],
          where: { groupId: { in: groupIds } },
          _count: { _all: true },
        })
      : [],
    db.assessmentQuestion.groupBy({
      by: ["sourceQuestionId"],
      where: {
        sourceQuestionId: { in: ids },
        assessment: { kind: "GENERATED", organizationId },
      },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    db.assessmentQuestion.groupBy({
      by: ["sourceQuestionId"],
      where: {
        sourceQuestionId: { in: ids },
        assessment: { kind: "GENERATED" },
      },
      _count: { _all: true },
    }),
  ]);
  const groupSize = new Map(
    groupSizes.map((row) => [row.groupId, row._count._all]),
  );
  const usedHere = new Map(
    organizationUse.map((row) => [row.sourceQuestionId, row]),
  );
  const usedAnywhere = new Map(
    globalUse.map((row) => [row.sourceQuestionId, row._count._all]),
  );

  const byId = new Map(questions.map((question) => [question.id, question]));
  const units: BankUnit[] = [];
  const seenGroups = new Set<string>();
  for (const question of questions) {
    const type = typeOf(question.tags);
    if (!type) continue;
    let members = [question];
    if (question.groupId) {
      if (seenGroups.has(question.groupId)) continue;
      seenGroups.add(question.groupId);
      members = questions.filter(({ groupId }) => groupId === question.groupId);
      // A group with a question still in review cannot go out yet.
      if (members.length !== groupSize.get(question.groupId)) continue;
    }
    const use = members
      .map(({ id }) => usedHere.get(id))
      .filter((row) => row !== undefined);
    const lastUsed = use
      .map((row) => row._max.createdAt?.getTime() ?? 0)
      .reduce((latest, value) => Math.max(latest, value), 0);
    units.push({
      questionIds: members.map(({ id }) => id),
      groupId: question.groupId,
      type,
      memberTypes: members.map((member) => typeOf(member.tags) ?? type),
      level: levelOf(question.tags),
      topic: topicOf(question.tags),
      text: [
        question.group ? getBlockNotePlainText(question.group.stimulus) : "",
        ...members.flatMap((member) => [
          getBlockNotePlainText(member.prompt),
          ...member.options.map((option) =>
            getBlockNotePlainText(option.content),
          ),
        ]),
      ].join(" "),
      organizationUses: Math.max(0, ...use.map((row) => row._count._all)),
      lastUsedAt: lastUsed || null,
      globalUses: Math.max(
        0,
        ...members.map(({ id }) => usedAnywhere.get(id) ?? 0),
      ),
    });
  }
  return { units, byId };
}

async function requireTargetOrganization(
  db: PrismaClient,
  organizationId: string,
) {
  if (organizationId === HAKGYO_SYSTEM_ORGANIZATION_ID) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Paket dibuat untuk LPK, bukan untuk organisasi Hakgyo.",
    });
  }
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });
  if (!organization) throw new TRPCError({ code: "NOT_FOUND" });
  return organization;
}

function select(units: BankUnit[], seed: string, now: number) {
  return selectPackage({ blueprint: epsTopikBlueprint, units, seed, now });
}

/** What a package for the organization would hold, without saving anything. */
export async function previewPackage(
  db: PrismaClient,
  input: z.infer<typeof previewPackageInput>,
) {
  const organization = await requireTargetOrganization(
    db,
    input.organizationId,
  );
  const seed = input.seed ?? randomBytes(6).toString("hex");
  const { units, byId } = await loadBank(db, input.organizationId);
  const drawnAt = Date.now();
  const selection = select(units, seed, drawnAt);
  const typeName = (tag: string) => epsTypeByTag(tag)?.name ?? tag;
  return {
    organization,
    seed,
    drawnAt,
    blueprint: epsTopikBlueprint.version,
    bankSize: units.length,
    slots: selection.picks.map((pick) => {
      const first = byId.get(pick.unit.questionIds[0]!)!;
      return {
        number: pick.number,
        count: pick.unit.questionIds.length,
        type: pick.unit.type,
        typeName: typeName(pick.unit.type),
        alternative: pick.unit.type !== pick.slot.type,
        level: pick.unit.level,
        target: pick.slot.difficulty,
        topic: pick.unit.topic,
        organizationUses: pick.unit.organizationUses,
        questionIds: pick.unit.questionIds,
        preview: getBlockNotePlainText(first.prompt).slice(0, 120),
      };
    }),
    missing: selection.missing.map((slot) => ({
      ...slot,
      typeName: typeName(slot.type),
    })),
    warnings: selection.warnings,
  };
}

type BankQuestion =
  Awaited<ReturnType<typeof loadBank>>["byId"] extends Map<string, infer Q>
    ? Q
    : never;

/**
 * Questions that name an option by number keep their order: circled numbers anywhere, and in the
 * (Indonesian) explanation also "jawaban 2" or "2번". Prompts often say "3번 버스", so only circled
 * numbers count there.
 */
function keepsOrder(question: BankQuestion) {
  return (
    /[①②③④]/.test(
      [
        getBlockNotePlainText(question.prompt),
        question.group ? getBlockNotePlainText(question.group.stimulus) : "",
        question.group
          ? getBlockNotePlainText(question.group.instructions)
          : "",
      ].join(" "),
    ) || refersToOptionNumbers(getBlockNotePlainText(question.explanation))
  );
}

/** Asset ids referenced in any of these BlockNote documents. */
function assetIdsIn(documents: readonly unknown[]) {
  const ids = new Set<string>();
  for (const document of documents) {
    for (const id of collectMaterialAssetIds(document)) ids.add(id);
  }
  return ids;
}

/** Every content field of a question that can hold media. */
const questionDocuments = (question: {
  prompt: unknown;
  explanation: unknown;
  options: ReadonlyArray<{ content: unknown }>;
}) => [
  question.prompt,
  question.explanation,
  ...question.options.map((option) => option.content),
];

function bankAssetIds(questions: readonly BankQuestion[]) {
  return assetIdsIn(
    questions.flatMap((question) => [
      ...questionDocuments(question),
      question.group?.instructions,
      question.group?.stimulus,
    ]),
  );
}

/** Every picture and sound must be a usable Hakgyo asset, or learners would get a broken item. */
async function requireBankAssets(db: PrismaClient, ids: ReadonlySet<string>) {
  if (!ids.size) return [];
  const assets = await db.asset.findMany({
    where: {
      id: { in: [...ids] },
      organizationId: HAKGYO_SYSTEM_ORGANIZATION_ID,
      confirmedAt: { not: null },
      deletedAt: null,
    },
    select: { id: true },
  });
  if (assets.length !== ids.size) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `${ids.size - assets.length} gambar atau audio di soal terpilih tidak tersedia. Periksa soalnya di bank, lalu coba lagi.`,
    });
  }
  return assets.map(({ id }) => id);
}

/** Bank media stay Hakgyo's and are linked, not copied (section 3.1). */
async function linkBankAssets(
  tx: Prisma.TransactionClient,
  input: { assessmentId: string; organizationId: string; assetIds: string[] },
) {
  if (!input.assetIds.length) return;
  await tx.asset.updateMany({
    where: { id: { in: input.assetIds }, sharedAt: null },
    data: { sharedAt: new Date() },
  });
  await tx.assessmentAsset.createMany({
    data: input.assetIds.map((assetId) => ({
      assessmentId: input.assessmentId,
      assetId,
      organizationId: input.organizationId,
      assetOrganizationId: HAKGYO_SYSTEM_ORGANIZATION_ID,
    })),
    skipDuplicates: true,
  });
}

/**
 * Copy rows for bank questions placed at `position` in `sectionId`, each key moved to its target
 * (none: authored order), plus the option order each copy got.
 */
function packageRows(input: {
  assessmentId: string;
  sources: ReadonlyArray<{
    question: BankQuestion;
    sectionId: string;
    position: number;
    keyTarget: number | null;
  }>;
}) {
  const ordered = input.sources.map(({ question, keyTarget }) =>
    keyTarget === null || keepsOrder(question)
      ? question.options
      : moveKeyTo(question.options, keyTarget),
  );
  const groups = [
    ...new Map(
      input.sources.flatMap(({ question }) =>
        question.group
          ? [
              [
                question.group.id,
                { ...question.group, sourceGroupId: question.group.id },
              ] as const,
            ]
          : [],
      ),
    ).values(),
  ];
  const rows = questionCopyRows({
    assessmentId: input.assessmentId,
    groups,
    // Sources already carry the package's section ids.
    sectionIds: new Map(
      input.sources.map(({ sectionId }) => [sectionId, sectionId]),
    ),
    questions: input.sources.map(
      ({ question, sectionId, position }, index) => ({
        type: question.type,
        prompt: question.prompt,
        explanation: question.explanation,
        points: epsTopikBlueprint.pointsPerQuestion,
        position,
        tags: question.tags,
        sectionId,
        groupId: question.groupId,
        sourceQuestionId: question.id,
        options: ordered[index]!.map((option, optionIndex) => ({
          ...option,
          position: optionIndex,
        })),
      }),
    ),
  });
  const options = Object.fromEntries(
    rows.questions.map((row, index) => [
      row.id,
      ordered[index]!.map((option) => option.position),
    ]),
  );
  return { rows, options };
}

async function insertRows(
  tx: Prisma.TransactionClient,
  rows: ReturnType<typeof packageRows>["rows"],
) {
  if (rows.groups.length) {
    await tx.assessmentQuestionGroup.createMany({ data: rows.groups });
  }
  await tx.assessmentQuestion.createMany({ data: rows.questions });
  await tx.assessmentOption.createMany({ data: rows.options });
}

/**
 * Saves the previewed package: the assessment with the blueprint's two sections, copies of the
 * picked questions (2.5 points, keys moved so each position is used about equally per section),
 * links to the shared bank media, and the AssessmentGeneration record. One transaction.
 */
export async function createPackage(
  db: PrismaClient,
  input: z.infer<typeof createPackageInput>,
  userId: string,
) {
  await requireTargetOrganization(db, input.organizationId);
  const { units, byId } = await loadBank(db, input.organizationId);
  // The preview's clock, never one from the future.
  const selection = select(
    units,
    input.seed,
    Math.min(input.drawnAt, Date.now()),
  );
  if (selection.missing.length) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `Bank belum cukup: ${selection.missing.length} nomor belum ada soalnya.`,
    });
  }
  const picked = selection.picks.flatMap((pick) => pick.unit.questionIds);
  if (
    picked.length !== input.questionIds.length ||
    picked.some((id, index) => id !== input.questionIds[index])
  ) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Bank soal berubah sejak pratinjau. Buat pratinjau lagi.",
    });
  }

  // The package is created in the organization's name, by its first owner (the pilot has no
  // LPK staff building packages yet).
  const managers = await db.organizationMember.findMany({
    where: {
      organizationId: input.organizationId,
      role: { in: ["OWNER", "ADMIN"] },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true },
  });
  const creator = managers.find(({ role }) => role === "OWNER") ?? managers[0];
  if (!creator) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Organisasi ini belum punya owner atau admin.",
    });
  }

  const blueprint = epsTopikBlueprint;
  const sectionOf = new Map(
    blueprint.sections.flatMap((section) =>
      section.slots.map((slot) => [slot.number, section.key] as const),
    ),
  );
  // Question rows in slot order.
  const sources = selection.picks.flatMap((pick) =>
    pick.unit.questionIds.map((id) => ({
      question: byId.get(id)!,
      section: sectionOf.get(pick.number)!,
    })),
  );
  // Keys move to a balanced position per section, among the questions whose order may change.
  const keyTargets = new Map<string, number>();
  for (const section of blueprint.sections) {
    const inSection = sources.filter(
      (entry) => entry.section === section.key && !keepsOrder(entry.question),
    );
    const targets = balancedKeyPositions(
      inSection.length,
      `${input.seed}:${section.key}`,
    );
    inSection.forEach((entry, index) => {
      keyTargets.set(entry.question.id, targets[index]!);
    });
  }
  const linkedAssetIds = await requireBankAssets(
    db,
    bankAssetIds(sources.map(({ question }) => question)),
  );

  const count = await db.assessment.count({
    where: { organizationId: input.organizationId, kind: "GENERATED" },
  });
  const title = input.title ?? `Pemantapan EPS-TOPIK ${count + 1}`;

  return withTransactionRetry(() =>
    db.$transaction(async (tx) => {
      const assessment = await tx.assessment.create({
        data: {
          organizationId: input.organizationId,
          createdByMembershipId: creator.id,
          kind: "GENERATED",
          contentLocked: true,
          title,
          description: PACKAGE_DESCRIPTION,
          shuffleQuestions: false,
          shuffleOptions: false,
          scoreBands: toPrismaJsonValue(blueprint.scoreBands),
        },
        select: { id: true },
      });
      const sectionIds = new Map<string, string>();
      for (const [index, section] of blueprint.sections.entries()) {
        const created = await tx.assessmentSection.create({
          data: {
            assessmentId: assessment.id,
            position: index,
            ...sectionData(section),
          },
          select: { id: true },
        });
        sectionIds.set(section.key, created.id);
      }
      const { rows, options } = packageRows({
        assessmentId: assessment.id,
        sources: sources.map(({ question, section }, position) => ({
          question,
          sectionId: sectionIds.get(section)!,
          position,
          keyTarget: keyTargets.get(question.id) ?? null,
        })),
      });
      await insertRows(tx, rows);
      await linkBankAssets(tx, {
        assessmentId: assessment.id,
        organizationId: input.organizationId,
        assetIds: linkedAssetIds,
      });

      const picks: PackagePicks = {
        slots: selection.picks.map((pick) => ({
          number: pick.number,
          questionIds: pick.unit.questionIds,
          groupId: pick.unit.groupId,
        })),
        warnings: selection.warnings,
        swaps: [],
        options,
      };
      await tx.assessmentGeneration.create({
        data: {
          assessmentId: assessment.id,
          organizationId: input.organizationId,
          blueprintKey: "eps-topik",
          blueprintVersion: blueprint.version,
          seed: input.seed,
          picks: toPrismaJsonValue(picks),
          createdByUserId: userId,
        },
      });
      return { assessmentId: assessment.id, title };
    }),
  );
}

export const swapPackageQuestionInput = z.object({
  assessmentId: z.string().min(1),
  /** The question number (1–40); a number inside a group swaps the whole group. */
  number: z.number().int().min(1).max(200),
});

const FROZEN_MESSAGE =
  "Paket ini sudah dikerjakan murid, jadi soalnya tidak bisa diganti lagi. Minta paket baru ke Hakgyo.";

/**
 * Swaps need a package nobody can take yet: no attempt, and not live (hidden in the curriculum, no
 * open event). Learners can't start a package that isn't live, so a swap never races a start or
 * leaves an offline bundle pointing at deleted questions.
 */
async function assertSwappable(
  db: Prisma.TransactionClient | PrismaClient,
  assessmentId: string,
) {
  const [attempts, live] = await Promise.all([
    db.assessmentAttempt.count({ where: { assessmentId } }),
    getAssessmentLiveStatus(db, assessmentId),
  ]);
  if (attempts) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: FROZEN_MESSAGE,
    });
  }
  if (live.isLive) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Paket ini sedang tayang. Sembunyikan dulu itemnya di kurikulum (dan jangan ada latihan yang sedang dibuka), lalu ganti soalnya.",
    });
  }
}

/**
 * "Ganti soal no. N" (section 4.3): replaces the bank unit at that slot with another one of the
 * same type and closest difficulty, while the package is not live and has no attempt. The new copy takes the old
 * key position, so the section stays balanced. The swap is recorded in the generation picks.
 */
export async function swapPackageQuestion(
  db: PrismaClient,
  input: z.infer<typeof swapPackageQuestionInput>,
  userId: string,
) {
  const managed = await requireAssessmentManagement(
    db,
    input.assessmentId,
    userId,
  );
  const generation = await db.assessmentGeneration.findUnique({
    where: { assessmentId: input.assessmentId },
    select: { seed: true, picks: true },
  });
  if (managed.kind !== "GENERATED" || !generation) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Hanya soal paket pemantapan yang bisa diganti.",
    });
  }
  const picks = readPicks(generation.picks);
  const slot = picks.slots.find(
    (entry) =>
      input.number >= entry.number &&
      input.number < entry.number + entry.questionIds.length,
  );
  if (!slot) throw new TRPCError({ code: "NOT_FOUND" });
  await assertSwappable(db, input.assessmentId);

  const { units, byId } = await loadBank(db, managed.organizationId);
  const replacement = pickReplacement({
    blueprint: epsTopikBlueprint,
    number: slot.number,
    size: slot.questionIds.length,
    units,
    // Never the questions in the package, nor ones swapped out before.
    exclude: new Set([
      ...picks.slots.flatMap((entry) => entry.questionIds),
      ...picks.swaps.flatMap((swap) => swap.from),
    ]),
    seed: `${generation.seed}:swap:${slot.number}:${picks.swaps.length}`,
    now: Date.now(),
  });
  if (!replacement) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `Bank belum punya soal lain untuk nomor ${slot.number}.`,
    });
  }
  const incoming = replacement.questionIds.map((id) => byId.get(id)!);
  const linkedAssetIds = await requireBankAssets(db, bankAssetIds(incoming));

  return withTransactionRetry(() =>
    db.$transaction(async (tx) => {
      await lockAssessment(tx, input.assessmentId);
      // It may have gone live, or been started, while the bank was read.
      await assertSwappable(tx, input.assessmentId);
      const current = await tx.assessmentGeneration.findUniqueOrThrow({
        where: { assessmentId: input.assessmentId },
        select: { picks: true },
      });
      const latest = readPicks(current.picks);
      const index = latest.slots.findIndex(
        (entry) => entry.number === slot.number,
      );
      if (
        index < 0 ||
        latest.slots[index]!.questionIds.join() !== slot.questionIds.join()
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Soal ini baru saja diganti. Muat ulang halaman.",
        });
      }
      const outgoing = await tx.assessmentQuestion.findMany({
        where: {
          assessmentId: input.assessmentId,
          position: {
            gte: slot.number - 1,
            lt: slot.number - 1 + slot.questionIds.length,
          },
        },
        orderBy: { position: "asc" },
        select: {
          id: true,
          position: true,
          sectionId: true,
          groupId: true,
          options: {
            orderBy: { position: "asc" },
            select: { isCorrect: true },
          },
        },
      });
      if (outgoing.length !== slot.questionIds.length) {
        throw new TRPCError({ code: "CONFLICT" });
      }
      await tx.assessmentQuestion.deleteMany({
        where: { id: { in: outgoing.map(({ id }) => id) } },
      });
      const groupIds = outgoing.flatMap(({ groupId }) =>
        groupId ? [groupId] : [],
      );
      if (groupIds.length) {
        await tx.assessmentQuestionGroup.deleteMany({
          where: { id: { in: groupIds }, questions: { none: {} } },
        });
      }
      const { rows, options } = packageRows({
        assessmentId: input.assessmentId,
        sources: incoming.map((question, offset) => {
          const old = outgoing[offset]!;
          const key = old.options.findIndex((option) => option.isCorrect);
          return {
            question,
            sectionId: old.sectionId!,
            position: old.position,
            keyTarget: key < 0 ? null : key,
          };
        }),
      });
      await insertRows(tx, rows);
      await linkBankAssets(tx, {
        assessmentId: input.assessmentId,
        organizationId: managed.organizationId,
        assetIds: linkedAssetIds,
      });
      await pruneAssetLinks(tx, input.assessmentId);

      const removed = new Set(outgoing.map(({ id }) => id));
      latest.slots[index] = {
        number: slot.number,
        questionIds: replacement.questionIds,
        groupId: replacement.groupId,
      };
      latest.swaps.push({
        number: slot.number,
        from: slot.questionIds,
        to: replacement.questionIds,
        at: new Date().toISOString(),
        byUserId: userId,
      });
      latest.options = {
        ...Object.fromEntries(
          Object.entries(latest.options).filter(([id]) => !removed.has(id)),
        ),
        ...options,
      };
      await tx.assessmentGeneration.update({
        where: { assessmentId: input.assessmentId },
        data: { picks: toPrismaJsonValue(latest) },
      });
      return { number: slot.number, count: replacement.questionIds.length };
    }),
  );
}

/** Drops links to media nothing in the package uses any more (after a swap). */
async function pruneAssetLinks(
  tx: Prisma.TransactionClient,
  assessmentId: string,
) {
  const [assessment, questions, groups, sections] = await Promise.all([
    tx.assessment.findUniqueOrThrow({
      where: { id: assessmentId },
      select: { instructions: true },
    }),
    tx.assessmentQuestion.findMany({
      where: { assessmentId },
      select: {
        prompt: true,
        explanation: true,
        options: { select: { content: true } },
      },
    }),
    tx.assessmentQuestionGroup.findMany({
      where: { assessmentId },
      select: { instructions: true, stimulus: true },
    }),
    tx.assessmentSection.findMany({
      where: { assessmentId },
      select: { instructions: true },
    }),
  ]);
  const used = assetIdsIn([
    assessment.instructions,
    ...questions.flatMap(questionDocuments),
    ...groups.flatMap((group) => [group.instructions, group.stimulus]),
    ...sections.map((section) => section.instructions),
  ]);
  await tx.assessmentAsset.deleteMany({
    where: { assessmentId, assetId: { notIn: [...used] } },
  });
}

/** Generated packages across organizations, newest first (the pilot's list in superadmin). */
export async function listPackages(db: PrismaClient) {
  const packages = await db.assessment.findMany({
    where: { kind: "GENERATED" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      createdAt: true,
      organization: { select: { id: true, name: true, slug: true } },
      generation: { select: { seed: true, blueprintVersion: true } },
      _count: { select: { questions: true, attempts: true } },
    },
  });
  return packages.map(({ _count, ...entry }) => ({
    ...entry,
    questions: _count.questions,
    attempts: _count.attempts,
  }));
}
