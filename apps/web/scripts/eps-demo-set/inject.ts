// Injects eps-demo-set.json into an organization as an ordinary assessment:
//   bun scripts/eps-demo-set/inject.ts --organization <id-or-slug> [--owner-email x] [--title "…"] [--dry-run]
//
// Mirrors createEpsSet (src/server/bank/packages.ts): media stay files of the Hakgyo system
// organization, marked shared and linked with AssessmentAsset, never copied. Each media entry's
// Asset row is found by objectKey (or created), the `eps-media:<key>` placeholders are swapped for
// asset ids, and everything is written in one transaction. Refuses when the organization already
// has an assessment with the same title.
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient, type Prisma } from "../../generated/prisma/client";
import { createId } from "~/server/batch";

const SYSTEM_ORGANIZATION_ID = "hakgyo-system-organization";

type Block = {
  type?: string;
  props?: Record<string, unknown>;
  children?: Block[];
};
type SetFile = {
  format: string;
  mediaPlaceholderPrefix: string;
  assessment: {
    title: string;
    description: string;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    scoreBands: unknown;
  };
  sections: Array<{
    key: string;
    position: number;
    title: string;
    instructions: Block[];
    timeLimitSeconds: number | null;
    navigation: "FREE" | "FORWARD_ONLY" | "PACED";
    lockAnswers: boolean;
    allowEarlyFinish: boolean;
    shuffleQuestions: boolean;
    audioMaxPlays: number | null;
    audioAutoplay: boolean;
    audioRepeatGapSeconds: number;
    pacedAnswerSeconds: number | null;
    pacedQuestionSeconds: number | null;
  }>;
  groups: Array<{ key: string; instructions: Block[]; stimulus: Block[] }>;
  questions: Array<{
    number: number;
    section: string;
    position: number;
    group: string | null;
    type: "SINGLE_CHOICE";
    points: number;
    tags: string[];
    prompt: Block[];
    explanation: Block[];
    options: Array<{ position: number; isCorrect: boolean; content: Block[] }>;
  }>;
  media: Array<{
    key: string;
    objectKey: string;
    fileName: string;
    contentType: string;
    size: number;
  }>;
};

const { values } = parseArgs({
  options: {
    organization: { type: "string" },
    "owner-email": { type: "string" },
    title: { type: "string" },
    file: { type: "string" },
    "dry-run": { type: "boolean", default: false },
    /** Delete the organization's assessment with the same title first (its public quiz goes with it). */
    replace: { type: "boolean", default: false },
  },
});
if (!values.organization) {
  console.error(
    "Pakai: --organization <id-or-slug> [--owner-email x] [--title …] [--dry-run]",
  );
  process.exit(1);
}

const file = values.file ?? path.join(import.meta.dir, "eps-demo-set.json");
const set = JSON.parse(readFileSync(file, "utf8")) as SetFile;
if (set.format !== "hakgyo.assessment-set@1")
  throw new Error(`Unknown format ${set.format}`);
const title = values.title ?? set.assessment.title;

/** Swaps every media placeholder in a BlockNote document for its asset id. */
function resolveMedia(
  document: Block[],
  assetIds: Map<string, string>,
): Block[] {
  return document.map((block) => {
    const id = block.props?.assetId;
    const next: Block = { ...block };
    if (typeof id === "string" && id.startsWith(set.mediaPlaceholderPrefix)) {
      const assetId = assetIds.get(id.slice(set.mediaPlaceholderPrefix.length));
      if (!assetId) throw new Error(`No asset for ${id}`);
      next.props = { ...block.props, assetId };
    }
    if (block.children?.length)
      next.children = resolveMedia(block.children, assetIds);
    return next;
  });
}

const json = (value: unknown) => value as Prisma.InputJsonValue;

const db = new PrismaClient({
  adapter: new PrismaNeon({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  }),
});

try {
  const organization = await db.organization.findFirst({
    where: { OR: [{ id: values.organization }, { slug: values.organization }] },
    select: { id: true, name: true, slug: true },
  });
  if (!organization)
    throw new Error(`Organisasi ${values.organization} tidak ditemukan.`);
  if (organization.id === SYSTEM_ORGANIZATION_ID) {
    throw new Error("Set dibuat untuk lembaga, bukan untuk organisasi Hakgyo.");
  }
  const member = await db.organizationMember.findFirst({
    where: {
      organizationId: organization.id,
      ...(values["owner-email"]
        ? { user: { email: values["owner-email"] } }
        : { role: "OWNER" }),
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, user: { select: { email: true } } },
  });
  if (!member) throw new Error("Anggota pembuat tidak ditemukan.");
  const existing = await db.assessment.findFirst({
    where: { organizationId: organization.id, title },
    select: { id: true },
  });
  if (existing && !values.replace) {
    throw new Error(
      `${organization.name} sudah punya tugas "${title}" (${existing.id}). Pakai --replace, --title lain, atau hapus dulu.`,
    );
  }
  if (existing) {
    // Only a set nobody has used may be replaced: learner attempts and course placements stay.
    const [attempts, placements] = await Promise.all([
      db.assessmentAttempt.count({ where: { assessmentId: existing.id } }),
      db.courseItem.count({ where: { assessmentId: existing.id } }),
    ]);
    if (attempts || placements) {
      throw new Error(
        `Tugas ${existing.id} sudah punya ${attempts} attempt dan ${placements} penempatan di kurikulum; tidak diganti.`,
      );
    }
    console.log(
      `--replace: tugas lama ${existing.id} (beserta quiz publiknya) akan dihapus.`,
    );
  }

  const known = await db.asset.findMany({
    where: { objectKey: { in: set.media.map((entry) => entry.objectKey) } },
    select: {
      id: true,
      objectKey: true,
      organizationId: true,
      deletedAt: true,
    },
  });
  const byKey = new Map(known.map((asset) => [asset.objectKey, asset]));
  for (const asset of known) {
    if (asset.organizationId !== SYSTEM_ORGANIZATION_ID || asset.deletedAt) {
      throw new Error(
        `Asset ${asset.objectKey} ada tapi bukan aset sistem yang aktif.`,
      );
    }
  }
  console.log(
    `${organization.name} (${organization.slug}) oleh ${member.user.email} (${member.role}): "${title}", ${set.questions.length} soal, ${set.media.length} media (${known.length} sudah ada di Asset).`,
  );
  if (values["dry-run"]) process.exit(0);

  const result = await db.$transaction(
    async (tx) => {
      const now = new Date();
      if (existing) await tx.assessment.delete({ where: { id: existing.id } });
      const assetIds = new Map<string, string>();
      for (const entry of set.media) {
        const asset =
          byKey.get(entry.objectKey) ??
          (await tx.asset.create({
            data: {
              organizationId: SYSTEM_ORGANIZATION_ID,
              objectKey: entry.objectKey,
              fileName: entry.fileName,
              contentType: entry.contentType,
              size: entry.size,
              confirmedAt: now,
              sharedAt: now,
            },
            select: {
              id: true,
              objectKey: true,
              organizationId: true,
              deletedAt: true,
            },
          }));
        assetIds.set(entry.key, asset.id);
      }
      await tx.asset.updateMany({
        where: { id: { in: [...assetIds.values()] }, sharedAt: null },
        data: { sharedAt: now },
      });

      const assessment = await tx.assessment.create({
        data: {
          organizationId: organization.id,
          createdByMembershipId: member.id,
          title,
          description: set.assessment.description,
          shuffleQuestions: set.assessment.shuffleQuestions,
          shuffleOptions: set.assessment.shuffleOptions,
          scoreBands: json(set.assessment.scoreBands),
        },
        select: { id: true },
      });
      const sectionIds = new Map<string, string>();
      for (const section of set.sections) {
        const { key, instructions, ...data } = section;
        const created = await tx.assessmentSection.create({
          data: {
            ...data,
            assessmentId: assessment.id,
            instructions: json(instructions),
          },
          select: { id: true },
        });
        sectionIds.set(key, created.id);
      }
      const groupIds = new Map(
        set.groups.map((group) => [group.key, createId()]),
      );
      if (set.groups.length) {
        await tx.assessmentQuestionGroup.createMany({
          data: set.groups.map((group) => ({
            id: groupIds.get(group.key)!,
            assessmentId: assessment.id,
            instructions: json(resolveMedia(group.instructions, assetIds)),
            stimulus: json(resolveMedia(group.stimulus, assetIds)),
          })),
        });
      }
      const questionIds = set.questions.map(() => createId());
      await tx.assessmentQuestion.createMany({
        data: set.questions.map((question, index) => ({
          id: questionIds[index]!,
          assessmentId: assessment.id,
          type: question.type,
          prompt: json(resolveMedia(question.prompt, assetIds)),
          explanation: json(resolveMedia(question.explanation, assetIds)),
          points: question.points,
          position: question.position,
          tags: question.tags,
          sectionId: sectionIds.get(question.section)!,
          groupId: question.group ? groupIds.get(question.group)! : null,
        })),
      });
      await tx.assessmentOption.createMany({
        data: set.questions.flatMap((question, index) =>
          question.options.map((option) => ({
            questionId: questionIds[index]!,
            content: json(resolveMedia(option.content, assetIds)),
            isCorrect: option.isCorrect,
            position: option.position,
          })),
        ),
      });
      await tx.assessmentAsset.createMany({
        data: [...new Set(assetIds.values())].map((assetId) => ({
          assessmentId: assessment.id,
          assetId,
          organizationId: organization.id,
          assetOrganizationId: SYSTEM_ORGANIZATION_ID,
        })),
        skipDuplicates: true,
      });
      return { assessmentId: assessment.id, assets: assetIds.size };
    },
    { timeout: 60_000, maxWait: 20_000 },
  );
  console.log(
    `Selesai: tugas ${result.assessmentId}, ${result.assets} media tertaut.\nBuka: /workspace/${organization.slug}/library/assessments`,
  );
} finally {
  await db.$disconnect();
}
