import { randomBytes } from "node:crypto";

import { epsTopikBlueprint, type BlueprintDifficulty } from "@hakgyo/shared";
import { epsTypeByTag } from "@hakgyo/shared/eps-taxonomy";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { PrismaClient } from "../../../generated/prisma/client";
import { getBlockNotePlainText } from "~/lib/blocknote/document";
import { collectMaterialAssetIds } from "~/lib/blocknote/material-assets";
import { questionCopyRows } from "~/server/assessment/copy";
import { sectionData } from "~/server/assessment/eps-preset";
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
  // Question rows in slot order, each with its key moved to a balanced position per section.
  const sources = selection.picks.flatMap((pick) =>
    pick.unit.questionIds.map((id) => ({
      question: byId.get(id)!,
      section: sectionOf.get(pick.number)!,
    })),
  );
  // Questions that name an option by number keep their order: circled numbers anywhere, and in
  // the (Indonesian) explanation also "jawaban 2" or "2번". Prompts often say "3번 버스".
  const keepsOrder = (question: (typeof sources)[number]["question"]) =>
    /[①②③④]/.test(
      [
        getBlockNotePlainText(question.prompt),
        question.group ? getBlockNotePlainText(question.group.stimulus) : "",
        question.group
          ? getBlockNotePlainText(question.group.instructions)
          : "",
      ].join(" "),
    ) || refersToOptionNumbers(getBlockNotePlainText(question.explanation));
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
  const assetIds = new Set<string>();
  const collect = (value: unknown) => {
    for (const id of collectMaterialAssetIds(value)) assetIds.add(id);
  };
  for (const { question } of sources) {
    collect(question.prompt);
    collect(question.explanation);
    for (const option of question.options) collect(option.content);
    if (question.group) {
      collect(question.group.instructions);
      collect(question.group.stimulus);
    }
  }

  // Every picture and sound must be a usable Hakgyo asset, or learners would get a broken item.
  const assets = assetIds.size
    ? await db.asset.findMany({
        where: {
          id: { in: [...assetIds] },
          organizationId: HAKGYO_SYSTEM_ORGANIZATION_ID,
          confirmedAt: { not: null },
          deletedAt: null,
        },
        select: { id: true },
      })
    : [];
  if (assets.length !== assetIds.size) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `${assetIds.size - assets.length} gambar atau audio di soal terpilih tidak tersedia. Periksa soalnya di bank, lalu buat pratinjau lagi.`,
    });
  }
  const linkedAssetIds = assets.map(({ id }) => id);

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
      const groups = [
        ...new Map(
          sources.flatMap(({ question }) =>
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
        assessmentId: assessment.id,
        groups,
        sectionIds,
        questions: sources.map(({ question, section }, position) => ({
          type: question.type,
          prompt: question.prompt,
          explanation: question.explanation,
          points: blueprint.pointsPerQuestion,
          position,
          tags: question.tags,
          sectionId: section,
          groupId: question.groupId,
          sourceQuestionId: question.id,
          options: (keyTargets.has(question.id)
            ? moveKeyTo(question.options, keyTargets.get(question.id)!)
            : question.options
          ).map((option, index) => ({ ...option, position: index })),
        })),
      });
      if (rows.groups.length) {
        await tx.assessmentQuestionGroup.createMany({ data: rows.groups });
      }
      await tx.assessmentQuestion.createMany({ data: rows.questions });
      await tx.assessmentOption.createMany({ data: rows.options });

      // Bank media stay Hakgyo's and are linked, not copied (section 3.1).
      if (linkedAssetIds.length) {
        await tx.asset.updateMany({
          where: { id: { in: linkedAssetIds }, sharedAt: null },
          data: { sharedAt: new Date() },
        });
        await tx.assessmentAsset.createMany({
          data: linkedAssetIds.map((assetId) => ({
            assessmentId: assessment.id,
            assetId,
            organizationId: input.organizationId,
            assetOrganizationId: HAKGYO_SYSTEM_ORGANIZATION_ID,
          })),
        });
      }

      await tx.assessmentGeneration.create({
        data: {
          assessmentId: assessment.id,
          organizationId: input.organizationId,
          blueprintKey: "eps-topik",
          blueprintVersion: blueprint.version,
          seed: input.seed,
          picks: toPrismaJsonValue({
            slots: selection.picks.map((pick) => ({
              number: pick.number,
              questionIds: pick.unit.questionIds,
              groupId: pick.unit.groupId,
            })),
            warnings: selection.warnings,
            swaps: [],
          }),
          createdByUserId: userId,
        },
      });
      return { assessmentId: assessment.id, title };
    }),
  );
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
