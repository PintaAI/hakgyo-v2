// Checks the authored set before any media is made:
//   bun scripts/eps-demo-set/verify-content.ts [--blind]
// Structure against the blueprint (the editor's own check), topic runs, key spread, option and
// explanation rules, and with --blind a blind test: another model answers every question without
// the key and says which options it finds plausible.
import {
  checkBlueprint,
  epsTopikBlueprint,
  fitsBlueprint,
} from "@hakgyo/shared";
import { epsTypeByTag } from "@hakgyo/shared/eps-taxonomy";

import { groups, questions, type QuestionSpec } from "./content";
import {
  groupInstruction,
  keyTarget,
  optionText,
  orderedOptions,
  paragraphText,
  scriptText,
} from "./layout";
import { templateText } from "./templates";

const problems: string[] = [];
const warn = (message: string) => problems.push(message);

const tags = (question: QuestionSpec) => [
  `eps:${question.type}`,
  `level:${question.level}`,
  `topik:${question.topic}`,
];

// 1. Numbers, sections and the blueprint check.
const numbers = questions.map((question) => question.number);
if (numbers.join() !== Array.from({ length: 40 }, (_, i) => i + 1).join()) {
  warn(`Numbers are not 1..40 in order: ${numbers.join(",")}`);
}
const sections = [
  questions.filter((question) => question.number <= 20),
  questions.filter((question) => question.number > 20),
];
const report = checkBlueprint(
  epsTopikBlueprint,
  sections.map((section) =>
    section.map((question) => ({
      id: String(question.number),
      tags: tags(question),
    })),
  ),
);
for (const section of report) {
  for (const issue of section.issues) {
    warn(`Blueprint ${section.title}: ${JSON.stringify(issue)}`);
  }
  if (!section.workShareOk) {
    warn(`${section.title}: work share ${section.workShare}`);
  }
  console.log(
    `${section.title}: ${section.found}/${section.expected} soal, topik kerja ${Math.round(section.workShare * 100)}%`,
  );
}

// 2. Types exist, groups fit the blueprint, sections hold the right types.
for (const question of questions) {
  const type = epsTypeByTag(`eps:${question.type}`);
  if (!type) warn(`Q${question.number}: unknown type ${question.type}`);
  if (type && question.number <= 20 !== (type.section === "reading")) {
    warn(`Q${question.number}: ${question.type} in the wrong section`);
  }
  if (type?.audio !== "none" && !question.script && !question.group) {
    warn(`Q${question.number}: listening type without a script`);
  }
  if (
    type &&
    (type.audio === "prompt-and-options") !== Boolean(question.optionsReadAloud)
  ) {
    warn(`Q${question.number}: optionsReadAloud does not match ${type.code}`);
  }
  if (type && type.optionsAreImages !== "image" in question.options[0]) {
    warn(`Q${question.number}: picture options do not match ${type.code}`);
  }
  if (!question.instruction && !question.group) {
    warn(`Q${question.number}: no instruction line`);
  }
}
for (const group of groups) {
  const members = questions.filter((question) => question.group === group.key);
  if (
    !fitsBlueprint(
      epsTopikBlueprint,
      members.map((q) => `eps:${q.type}`),
    )
  ) {
    warn(`Group ${group.key} does not fit the blueprint`);
  }
  const positions = members.map((question) => question.number);
  if (positions.some((n, i) => i > 0 && n !== positions[i - 1]! + 1)) {
    warn(`Group ${group.key} is not consecutive`);
  }
}

// 3. No three same-topic questions in a row, per section.
for (const section of sections) {
  section.forEach((question, index) => {
    if (
      index >= 2 &&
      question.topic === section[index - 1]!.topic &&
      question.topic === section[index - 2]!.topic
    ) {
      warn(`Q${question.number}: third ${question.topic} in a row`);
    }
  });
}

// 4. Keys: about five per position per section.
for (const [index, section] of sections.entries()) {
  const counts = [0, 0, 0, 0];
  for (const question of section) counts[keyTarget(question.number)]! += 1;
  console.log(
    `Kunci ${index ? "Mendengar" : "Membaca"}: ${counts.join(" / ")}`,
  );
  if (counts.some((count) => count !== 5))
    warn(`Key spread ${counts.join("/")}`);
}

// 5. Options and explanations.
const hangul = /[가-힣ᄀ-ᇿ㄰-㆏]/;
for (const question of questions) {
  const texts = question.options.map(optionText);
  if (new Set(texts).size !== 4) warn(`Q${question.number}: duplicate options`);
  if (!("image" in question.options[0])) {
    const lengths = texts.map((text) => text.length);
    if (
      Math.max(...lengths) > 2.2 * Math.min(...lengths) &&
      Math.max(...lengths) > 6
    ) {
      warn(
        `Q${question.number}: option lengths vary a lot (${lengths.join(",")})`,
      );
    }
    // The key should not stand out as the longest option.
    const longest = Math.max(...lengths);
    if (
      lengths[0] === longest &&
      lengths.filter((l) => l === longest).length === 1 &&
      longest - lengths.sort((a, b) => b - a)[1]! > 4
    ) {
      warn(`Q${question.number}: the key is clearly the longest option`);
    }
  }
  const explanation = question.explanation;
  if (
    /[①②③④]|(?:jawaban|pilihan|opsi|nomor|no\.)\s*[1-4]\b|\b[1-4]\s*번/i.test(
      explanation,
    )
  ) {
    warn(`Q${question.number}: explanation names an option by number`);
  }
  const outsideQuotes = explanation
    .replace(/'[^']*'/g, "")
    .replace(/\([^)]*\)/g, "");
  if (hangul.test(outsideQuotes)) {
    warn(
      `Q${question.number}: Korean outside quotes or brackets in the explanation`,
    );
  }
  const sentences = explanation.split(/(?<=[.!?])\s+/).filter(Boolean).length;
  if (sentences > 3)
    warn(`Q${question.number}: explanation has ${sentences} sentences`);
}

console.log(
  problems.length ? `\n${problems.length} masalah:` : "\nStruktur OK.",
);
for (const problem of problems) console.log(`- ${problem}`);

// 6. Blind test.
if (process.argv.includes("--blind")) {
  const model = process.env.BLIND_MODEL ?? "gpt-5.4";
  const describe = (question: QuestionSpec) => {
    const lines: string[] = [];
    const instruction = question.instruction ?? groupInstruction(question);
    if (question.group)
      lines.push(`[그룹 지시문] ${groupInstruction(question)}`);
    if (question.instruction) lines.push(question.instruction);
    for (const paragraph of question.stem ?? [])
      lines.push(paragraphText(paragraph));
    if (question.promptImage) {
      lines.push(
        `[그림] ${question.promptImage.kind === "ai" ? question.promptImage.brief : templateText(question.promptImage)}`,
      );
    }
    const script = scriptText(question);
    if (script) lines.push(`[듣기 대본]\n${script}`);
    orderedOptions(question).forEach(({ option }, index) => {
      lines.push(
        `${index + 1}. ${"image" in option ? `[그림: ${option.image.kind === "ai" ? option.image.brief : templateText(option.image)}]` : optionText(option)}`,
      );
    });
    void instruction;
    return lines.join("\n");
  };
  const batch = questions.map((question) => ({
    number: question.number,
    text: describe(question),
  }));
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["answers"],
    properties: {
      answers: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["number", "answer", "plausible", "note"],
          properties: {
            number: { type: "integer" },
            answer: { type: "integer", minimum: 1, maximum: 4 },
            plausible: {
              type: "array",
              items: { type: "integer", minimum: 1, maximum: 4 },
            },
            note: { type: "string" },
          },
        },
      },
    },
  };
  const instructions = [
    "You are a strict EPS-TOPIK examiner and native Korean speaker.",
    "For each numbered question, pick the single best option (1-4).",
    "In plausible, list every option a careful native speaker could defend as correct (always include your answer).",
    "Pictures are described in brackets; [듣기 대본] is the audio the learner hears; [brackets] inside an option mark underlined text.",
    "In note, point out in English anything wrong: unnatural or incorrect Korean, ambiguity, two defensible answers, a key that can be guessed without the stimulus, or wrong facts. Leave it empty when the question is fine.",
  ].join("\n");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions,
      input: batch.map((q) => `### ${q.number}\n${q.text}`).join("\n\n"),
      text: {
        format: { type: "json_schema", name: "answers", strict: true, schema },
      },
    }),
  });
  if (!response.ok) {
    throw new Error(
      `Blind test failed (${response.status}): ${await response.text()}`,
    );
  }
  const data = (await response.json()) as {
    output: Array<{
      type: string;
      content?: Array<{ type: string; text?: string }>;
    }>;
  };
  const text = data.output
    .flatMap((item) => item.content ?? [])
    .find((part) => part.type === "output_text")?.text;
  const answers = (
    JSON.parse(text ?? "{}") as {
      answers: Array<{
        number: number;
        answer: number;
        plausible: number[];
        note: string;
      }>;
    }
  ).answers;
  let flagged = 0;
  console.log(`\nUji jawab buta (${model}):`);
  for (const question of questions) {
    const answer = answers.find((entry) => entry.number === question.number);
    const key = keyTarget(question.number) + 1;
    const wrong = answer?.answer !== key;
    const extra = answer?.plausible.filter((option) => option !== key) ?? [];
    if (wrong || extra.length || answer?.note.trim()) {
      flagged += 1;
      console.log(
        `- Q${question.number} kunci ${key}, jawab ${answer?.answer ?? "-"}, masuk akal [${answer?.plausible.join(",") ?? ""}]${answer?.note ? `: ${answer.note}` : ""}`,
      );
    }
  }
  console.log(
    flagged
      ? `${flagged} soal perlu dilihat.`
      : "Semua soal dijawab benar tanpa catatan.",
  );
}
