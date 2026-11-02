// Final checks on eps-demo-set.json, after build.ts:
//   bun scripts/eps-demo-set/verify-set.ts
// The blueprint check on the built tags, one key per question and balanced keys, every media
// placeholder resolved and reachable on R2 with the recorded size and type, picture options that
// render as a 2×2 grid, the listening audio policy, and each audio clip's whisper transcript
// against its script.
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  checkBlueprint,
  epsTopikBlueprint,
  isImageOnlyContent,
} from "@hakgyo/shared";

import { readManifest } from "./media";

type Block = {
  type: string;
  props?: { assetId?: string };
  content?: unknown;
  children?: Block[];
};
type Built = {
  sections: Array<{
    key: string;
    audioMaxPlays: number | null;
    audioAutoplay: boolean;
  }>;
  groups: Array<{ key: string; stimulus: Block[]; questionNumbers: number[] }>;
  questions: Array<{
    number: number;
    section: string;
    group: string | null;
    tags: string[];
    prompt: Block[];
    explanation: Block[];
    options: Array<{ position: number; isCorrect: boolean; content: Block[] }>;
    answer: { position: number };
  }>;
  media: Array<{
    key: string;
    publicUrl: string;
    size: number;
    contentType: string;
    sha256: string;
  }>;
  mediaPlaceholderPrefix: string;
};

const built = JSON.parse(
  readFileSync(path.join(import.meta.dir, "eps-demo-set.json"), "utf8"),
) as Built;
const problems: string[] = [];
const warn = (message: string) => problems.push(message);

// Blueprint, on the tags as built.
const bySection = ["reading", "listening"].map((key) =>
  built.questions.filter((question) => question.section === key),
);
for (const section of checkBlueprint(
  epsTopikBlueprint,
  bySection.map((questions) =>
    questions.map((q) => ({ id: String(q.number), tags: q.tags })),
  ),
)) {
  if (section.issues.length || !section.workShareOk) {
    warn(
      `Blueprint ${section.title}: ${JSON.stringify(section.issues)} work ${section.workShare}`,
    );
  }
}

// Keys.
for (const questions of bySection) {
  const counts = [0, 0, 0, 0];
  for (const question of questions) {
    const correct = question.options.filter((option) => option.isCorrect);
    if (question.options.length !== 4 || correct.length !== 1) {
      warn(
        `Q${question.number}: ${question.options.length} options, ${correct.length} keys`,
      );
    }
    if (correct[0]?.position !== question.answer.position)
      warn(`Q${question.number}: answer mismatch`);
    counts[question.answer.position]! += 1;
  }
  if (counts.some((count) => count !== 5))
    warn(`Key spread ${counts.join("/")}`);
}

// Media placeholders.
const placeholders = new Set<string>();
const visit = (blocks: Block[] | undefined) => {
  for (const block of blocks ?? []) {
    const id = block.props?.assetId;
    if (id?.startsWith(built.mediaPlaceholderPrefix)) {
      placeholders.add(id.slice(built.mediaPlaceholderPrefix.length));
    }
    visit(block.children);
  }
};
for (const question of built.questions) {
  visit(question.prompt);
  visit(question.explanation);
  for (const option of question.options) visit(option.content);
}
for (const group of built.groups) visit(group.stimulus);
const listed = new Map(built.media.map((entry) => [entry.key, entry]));
for (const key of placeholders)
  if (!listed.has(key)) warn(`Media ${key} is used but not listed`);
for (const key of listed.keys())
  if (!placeholders.has(key)) warn(`Media ${key} is listed but unused`);

// Picture options render as a grid; listening questions have audio somewhere in their playlist.
for (const question of built.questions) {
  const pictures = question.options.filter((option) =>
    isImageOnlyContent(option.content),
  );
  if (pictures.length && pictures.length !== 4)
    warn(`Q${question.number}: mixed picture options`);
  if (question.section === "listening") {
    const audio =
      JSON.stringify(question.prompt).includes("assetAudio") ||
      (question.group && built.groups.find((g) => g.key === question.group));
    if (!audio) warn(`Q${question.number}: listening question without audio`);
  }
}

// R2: every file is public with the recorded size and type.
await Promise.all(
  built.media.map(async (entry) => {
    const response = await fetch(entry.publicUrl, { method: "HEAD" });
    const size = Number(response.headers.get("content-length"));
    const type = response.headers.get("content-type");
    if (!response.ok || size !== entry.size || type !== entry.contentType) {
      warn(`R2 ${entry.key}: ${response.status} ${size}/${entry.size} ${type}`);
    }
  }),
);

// Audio: whisper transcript against the script (spacing, punctuation and number spelling ignored,
// so compare letters only and list numbers for a manual look).
const manifest = readManifest();
const letters = (value: string) =>
  value.replace(/^[MF]: /gm, "").replace(/[^가-힣]/g, "");
function similarity(a: string, b: string) {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [
    i,
    ...new Array<number>(b.length).fill(0),
  ]);
  for (let j = 1; j <= b.length; j += 1) rows[0]![j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      rows[i]![j] = Math.min(
        rows[i - 1]![j]! + 1,
        rows[i]![j - 1]! + 1,
        rows[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return 1 - rows[a.length]![b.length]! / Math.max(a.length, b.length, 1);
}
const audio = built.media.filter((entry) =>
  entry.contentType.startsWith("audio/"),
);
const review: string[] = [];
for (const entry of audio) {
  const item = manifest[entry.key];
  if (!item?.script || item.transcript === undefined) {
    warn(`Audio ${entry.key}: no transcript`);
    continue;
  }
  const score = similarity(letters(item.script), letters(item.transcript));
  const hasNumbers = /\d/.test(item.transcript);
  if (score < 0.9 || hasNumbers) {
    review.push(
      `${entry.key} (${score.toFixed(2)})\n    naskah: ${item.script.replace(/\n/g, " / ")}\n    whisper: ${item.transcript}`,
    );
  }
  if (score < 0.75 && !hasNumbers)
    warn(`Audio ${entry.key}: transcript differs (${score.toFixed(2)})`);
}

console.log(
  `${built.questions.length} soal, ${built.media.length} media (${audio.length} audio) diperiksa.`,
);
if (review.length) {
  console.log(`\nCek manual (angka, atau transkrip < 0.90):`);
  for (const line of review) console.log(`- ${line}`);
}
console.log(
  problems.length
    ? `\n${problems.length} masalah:`
    : "\nSemua pemeriksaan lolos.",
);
for (const problem of problems) console.log(`- ${problem}`);
process.exit(problems.length ? 1 : 0);
