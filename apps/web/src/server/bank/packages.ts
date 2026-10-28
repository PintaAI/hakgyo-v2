import { randomBytes } from "node:crypto";

import { epsTopikBlueprint, type BlueprintDifficulty } from "@hakgyo/shared";
import { epsTypeByTag } from "@hakgyo/shared/eps-taxonomy";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { Prisma, PrismaClient } from "../../../generated/prisma/client";
import { getBlockNotePlainText } from "~/lib/blocknote/document";
import { collectMaterialAssetIds } from "~/lib/blocknote/material-assets";
import { questionCopyRows } from "~/server/assessment/copy";
import { sectionData } from "~/server/assessment/eps-preset";
import { requireOrganizationPermission } from "~/server/authorization";
import { type GenerationPicks } from "~/server/bank/picks";
import {
  balancedKeyPositions,
  moveKeyTo,
  refersToOptionNumbers,
  selectPackage,
  type BankUnit,
} from "~/server/bank/selection";
import { withTransactionRetry } from "~/server/db-retry";
import { HAKGYO_SYSTEM_ORGANIZATION_ID } from "~/server/foundation/constants";
import { toPrismaJsonValue } from "~/server/prisma-json";

/**
 * "Buat set EPS-TOPIK" (docs/eps-question-generator.md section 4.1): an organization's owner or
 * admin draws a set soal from the LIVE questions of the Hakgyo bank. The set is an ordinary
 * assessment of the organization: copies of the bank questions that remember their source as a
 * record only, with the bank's media (owned by the Hakgyo system organization) linked rather than
 * copied. Later bank edits only reach sets made afterwards.
 */

/** Starts every set's description; staff may edit it like any other. */
export const SET_DESCRIPTION =
  "Set soal EPS-TOPIK dari bank soal Hakgyo. Audio dibuat dengan suara AI.";

/** Owners and admins: the role that manages the organization manages its generated sets. */
const SET_PERMISSION = "organization.manage" as const;

export const previewEpsSetInput = z.object({
  organizationId: z.string().min(1),
  /** Leave out for a new random set; pass the same seed to see the same one again. */
  seed: z.string().trim().min(1).max(64).optional(),
});

export const createEpsSetInput = z.object({
  organizationId: z.string().min(1),
  seed: z.string().trim().min(1).max(64),
  /** The preview's clock (epoch ms), so recency weighs the same when the set is saved. */
  drawnAt: z.number().int().positive(),
  /** The previewed question ids in slot order, so a bank change since then is caught. */
  questionIds: z.array(z.string().min(1)).min(1).max(200),
  title: z.string().trim().min(1).max(200).optional(),
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
  updatedAt: true,
  type: true,
  prompt: true,
  explanation: true,
  tags: true,
  position: true,
  groupId: true,
  group: { select: { id: true, instructions: true, stimulus: true } },
  options: {
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: { content: true, isCorrect: true, position: true },
  },
} as const satisfies Prisma.BankQuestionSelect;

type BankQuestion = Prisma.BankQuestionGetPayload<{
  select: typeof bankQuestionSelect;
}>;

/**
 * LIVE bank questions as units: a single question, or a group (its questions in `position`
 * order) when every question of the group is LIVE. Usage counts the copies in this
 * organization's assessments, and in all assessments.
 */
async function loadBank(db: PrismaClient, organizationId: string) {
  // A stable order, so the same bank and seed always draw the same set.
  const questions = await db.bankQuestion.findMany({
    where: { status: "LIVE", type: "SINGLE_CHOICE" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: bankQuestionSelect,
  });
  const groupIds = [
    ...new Set(questions.flatMap(({ groupId }) => (groupId ? [groupId] : []))),
  ];
  const ids = questions.map(({ id }) => id);
  const [groupSizes, organizationUse, globalUse] = await Promise.all([
    groupIds.length
      ? db.bankQuestion.groupBy({
          by: ["groupId"],
          where: { groupId: { in: groupIds } },
          _count: { _all: true },
        })
      : [],
    ids.length
      ? db.assessmentQuestion.groupBy({
          by: ["sourceQuestionId"],
          where: {
            sourceQuestionId: { in: ids },
            assessment: { organizationId },
          },
          _count: { _all: true },
          _max: { createdAt: true },
        })
      : [],
    ids.length
      ? db.assessmentQuestion.groupBy({
          by: ["sourceQuestionId"],
          where: { sourceQuestionId: { in: ids } },
          _count: { _all: true },
        })
      : [],
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
    let members = [question];
    if (question.groupId) {
      if (seenGroups.has(question.groupId)) continue;
      seenGroups.add(question.groupId);
      members = questions
        .filter(({ groupId }) => groupId === question.groupId)
        .sort(
          (left, right) =>
            left.position - right.position || left.id.localeCompare(right.id),
        );
      // A group with a question that is not LIVE cannot go out yet.
      if (members.length !== groupSize.get(question.groupId)) continue;
    }
    const first = members[0]!;
    const type = typeOf(first.tags);
    if (!type) continue;
    const use = members
      .map(({ id }) => usedHere.get(id))
      .filter((row) => row !== undefined);
    const lastUsed = use
      .map((row) => row._max.createdAt?.getTime() ?? 0)
      .reduce((latest, value) => Math.max(latest, value), 0);
    units.push({
      questionIds: members.map(({ id }) => id),
      groupId: first.groupId,
      type,
      memberTypes: members.map((member) => typeOf(member.tags) ?? type),
      level: levelOf(first.tags),
      topic: topicOf(first.tags),
      text: [
        first.group ? getBlockNotePlainText(first.group.stimulus) : "",
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

/** The acting member, when they own or administer an organization other than Hakgyo's own. */
async function requireSetManager(organizationId: string, userId: string) {
  if (organizationId === HAKGYO_SYSTEM_ORGANIZATION_ID) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Set soal dibuat untuk lembaga, bukan untuk organisasi Hakgyo.",
    });
  }
  return requireOrganizationPermission({
    organizationId,
    permission: SET_PERMISSION,
    userId,
  });
}

function select(units: BankUnit[], seed: string, now: number) {
  return selectPackage({ blueprint: epsTopikBlueprint, units, seed, now });
}

/** What a set for the organization would hold, without saving anything. */
export async function previewEpsSet(
  db: PrismaClient,
  input: z.infer<typeof previewEpsSetInput>,
  userId: string,
) {
  await requireSetManager(input.organizationId, userId);
  const seed = input.seed ?? randomBytes(6).toString("hex");
  const { units, byId } = await loadBank(db, input.organizationId);
  const drawnAt = Date.now();
  const selection = select(units, seed, drawnAt);
  const typeName = (tag: string) => epsTypeByTag(tag)?.name ?? tag;
  return {
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

/** Asset ids referenced in the questions' content, their groups included. */
function bankAssetIds(questions: readonly BankQuestion[]) {
  const ids = new Set<string>();
  for (const question of questions) {
    for (const document of [
      question.prompt,
      question.explanation,
      ...question.options.map((option) => option.content),
      question.group?.instructions,
      question.group?.stimulus,
    ]) {
      for (const id of collectMaterialAssetIds(document)) ids.add(id);
    }
  }
  return ids;
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
      message: `${ids.size - assets.length} gambar atau audio di soal terpilih belum tersedia. Coba acak lagi, atau hubungi Hakgyo.`,
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
  // Shared assets may be linked from other organizations; older bank media may not be marked yet.
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
function setRows(input: {
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
    // Sources already carry the set's section ids.
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

/**
 * Saves the previewed set as an ordinary assessment of the organization, created by the acting
 * member: the blueprint's two sections and score bands, copies of the picked questions (2.5
 * points, keys moved so each position is used about equally per section), links to the bank's
 * media, and the AssessmentGeneration record. One transaction.
 */
export async function createEpsSet(
  db: PrismaClient,
  input: z.infer<typeof createEpsSetInput>,
  userId: string,
) {
  const member = await requireSetManager(input.organizationId, userId);
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
      message: `Bank soal belum cukup: ${selection.missing.length} nomor belum ada soalnya.`,
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

  const earlier = await db.assessmentGeneration.count({
    where: { organizationId: input.organizationId },
  });
  const title = input.title ?? `Set EPS-TOPIK ${earlier + 1}`;

  return withTransactionRetry(() =>
    db.$transaction(async (tx) => {
      // The bank may have changed since it was read: every picked question must still be LIVE
      // and unedited (an edit moves updatedAt, or a LIVE question back to review). FOR SHARE
      // holds off edits and retirements until the copies are written.
      const current = await tx.$queryRaw<
        Array<{ id: string; status: string; updatedAt: Date }>
      >`
        SELECT "id", "status", "updatedAt" FROM "BankQuestion"
        WHERE "id" = ANY(${picked}) ORDER BY "id" FOR SHARE
      `;
      const unchanged =
        current.length === picked.length &&
        current.every(
          (row) =>
            row.status === "LIVE" &&
            row.updatedAt.getTime() === byId.get(row.id)?.updatedAt.getTime(),
        );
      if (!unchanged) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Bank soal berubah sejak pratinjau. Buat pratinjau lagi.",
        });
      }

      const assessment = await tx.assessment.create({
        data: {
          organizationId: input.organizationId,
          createdByMembershipId: member.id,
          title,
          description: SET_DESCRIPTION,
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
      const { rows, options } = setRows({
        assessmentId: assessment.id,
        sources: sources.map(({ question, section }, position) => ({
          question,
          sectionId: sectionIds.get(section)!,
          position,
          keyTarget: keyTargets.get(question.id) ?? null,
        })),
      });
      if (rows.groups.length) {
        await tx.assessmentQuestionGroup.createMany({ data: rows.groups });
      }
      await tx.assessmentQuestion.createMany({ data: rows.questions });
      await tx.assessmentOption.createMany({ data: rows.options });
      await linkBankAssets(tx, {
        assessmentId: assessment.id,
        organizationId: input.organizationId,
        assetIds: linkedAssetIds,
      });

      const picks: GenerationPicks = {
        slots: selection.picks.map((pick) => ({
          number: pick.number,
          questionIds: pick.unit.questionIds,
          groupId: pick.unit.groupId,
        })),
        warnings: selection.warnings,
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
