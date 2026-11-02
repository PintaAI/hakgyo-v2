// Assembles eps-demo-set.json from content.ts and media-manifest.json:
//   bun scripts/eps-demo-set/build.ts [--allow-missing-media]
//
// The JSON is an organization-independent copy of one assessment, in the shape createEpsSet
// (src/server/bank/packages.ts) writes: the blueprint's two sections, question groups, questions
// with tags and 2.5 points, options with the key, and BlockNote content. Media blocks hold the
// placeholder `eps-media:<key>` in `props.assetId`; an injector creates (or finds, by objectKey)
// the Asset row of the Hakgyo system organization for each `media` entry, marks it shared, swaps
// the placeholder for the asset id and links it with AssessmentAsset (assetOrganizationId =
// the system organization), exactly as generated sets link bank media.
import { writeFileSync } from "node:fs";
import path from "node:path";
import { epsTopikBlueprint } from "@hakgyo/shared";

import {
  groups,
  questions,
  set,
  type Inline,
  type OptionSpec,
  type Paragraph,
  type QuestionSpec,
} from "./content";
import { orderedOptions } from "./layout";
import {
  mediaItems,
  readManifest,
  specHash,
  type ManifestEntry,
} from "./media";

export const MEDIA_PLACEHOLDER_PREFIX = "eps-media:";
const outputPath = path.join(import.meta.dir, "eps-demo-set.json");
const allowMissing = process.argv.includes("--allow-missing-media");

const manifest = readManifest();
const expected = new Map(
  mediaItems().map((item) => [item.key, specHash(item)]),
);
const used = new Map<string, ManifestEntry>();
const missing: string[] = [];

function media(key: string): ManifestEntry | null {
  const entry = manifest[key];
  if (!entry || entry.specHash !== expected.get(key)) {
    missing.push(key);
    return null;
  }
  used.set(key, entry);
  return entry;
}

const text = (part: Inline) =>
  typeof part === "string"
    ? { type: "text", text: part, styles: {} }
    : {
        type: "text",
        text: part.text,
        styles: {
          ...(part.underline ? { underline: true } : {}),
          ...(part.bold ? { bold: true } : {}),
        },
      };

const paragraph = (parts: Paragraph | string) => ({
  type: "paragraph",
  content: (typeof parts === "string" ? [parts] : parts).map(text),
  children: [],
});

/**
 * A media block. `label` is what learners see above an audio player and the image's alt text
 * (the block's `fileName`); it never names the picture, so it cannot give the answer away.
 */
function assetBlock(
  type: "assetImage" | "assetAudio",
  key: string,
  label: string,
) {
  const entry = media(key);
  return {
    type,
    props: {
      assetId: `${MEDIA_PLACEHOLDER_PREFIX}${key}`,
      fileName: entry ? label : "",
      contentType: entry?.contentType ?? "",
      caption: "",
    },
    children: [],
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

function promptDocument(question: QuestionSpec) {
  const q = `q${pad(question.number)}`;
  return [
    ...(question.instruction ? [paragraph(question.instruction)] : []),
    ...(question.stem ?? []).map((stem) => paragraph(stem)),
    ...(question.promptImage
      ? [
          assetBlock(
            "assetImage",
            `${q}-prompt`,
            `Gambar soal ${question.number}`,
          ),
        ]
      : []),
    ...(question.script
      ? [
          assetBlock(
            "assetAudio",
            `${q}-audio`,
            `Audio soal ${question.number}`,
          ),
        ]
      : []),
  ];
}

function optionDocument(
  question: QuestionSpec,
  option: OptionSpec,
  authored: number,
) {
  const q = `q${pad(question.number)}`;
  if ("image" in option) {
    return [
      assetBlock("assetImage", `${q}-option-${authored}`, "Gambar pilihan"),
    ];
  }
  return [
    paragraph(option.text),
    ...(question.optionsReadAloud
      ? [
          assetBlock(
            "assetAudio",
            `${q}-option-${authored}-audio`,
            "Audio pilihan",
          ),
        ]
      : []),
  ];
}

const circled = ["①", "②", "③", "④"];

const sections = epsTopikBlueprint.sections.map((section, position) => ({
  key: section.key,
  position,
  title: section.title,
  instructions: [
    paragraph(section.instructions),
    ...(section.key === "listening"
      ? [paragraph("Audio dibuat dengan suara AI.")]
      : []),
  ],
  timeLimitSeconds: section.timeLimitSeconds,
  navigation: section.navigation,
  lockAnswers: section.lockAnswers,
  allowEarlyFinish: section.allowEarlyFinish,
  shuffleQuestions: false,
  audioMaxPlays: section.audioMaxPlays,
  audioAutoplay: section.audioAutoplay,
  audioRepeatGapSeconds: section.audioRepeatGapSeconds,
  pacedAnswerSeconds: section.pacedAnswerSeconds,
  pacedQuestionSeconds: null,
}));

const sectionOf = (number: number) => (number <= 20 ? "reading" : "listening");

const builtGroups = groups.map((group) => {
  const members = questions.filter((question) => question.group === group.key);
  return {
    key: group.key,
    section: sectionOf(members[0]!.number),
    questionNumbers: members.map((question) => question.number),
    instructions: [paragraph(group.instruction)],
    stimulus: [
      assetBlock(
        "assetAudio",
        `${group.key}-audio`,
        `Audio dialog soal ${members[0]!.number}–${members.at(-1)!.number}`,
      ),
    ],
    script: group.script,
  };
});

const builtQuestions = questions.map((question, position) => {
  const ordered = orderedOptions(question);
  const keyPosition = ordered.findIndex(({ authored }) => authored === 0);
  return {
    number: question.number,
    section: sectionOf(question.number),
    position,
    group: question.group ?? null,
    type: "SINGLE_CHOICE" as const,
    points: epsTopikBlueprint.pointsPerQuestion,
    tags: [
      `eps:${question.type}`,
      `level:${question.level}`,
      `topik:${question.topic}`,
    ],
    prompt: promptDocument(question),
    explanation: [paragraph(question.explanation)],
    options: ordered.map(({ option, authored }, index) => ({
      position: index,
      isCorrect: authored === 0,
      content: optionDocument(question, option, authored),
    })),
    answer: { position: keyPosition, label: circled[keyPosition] },
    script: question.script ?? null,
  };
});

if (missing.length && !allowMissing) {
  console.error(
    `${missing.length} media belum dibuat atau berubah: ${missing.join(", ")}\nJalankan media.ts dulu (atau --allow-missing-media untuk draf).`,
  );
  process.exit(1);
}

const output = {
  format: "hakgyo.assessment-set@1",
  key: set.key,
  version: set.version,
  generatedAt: new Date().toISOString(),
  blueprint: { key: "eps-topik", version: epsTopikBlueprint.version },
  mediaPlaceholderPrefix: MEDIA_PLACEHOLDER_PREFIX,
  assessment: {
    title: set.title,
    description: set.description,
    shuffleQuestions: false,
    shuffleOptions: false,
    scoreBands: epsTopikBlueprint.scoreBands,
    totalPoints: epsTopikBlueprint.pointsPerQuestion * questions.length,
  },
  sections,
  groups: builtGroups,
  questions: builtQuestions,
  answerKey: builtQuestions.map((question) => ({
    number: question.number,
    answer: question.answer.label,
  })),
  media: [...used.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((entry) => ({
      key: entry.key,
      kind: entry.kind,
      objectKey: entry.objectKey,
      publicUrl: entry.publicUrl,
      fileName: entry.fileName,
      contentType: entry.contentType,
      size: entry.size,
      sha256: entry.sha256,
      source: entry.source,
      ...(entry.description ? { description: entry.description } : {}),
      ...(entry.script ? { script: entry.script } : {}),
      ...(entry.durationSeconds
        ? { durationSeconds: entry.durationSeconds }
        : {}),
    })),
};

writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(
  `${outputPath}: ${builtQuestions.length} soal, ${builtGroups.length} grup, ${output.media.length} media${missing.length ? `, ${missing.length} media belum ada` : ""}.`,
);
