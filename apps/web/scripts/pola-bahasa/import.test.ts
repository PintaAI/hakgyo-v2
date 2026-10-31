import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "bun:test";

import {
  POLA_INDO_KOREA_COURSE_ID,
  POLA_KOREA_INDO_COURSE_ID,
} from "../../src/server/foundation/constants";
import { canonicalJson } from "../hangeul-mastery/ids";
import {
  b,
  callout,
  chat,
  culture,
  ex,
  grammar,
  h3,
  opener,
  p,
  ref,
  table,
  type BabContent,
  type BlockNoteBlock,
  type QuizContent,
  type VocabularyContent,
} from "./blocks";
import { buildCurricula, manifestErrors } from "./curriculum";
import {
  blockId,
  courseId,
  materialId,
  materialItemId,
  moduleId,
  quizId,
  quizItemId,
  quizOptionId,
  quizQuestionId,
  vocabularyEntryId,
  vocabularyItemId,
  vocabularySetId,
} from "./ids";
import { isMissingFileProblem, loadPolaContent } from "./load-content";
import {
  POLA_BABS,
  POLA_MATERIALS,
  type PolaBabKey,
  type PolaMaterialKey,
} from "./manifest";
import { planHasChanges, planImport, type Snapshot } from "./plan";
import { blockNoteRoundTripIssues } from "./roundtrip";

const MATERIAL_KEYS = Object.keys(POLA_MATERIALS) as PolaMaterialKey[];
const ORG = "hakgyo-system-organization";
const FIRST_BAB = POLA_BABS[0];
const IK_BAB = POLA_BABS.find((bab) => bab.course === "indo-korea")!;

function quizContent(count = 8): QuizContent {
  return {
    title: "Kuis bab",
    description: "Cek pemahamanmu.",
    questions: Array.from({ length: count }, (_, index) => ({
      key: `soal-${index + 1}`,
      prompt: `Soal ${index + 1}: pilih yang benar`,
      options: [
        { text: "비가 오는데", correct: true },
        { text: "비가 와서" },
        { text: "비가 오니까" },
      ],
      explanation: "-는데 kasih latar, bestie.",
    })),
  };
}

function vocabularyContent(bab: (typeof POLA_BABS)[number]): VocabularyContent {
  return {
    title: `Kosakata ${bab.title}`,
    description: "Pola bab ini.",
    entries: bab.materials.map((material) => ({
      term: `-${material.key}`,
      meanings: ["arti satu", " arti dua "],
      example: {
        ko: "비가 오는데 우산이 없어요.",
        id: "Hujan, padahal nggak ada payung.",
      },
    })),
  };
}

/** A valid grammar card for `key`, in its course's color. */
function card(
  key: PolaMaterialKey,
  overrides: Partial<Parameters<typeof grammar>[0]> = {},
): BlockNoteBlock {
  return grammar({
    number: "01",
    title: "-는데",
    descriptionKo: "배경을 말해요.",
    descriptionTranslation: "Kasih latar dulu.",
    rules: [
      { condition: "Kata kerja", form: "-는데", example: "가다 → 가는데" },
      { condition: "Kata sifat", form: "-(으)ㄴ데", example: "싸다 → 싼데" },
    ],
    examples: [
      { before: "비가 오", emphasis: "는데", after: " 우산이 없어요." },
      { before: "배고픈", emphasis: "데", after: " 밥 먹을래요?" },
    ],
    theme: POLA_MATERIALS[key].course === "indo-korea" ? "blue" : "amber",
    ...overrides,
  });
}

/** Minimal valid content for every chapter; each material links to the next material. */
function fixture(): Map<PolaBabKey, BabContent> {
  const babs = new Map<PolaBabKey, BabContent>();
  for (const bab of POLA_BABS) {
    babs.set(bab.key, {
      key: bab.key,
      materials: Object.fromEntries(
        bab.materials.map((material) => {
          const index = MATERIAL_KEYS.indexOf(material.key);
          const next = MATERIAL_KEYS[(index + 1) % MATERIAL_KEYS.length]!;
          return [
            material.key,
            {
              description: `About ${material.key}`,
              blocks: [
                card(material.key),
                p("Lihat ", ref("pola berikutnya", next), "."),
                { ...h3("Contoh"), children: [p("nested")] },
                ex("비가 와요.", "Hujan."),
              ],
            },
          ];
        }),
      ),
      vocabulary: vocabularyContent(bab),
      quiz: quizContent(),
    });
  }
  return babs;
}

/** The fixture with one chapter changed. */
function withBab(key: PolaBabKey, change: (bab: BabContent) => BabContent) {
  const babs = fixture();
  babs.set(key, change(babs.get(key)!));
  return babs;
}

/**
 * The fixture with one material's blocks replaced. A valid grammar card is
 * put first unless the blocks already start with one (or `bare` is set).
 */
function withBlocks(
  key: PolaMaterialKey,
  given: BlockNoteBlock[],
  { bare = false } = {},
) {
  const startsWithCard =
    !Array.isArray(given[0]) && given[0]?.type === "grammar";
  const blocks = bare || startsWithCard ? given : [card(key), ...given];
  const bab = POLA_MATERIALS[key].bab;
  return withBab(bab, (content) => ({
    ...content,
    materials: {
      ...content.materials,
      [key]: { ...content.materials[key]!, blocks },
    },
  }));
}

/** A copy of `row` without `keys`. */
function omit<T extends object, K extends keyof T>(row: T, ...keys: K[]) {
  const copy = { ...row };
  for (const key of keys) delete copy[key];
  return copy as Omit<T, K>;
}

const errorsOf = (babs: Map<PolaBabKey, BabContent>) =>
  buildCurricula(babs).errors;

function expectError(babs: Map<PolaBabKey, BabContent>, pattern: RegExp) {
  const { errors } = buildCurricula(babs);
  expect(errors.some((error) => pattern.test(error))).toBe(true);
}

// ---------------------------------------------------------------- ids and manifest

describe("ids", () => {
  test("follow the documented derivations", () => {
    expect(courseId("korea-indo")).toBe("pb-korea-indo");
    expect(moduleId("ki-01-kata-sambung")).toBe("pb-ki-01-kata-sambung");
    expect(materialId("ki-geurigo")).toBe("pb-ki-geurigo-material");
    expect(materialItemId("ki-geurigo")).toBe("pb-ki-geurigo-item");
    expect(blockId("ki-geurigo", 3)).toBe("pb-ki-geurigo-b3");
    expect(vocabularySetId("ki-01-kata-sambung")).toBe(
      "pb-ki-01-kata-sambung-vocab",
    );
    expect(vocabularyItemId("ki-01-kata-sambung")).toBe(
      "pb-ki-01-kata-sambung-vocab-item",
    );
    expect(vocabularyEntryId("ki-01-kata-sambung", "ki-geurigo")).toBe(
      "pb-ki-01-kata-sambung-v-ki-geurigo",
    );
    expect(quizId("ki-01-kata-sambung")).toBe("pb-ki-01-kata-sambung-quiz");
    expect(quizItemId("ki-01-kata-sambung")).toBe(
      "pb-ki-01-kata-sambung-quiz-item",
    );
    expect(quizQuestionId("ki-01-kata-sambung", "soal-1")).toBe(
      "pb-ki-01-kata-sambung-quiz-q-soal-1",
    );
    const question = quizQuestionId("ki-01-kata-sambung", "soal-1");
    expect(quizOptionId(question, " 비가  오는데 ")).toBe(
      quizOptionId(question, "비가 오는데"),
    );
    expect(quizOptionId(question, "비가 와서")).not.toBe(
      quizOptionId(question, "비가 오는데"),
    );
  });

  test("match the course id constants the server uses", () => {
    expect(courseId("korea-indo")).toBe(POLA_KOREA_INDO_COURSE_ID);
    expect(courseId("indo-korea")).toBe(POLA_INDO_KOREA_COURSE_ID);
  });

  test("the manifest is consistent", () => {
    expect(manifestErrors()).toEqual([]);
  });
});

// ---------------------------------------------------------------- assembly

describe("buildCurricula", () => {
  const result = buildCurricula(fixture());

  test("the fixture builds", () => {
    expect(result.errors).toEqual([]);
    expect(result.missing).toEqual([]);
    expect(result.materials.map((row) => row.key)).toEqual(MATERIAL_KEYS);
    expect(result.vocabularySets).toHaveLength(POLA_BABS.length);
    expect(result.assessments).toHaveLength(POLA_BABS.length);
  });

  test("materials take their title from the manifest, with the star", () => {
    const geurigo = result.materials.find((row) => row.key === "ki-geurigo")!;
    expect(geurigo.title).toBe("그리고 • dan, terus · ★");
    expect(geurigo.description).toBe("About ki-geurigo");
    const plain = result.materials.find((row) => row.key === "ki-geureonikka")!;
    expect(plain.title).toBe("그러니까 • makanya, jadi gini");
  });

  test("numbers blocks in document order and resolves refs into material links", () => {
    const material = result.materials.find((row) => row.key === "ki-geurigo")!;
    expect(material.id).toBe("pb-ki-geurigo-material");
    expect(material.content.map((block) => block.id)).toEqual([
      "pb-ki-geurigo-b1",
      "pb-ki-geurigo-b2",
      "pb-ki-geurigo-b3",
      "pb-ki-geurigo-b5",
    ]);
    expect(material.content[0]!.type).toBe("grammar");
    expect(material.content[2]!.children![0]!.id).toBe("pb-ki-geurigo-b4");
    expect(JSON.stringify(material.content)).toContain(
      '"href":"hakgyo-material:pb-ki-geuraeseo-material"',
    );
    expect(JSON.stringify(material.content)).not.toContain("pola-ref:");
    expect(result.links).toHaveLength(MATERIAL_KEYS.length);
    expect(result.unlinkedMaterials).toEqual([]);
  });

  test("is deterministic and leaves the content untouched", () => {
    const babs = fixture();
    const before = canonicalJson([...babs]);
    const first = buildCurricula(babs);
    expect(canonicalJson([...babs])).toBe(before);
    expect(canonicalJson(buildCurricula(babs))).toBe(canonicalJson(first));
  });

  test("builds both courses: a module per chapter, materials then vocabulary then quiz", () => {
    expect(result.courses.map((row) => row.id)).toEqual([
      "pb-korea-indo",
      "pb-indo-korea",
    ]);
    for (const course of result.courses) {
      expect(course).toMatchObject({
        status: "PUBLISHED",
        progressionMode: "OPEN",
        enrollmentMode: "INVITE_ONLY",
        price: 0,
        slug: `pola-${course.key}`,
      });
      const babs = POLA_BABS.filter((bab) => bab.course === course.key);
      expect(course.modules.map((row) => row.id)).toEqual(
        babs.map((bab) => `pb-${bab.key}`),
      );
      expect(course.modules.map((row) => row.position)).toEqual(
        babs.map((_, index) => index),
      );
    }
    const first = result.courses[0]!.modules[0]!;
    expect(first.title).toBe(FIRST_BAB.title);
    expect(
      first.items.map((item) => [item.id, item.type, item.position]),
    ).toEqual([
      ...FIRST_BAB.materials.map((material, index) => [
        `pb-${material.key}-item`,
        "MATERIAL",
        index,
      ]),
      [
        `pb-${FIRST_BAB.key}-vocab-item`,
        "VOCABULARY_SET",
        FIRST_BAB.materials.length,
      ],
      [
        `pb-${FIRST_BAB.key}-quiz-item`,
        "ASSESSMENT",
        FIRST_BAB.materials.length + 1,
      ],
    ]);
    expect(first.items.every((item) => item.isPublished)).toBe(true);
    expect(first.items.at(-2)!.vocabularySetId).toBe(
      `pb-${FIRST_BAB.key}-vocab`,
    );
    expect(first.items.at(-1)!.assessmentId).toBe(`pb-${FIRST_BAB.key}-quiz`);
  });

  test("builds a vocabulary set with one entry per material, as the app stores entries", () => {
    const set = result.vocabularySets[0]!;
    expect(set.id).toBe(`pb-${FIRST_BAB.key}-vocab`);
    expect(set.title).toBe(`Kosakata ${FIRST_BAB.title}`);
    expect(set.entries.map((entry) => entry.id)).toEqual(
      FIRST_BAB.materials.map(
        (material) => `pb-${FIRST_BAB.key}-v-${material.key}`,
      ),
    );
    expect(set.entries[0]).toMatchObject({
      vocabularySetId: set.id,
      term: "-ki-geurigo",
      meanings: ["arti satu", "arti dua"],
      definition: "arti satu; arti dua",
      examples: [
        "비가 오는데 우산이 없어요. = Hujan, padahal nggak ada payung.",
      ],
    });
    const times = set.entries.map((entry) => entry.createdAt.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(new Set(times).size).toBe(times.length);
  });

  test("builds the chapter quiz with stable question and option ids", () => {
    const quiz = result.assessments[0]!;
    expect(quiz).toMatchObject({
      id: `pb-${FIRST_BAB.key}-quiz`,
      passingScore: 70,
      shuffleOptions: true,
      shuffleQuestions: false,
      maxAttempts: null,
    });
    expect(quiz.questions).toHaveLength(8);
    const question = quiz.questions[0]!;
    expect(question.id).toBe(`pb-${FIRST_BAB.key}-quiz-q-soal-1`);
    expect(question.type).toBe("SINGLE_CHOICE");
    expect(question.options[0]!.id).toBe(
      quizOptionId(question.id, "비가 오는데"),
    );
    expect(question.options.filter((option) => option.isCorrect)).toHaveLength(
      1,
    );
  });

  test("lists missing chapters and refuses to build them", () => {
    const babs = fixture();
    babs.delete(FIRST_BAB.key);
    const partial = buildCurricula(babs);
    expect(partial.missing).toEqual([FIRST_BAB.key]);
    expect(partial.materials.some((row) => row.key === "ki-geurigo")).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------- validation

describe("chapter validation", () => {
  test("every manifest material needs a body, and no extras", () => {
    expectError(
      withBab(FIRST_BAB.key, (bab) => {
        return { ...bab, materials: omit(bab.materials, "ki-geurigo") };
      }),
      /material ki-geurigo has no body/,
    );
    expectError(
      withBab(FIRST_BAB.key, (bab) => ({
        ...bab,
        materials: { ...bab.materials, "ki-go": bab.materials["ki-geurigo"] },
      })),
      /materials not in this chapter of manifest\.ts: ki-go/,
    );
    expectError(
      withBab(FIRST_BAB.key, (bab) => ({
        ...bab,
        key: "ki-02-penyambung-dasar",
      })),
      /declares key "ki-02-penyambung-dasar"/,
    );
    expectError(
      withBab(FIRST_BAB.key, (bab) => ({
        ...bab,
        materials: {
          ...bab.materials,
          "ki-geurigo": { description: " ", blocks: [] },
        },
      })),
      /ki-geurigo: description is empty/,
    );
  });

  test("the vocabulary set has exactly one complete entry per material", () => {
    const vocabulary = (
      change: (
        entries: VocabularyContent["entries"],
      ) => VocabularyContent["entries"],
    ) =>
      withBab(FIRST_BAB.key, (bab) => ({
        ...bab,
        vocabulary: {
          ...bab.vocabulary,
          entries: change(bab.vocabulary.entries),
        },
      }));
    expectError(
      vocabulary((entries) => entries.slice(1)),
      /needs exactly one per material/,
    );
    expectError(
      vocabulary((entries) =>
        entries.map((entry, i) => (i ? entry : { ...entry, term: " " })),
      ),
      /entry 1 \(ki-geurigo\): term is empty/,
    );
    expectError(
      vocabulary((entries) =>
        entries.map((entry, i) => (i ? entry : { ...entry, meanings: [" "] })),
      ),
      /meanings are empty/,
    );
    expectError(
      vocabulary((entries) =>
        entries.map((entry, i) =>
          i ? entry : { ...entry, example: { ko: "", id: "x" } },
        ),
      ),
      /example needs Korean/,
    );
    const duplicate = buildCurricula(
      vocabulary((entries) =>
        entries.map((entry) => ({ ...entry, term: "-는데" })),
      ),
    );
    expect(duplicate.errors).toEqual([]);
    expect(
      duplicate.warnings.some((warning) => warning.includes("is also entry 1")),
    ).toBe(true);
  });

  test("the quiz has 8-12 single-choice questions with one correct option and an explanation", () => {
    const quiz = (change: (quiz: QuizContent) => QuizContent) =>
      withBab(FIRST_BAB.key, (bab) => ({ ...bab, quiz: change(bab.quiz) }));
    expect(errorsOf(quiz(() => quizContent(12)))).toEqual([]);
    expectError(
      quiz(() => quizContent(7)),
      /quiz has 7 questions \(8-12\)/,
    );
    expectError(
      quiz(() => quizContent(13)),
      /quiz has 13 questions/,
    );
    const first = (
      change: (
        question: QuizContent["questions"][number],
      ) => QuizContent["questions"][number],
    ) =>
      quiz((content) => ({
        ...content,
        questions: content.questions.map((question, i) =>
          i ? question : change(question),
        ),
      }));
    expectError(
      first((q) => ({ ...q, options: q.options.slice(0, 2) })),
      /has 2 options \(3-4\)/,
    );
    expectError(
      first((q) => ({
        ...q,
        options: [...q.options, { text: "d" }, { text: "e" }],
      })),
      /has 5 options/,
    );
    expectError(
      first((q) => ({
        ...q,
        options: q.options.map((o) => ({ ...o, correct: true })),
      })),
      /exactly one correct option \(has 3\)/,
    );
    expectError(
      first((q) => ({ ...q, explanation: "" })),
      /explanation is empty/,
    );
    expectError(
      first((q) => ({ ...q, type: "MULTIPLE_CHOICE" })),
      /SINGLE_CHOICE only/,
    );
    expectError(
      first((q) => ({ ...q, key: "soal-2" })),
      /key is used twice/,
    );
    expectError(
      first((q) => ({ ...q, key: "Soal 1" })),
      /key must be kebab-case/,
    );
    expectError(
      first((q) => ({
        ...q,
        options: [{ text: "a", correct: true }, { text: " a " }, { text: "b" }],
      })),
      /two options have the same text/,
    );
  });

  test("refs must name a manifest material, without anchors", () => {
    expectError(
      withBlocks("ki-geurigo", [
        p("x ", { text: "nope", ref: "pola-ref:ki-nope" }),
      ]),
      /link "nope": unknown material "ki-nope"/,
    );
    expectError(
      withBlocks("ki-geurigo", [
        p("x ", { text: "anchor", ref: "pola-ref:ki-go#intro" }),
      ]),
      /malformed link/,
    );
    expectError(
      withBlocks("ki-geurigo", [
        p("x ", { text: "raw", ref: "hakgyo-material:pb-ki-go-material" }),
      ]),
      /uses a hakgyo-material: href/,
    );
    expectError(
      withBlocks("ki-geurigo", [p({ text: "", ref: "pola-ref:ki-go" })]),
      /a link has no text/,
    );
  });

  test("follows the per-material rules of STYLE.md", () => {
    const focus = { label: "a", title: "b", description: "c" };
    expectError(
      withBlocks("ki-geurigo", [
        opener({
          eyebrow: "x",
          chapterNumber: "01",
          titleKo: "x",
          subtitle: "x",
          question: "x",
          answer: "x",
          focus: [focus, focus, focus],
          objectives: [
            { ko: "x", id: "x" },
            { ko: "x", id: "x" },
          ],
        }),
      ]),
      /opener\(\) \(lessonPage\)/,
    );
    expectError(
      withBlocks("ki-geurigo", [
        { type: "heading", props: { level: 2 }, content: [] },
      ]),
      /level-2 heading/,
    );
    expectError(
      withBlocks("ki-geurigo", [
        { type: "assessmentReference", props: { assessmentId: "x" } },
      ]),
      /embedded assessment/,
    );
    const cultureBlock = culture({
      titleKo: "반말",
      titleId: "Banmal",
      paragraphs: [{ ko: "친구한테 써요.", id: "Ke teman." }],
    });
    expectError(
      withBlocks("ki-geurigo", [cultureBlock]),
      /only ki-banmal-kapan may use one/,
    );
    expect(
      errorsOf(withBlocks("ki-banmal-kapan", [p("Halo"), cultureBlock])),
    ).toEqual([]);
    expectError(
      withBlocks("ki-banmal-kapan", [cultureBlock, cultureBlock]),
      /2 culture\(\) blocks/,
    );
    expectError(withBlocks("ki-geurigo", [p("TODO tulis")]), /draft marker/);
    expectError(
      withBlocks("ki-geurigo", [[p("a")] as unknown as BlockNoteBlock]),
      /spread it/,
    );
    expectError(
      withBlocks("ki-geurigo", [
        grammar({
          number: "01",
          title: "",
          descriptionKo: "a",
          descriptionTranslation: "b",
        }),
      ]),
      /grammar card needs a title/,
    );
  });

  test("requires exactly one grammar card first, in the course color", () => {
    expectError(
      withBlocks("ki-geurigo", [p("Halo")], { bare: true }),
      /ki-geurigo: must start with a grammar\(\) card/,
    );
    expectError(
      withBlocks("ki-geurigo", [card("ki-geurigo"), card("ki-geurigo")]),
      /2 grammar\(\) cards/,
    );
    expectError(
      withBlocks("ki-geurigo", [card("ki-geurigo", { theme: "blue" })]),
      /theme is "blue"; korea-indo uses "amber"/,
    );
    const ikKey = IK_BAB.materials[0].key as PolaMaterialKey;
    expectError(
      withBlocks(ikKey, [card(ikKey, { theme: "amber" })]),
      /theme is "amber"; indo-korea uses "blue"/,
    );
    const rule = { condition: "a", form: "b", example: "c" };
    expectError(
      withBlocks("ki-geurigo", [
        card("ki-geurigo", { rules: Array.from({ length: 7 }, () => rule) }),
      ]),
      /7 rule rows \(1 to 6\)/,
    );
    expectError(
      withBlocks("ki-geurigo", [
        card("ki-geurigo", {
          examples: [{ before: "a", emphasis: "b", after: "c" }],
        }),
      ]),
      /1 examples \(2 to 4\)/,
    );
  });

  test("warns about long materials and wide tables", () => {
    const long = buildCurricula(
      withBlocks(
        "ki-geurigo",
        Array.from({ length: 18 }, (_, i) => p(`baris ${i}`)),
      ),
    );
    expect(long.errors).toEqual([]);
    expect(
      long.warnings.some((w) => w.includes("ki-geurigo: has 19 blocks")),
    ).toBe(true);
    const ikKey = IK_BAB.materials[0].key as PolaMaterialKey;
    const three = table([
      ["Korea", "Nuansa", "Contoh"],
      [ref("-는데", "ki-neunde"), "latar", "x"],
    ]);
    const ik = buildCurricula(withBlocks(ikKey, [three]));
    expect(ik.errors).toEqual([]);
    expect(
      ik.warnings.some((w) => w.startsWith(`${ikKey}: a table has 3 columns`)),
    ).toBe(true);
    const ki = buildCurricula(withBlocks("ki-geurigo", [three]));
    expect(ki.warnings.some((w) => w.includes("table"))).toBe(false);
    const four = table([["a", "b", "c", "d"]]);
    expect(
      buildCurricula(withBlocks("ki-geurigo", [four])).warnings.some((w) =>
        w.includes("4 columns"),
      ),
    ).toBe(true);
  });
});

describe("BlockNote round trip", () => {
  test("an assembled material with the custom blocks loads unchanged", () => {
    const babs = withBlocks("ki-banmal-kapan", [
      card("ki-banmal-kapan"),
      p(b("Artinya apa sih? "), "Latar."),
      h3("Contoh"),
      ex("비가 오는데요.", "Hujan nih."),
      ...chat([{ who: "A", ko: "안녕", id: "Halo" }]),
      culture({
        titleKo: "반말",
        titleId: "Banmal",
        paragraphs: [{ ko: "가", id: "b" }],
      }),
      table([
        ["Korea", "Nuansa"],
        [ref("-는데", "ki-neunde"), "latar"],
      ]),
      callout("tip", "Cek ", ref("padahal", "ik-padahal-hasil"), "."),
    ]);
    const result = buildCurricula(babs);
    expect(result.errors).toEqual([]);
    const material = result.materials.find(
      (row) => row.key === "ki-banmal-kapan",
    )!;
    expect(blockNoteRoundTripIssues(material.content)).toEqual([]);
  });

  test("reports props, text and links BlockNote would change", () => {
    expect(
      blockNoteRoundTripIssues([
        {
          id: "a",
          type: "callout",
          props: { tone: "tip", extra: 1 },
          content: [],
        },
      ]),
    ).toEqual(["a: prop extra is not in the schema (dropped)"]);
    expect(
      blockNoteRoundTripIssues([
        {
          id: "b",
          type: "paragraph",
          content: [{ type: "mention", text: "x" }],
        },
      ])[0],
    ).toContain("BlockNote cannot load the document");
  });
});

// ---------------------------------------------------------------- loading

describe("loadPolaContent", () => {
  test("names missing, broken and unknown files and index.ts gaps", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pola-content-"));
    try {
      const [first, second] = POLA_BABS;
      writeFileSync(
        join(dir, `${first.key}.ts`),
        `export default ${JSON.stringify({ key: first.key, materials: {}, vocabulary: {}, quiz: {} })};`,
      );
      writeFileSync(join(dir, `${second.key}.ts`), "export default 42;");
      writeFileSync(join(dir, "ki-old.ts"), "export default {};");
      writeFileSync(join(dir, "index.ts"), `import a from "./${first.key}";`);
      const loaded = await loadPolaContent(dir);
      expect([...loaded.babs.keys()]).toEqual([first.key]);
      expect(loaded.problems).toContain(
        `content/${POLA_BABS[2].key}.ts is missing`,
      );
      expect(loaded.problems).toContain(
        `content/${second.key}.ts must \`export default defineBab({ key, materials, vocabulary, quiz })\``,
      );
      expect(
        loaded.problems.some((row) =>
          row.startsWith("content/ki-old.ts is not a chapter"),
        ),
      ).toBe(true);
      expect(loaded.problems).toContain(
        `content/index.ts does not import ./${second.key}`,
      );
      expect(loaded.problems).not.toContain(
        `content/index.ts does not import ./${first.key}`,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------- plan

function emptySnapshot(): Snapshot {
  return {
    organizationId: ORG,
    courses: [],
    modules: [],
    items: [],
    materials: [],
    vocabularySets: [],
    entries: [],
    assessments: [],
    questions: [],
    options: [],
    placements: [],
  };
}

type Built = ReturnType<typeof buildCurricula>;

const NO_LEARNER_DATA = {
  progress: 0,
  attempts: 0,
  events: 0,
  practiceAttempts: 0,
};

/** What the database holds after importing (what loadSnapshot reads back), with jsonb key order scrambled. */
function snapshotOf({
  courses,
  materials,
  vocabularySets,
  assessments,
}: Built): Snapshot {
  const snapshot = emptySnapshot();
  const reorder = (value: unknown): unknown =>
    JSON.parse(canonicalJson(value), (_key, node: unknown) =>
      node && typeof node === "object" && !Array.isArray(node)
        ? Object.fromEntries(Object.entries(node).reverse())
        : node,
    );
  for (const course of courses) {
    snapshot.courses.push({
      id: course.id,
      organizationId: ORG,
      title: course.title,
      slug: course.slug,
      description: course.description,
      status: course.status,
      progressionMode: course.progressionMode,
      enrollmentMode: course.enrollmentMode,
      price: course.price,
      enrollmentCount: 0,
    });
    for (const row of course.modules) {
      snapshot.modules.push({
        id: row.id,
        courseId: row.courseId,
        title: row.title,
        description: row.description,
        position: row.position,
        meetingCount: 0,
      });
      for (const item of row.items) {
        snapshot.items.push({
          id: item.id,
          moduleId: item.moduleId,
          courseId: course.id,
          type: item.type,
          position: item.position,
          materialId: item.materialId,
          vocabularySetId: item.vocabularySetId,
          assessmentId: item.assessmentId,
          isPublished: item.isPublished,
          learnerData: { ...NO_LEARNER_DATA },
        });
        snapshot.placements.push({
          itemId: item.id,
          courseId: course.id,
          materialId: item.materialId,
          vocabularySetId: item.vocabularySetId,
          assessmentId: item.assessmentId,
        });
      }
    }
  }
  for (const material of materials) {
    snapshot.materials.push({
      ...omit(material, "key"),
      content: reorder(material.content),
      organizationId: ORG,
    });
  }
  for (const set of vocabularySets) {
    snapshot.vocabularySets.push({
      ...omit(set, "key", "entries"),
      organizationId: ORG,
      requirementCount: 0,
    });
    for (const entry of set.entries) {
      snapshot.entries.push({
        ...entry,
        examples: reorder(entry.examples),
        createdAt: new Date(entry.createdAt),
        progressCount: 0,
        practiceCount: 0,
      });
    }
  }
  for (const assessment of assessments) {
    snapshot.assessments.push({
      ...omit(assessment, "key", "questions"),
      organizationId: ORG,
      attemptCount: 0,
      requirementCount: 0,
      publicQuiz: false,
    });
    for (const { options, ...question } of assessment.questions) {
      snapshot.questions.push({
        ...question,
        prompt: reorder(question.prompt),
        explanation: reorder(question.explanation),
        answerCount: 0,
      });
      for (const option of options) {
        snapshot.options.push({
          ...option,
          content: reorder(option.content),
          selectionCount: 0,
        });
      }
    }
  }
  return snapshot;
}

/** The old structure already in production: a module, a long material, its item and its quiz. */
function withOldStructure(snapshot: Snapshot): Snapshot {
  const course = "pb-korea-indo";
  return {
    ...snapshot,
    modules: [
      ...snapshot.modules,
      {
        id: "pb-ki-sambung",
        courseId: course,
        title: "Nyambungin kalimat",
        description: null,
        position: 0,
        meetingCount: 0,
      },
    ],
    items: [
      ...snapshot.items,
      ...(
        ["pb-ki-kata-sambung-item", "pb-ki-kata-sambung-quiz-item"] as const
      ).map((id, position) => ({
        id,
        moduleId: "pb-ki-sambung",
        courseId: course,
        type: position ? "ASSESSMENT" : "MATERIAL",
        position,
        materialId: position ? null : "pb-ki-kata-sambung-material",
        vocabularySetId: null,
        assessmentId: position ? "pb-ki-kata-sambung-quiz" : null,
        isPublished: true,
        learnerData: { ...NO_LEARNER_DATA },
      })),
    ],
    placements: [
      ...snapshot.placements,
      {
        itemId: "pb-ki-kata-sambung-item",
        courseId: course,
        materialId: "pb-ki-kata-sambung-material",
        vocabularySetId: null,
        assessmentId: null,
      },
      {
        itemId: "pb-ki-kata-sambung-quiz-item",
        courseId: course,
        materialId: null,
        vocabularySetId: null,
        assessmentId: "pb-ki-kata-sambung-quiz",
      },
    ],
    materials: [
      ...snapshot.materials,
      {
        id: "pb-ki-kata-sambung-material",
        organizationId: ORG,
        title: "Kata sambung",
        description: null,
        content: [],
        editorSchemaVersion: 1,
      },
    ],
    assessments: [
      ...snapshot.assessments,
      {
        id: "pb-ki-kata-sambung-quiz",
        organizationId: ORG,
        title: "Kuis lama",
        description: null,
        instructions: null,
        passingScore: 70,
        maxAttempts: null,
        timeLimitMinutes: null,
        shuffleQuestions: false,
        shuffleOptions: true,
        editorSchemaVersion: 1,
        attemptCount: 0,
        requirementCount: 0,
        publicQuiz: false,
      },
    ],
    questions: [
      ...snapshot.questions,
      {
        id: "pb-ki-kata-sambung-quiz-q-soal-1",
        assessmentId: "pb-ki-kata-sambung-quiz",
        type: "SINGLE_CHOICE",
        prompt: [],
        explanation: null,
        points: 1,
        position: 0,
        answerCount: 0,
      },
    ],
    options: [
      ...snapshot.options,
      {
        id: "pb-ki-kata-sambung-quiz-q-soal-1-o-abc",
        questionId: "pb-ki-kata-sambung-quiz-q-soal-1",
        content: [],
        isCorrect: true,
        position: 0,
        selectionCount: 0,
      },
    ],
  };
}

describe("planImport", () => {
  const built = buildCurricula(fixture());
  const plan = (snapshot: Snapshot) =>
    planImport(
      built.courses,
      built.materials,
      built.vocabularySets,
      built.assessments,
      snapshot,
    );

  test("creates everything on an empty database", () => {
    const result = plan(emptySnapshot());
    expect(result.errors).toEqual([]);
    expect(result.courses.create).toHaveLength(2);
    expect(result.modules.create).toHaveLength(POLA_BABS.length);
    expect(result.materials.create).toHaveLength(MATERIAL_KEYS.length);
    expect(result.vocabularySets.create).toHaveLength(POLA_BABS.length);
    expect(result.entries.create).toHaveLength(MATERIAL_KEYS.length);
    expect(result.assessments.create).toHaveLength(POLA_BABS.length);
    expect(result.items.create).toHaveLength(
      MATERIAL_KEYS.length + 2 * POLA_BABS.length,
    );
    // Rows carry no helper keys Prisma would reject.
    expect("key" in result.materials.create[0]!).toBe(false);
    expect("key" in result.items.create[0]!).toBe(false);
    expect("entries" in result.vocabularySets.create[0]!).toBe(false);
    expect(planHasChanges(result)).toBe(true);
  });

  test("a second run changes nothing", () => {
    const result = plan(snapshotOf(built));
    expect(result.errors).toEqual([]);
    expect(planHasChanges(result)).toBe(false);
  });

  test("updates only the fields that differ", () => {
    const snapshot = snapshotOf(built);
    snapshot.materials[0] = { ...snapshot.materials[0]!, title: "old" };
    snapshot.entries[0] = {
      ...snapshot.entries[0]!,
      definition: "old",
      examples: ["old"],
    };
    snapshot.items[0] = { ...snapshot.items[0]!, isPublished: false };
    const result = plan(snapshot);
    expect(result.materials.update).toEqual([
      {
        id: built.materials[0]!.id,
        data: { title: built.materials[0]!.title },
        fields: ["title"],
      },
    ]);
    expect(result.entries.update[0]!.fields).toEqual([
      "definition",
      "examples",
    ]);
    expect(result.items.update[0]!.fields).toEqual(["isPublished"]);
    expect(result.courses.update).toEqual([]);
  });

  test("deletes the old structure when it holds no learner data", () => {
    const result = plan(withOldStructure(snapshotOf(built)));
    expect(result.errors).toEqual([]);
    expect(result.modules.remove.map((row) => row.id)).toEqual([
      "pb-ki-sambung",
    ]);
    expect(result.items.remove.map((row) => row.id)).toEqual([
      "pb-ki-kata-sambung-item",
      "pb-ki-kata-sambung-quiz-item",
    ]);
    expect(result.materials.remove.map((row) => row.id)).toEqual([
      "pb-ki-kata-sambung-material",
    ]);
    expect(result.assessments.remove.map((row) => row.id)).toEqual([
      "pb-ki-kata-sambung-quiz",
    ]);
    // The old quiz's questions and options go with it (cascade), they are not removed one by one.
    expect(result.questions.remove).toEqual([]);
    expect(result.options.remove).toEqual([]);
    expect(planHasChanges(result)).toBe(true);
  });

  test("refuses deletions that would lose learner data", () => {
    const old = withOldStructure(snapshotOf(built));
    const refuses = (snapshot: Snapshot, pattern: RegExp) => {
      const { errors } = plan(snapshot);
      expect(errors.some((error) => pattern.test(error))).toBe(true);
    };
    refuses(
      {
        ...old,
        items: old.items.map((row) =>
          row.id === "pb-ki-kata-sambung-item"
            ? { ...row, learnerData: { ...NO_LEARNER_DATA, progress: 2 } }
            : row,
        ),
      },
      /item pb-ki-kata-sambung-item .* learner data \(2 progress\)/,
    );
    refuses(
      {
        ...old,
        assessments: old.assessments.map((row) =>
          row.id === "pb-ki-kata-sambung-quiz"
            ? { ...row, attemptCount: 1 }
            : row,
        ),
      },
      /assessment pb-ki-kata-sambung-quiz .* 1 learner attempts/,
    );
    refuses(
      {
        ...old,
        courses: old.courses.map((row) => ({ ...row, enrollmentCount: 3 })),
      },
      /course pb-korea-indo has 3 enrollments, so the import deletes nothing/,
    );
    refuses(
      {
        ...old,
        modules: old.modules.map((row) =>
          row.id === "pb-ki-sambung" ? { ...row, meetingCount: 1 } : row,
        ),
      },
      /module pb-ki-sambung .* 1 cohort meetings/,
    );
    refuses(
      {
        ...old,
        placements: [
          ...old.placements,
          {
            itemId: "copy-item",
            courseId: "someone-elses-course",
            materialId: "pb-ki-kata-sambung-material",
            vocabularySetId: null,
            assessmentId: null,
          },
        ],
      },
      /material pb-ki-kata-sambung-material .* placed by item copy-item of someone-elses-course/,
    );
    // Enrollments alone do not block an import that deletes nothing.
    const enrolled = snapshotOf(built);
    enrolled.courses = enrolled.courses.map((row) => ({
      ...row,
      enrollmentCount: 3,
    }));
    expect(plan(enrolled).errors).toEqual([]);
  });

  test("removes vocabulary entries, questions and options the content dropped, unless learners used them", () => {
    const snapshot = snapshotOf(built);
    const setId = built.vocabularySets[0]!.id;
    const questionId = built.assessments[0]!.questions[0]!.id;
    snapshot.entries.push({
      id: `${setId.replace(/-vocab$/, "")}-v-ki-gone`,
      vocabularySetId: setId,
      term: "gone",
      meanings: ["x"],
      definition: "x",
      examples: [],
      createdAt: new Date(0),
      progressCount: 0,
      practiceCount: 0,
    });
    snapshot.questions.push({
      ...snapshot.questions[0]!,
      id: `${built.assessments[0]!.id}-q-gone`,
      position: 99,
    });
    snapshot.options.push({
      ...snapshot.options[0]!,
      id: `${questionId}-o-oldtext`,
      position: 99,
    });
    const result = plan(snapshot);
    expect(result.errors).toEqual([]);
    expect(result.entries.remove.map((row) => row.title)).toEqual(["gone"]);
    expect(result.questions.remove.map((row) => row.id)).toEqual([
      `${built.assessments[0]!.id}-q-gone`,
    ]);
    expect(result.options.remove.map((row) => row.id)).toEqual([
      `${questionId}-o-oldtext`,
    ]);

    snapshot.entries.at(-1)!.progressCount = 4;
    snapshot.options.at(-1)!.selectionCount = 1;
    const refused = plan(snapshot).errors.join("\n");
    expect(refused).toContain(
      '"gone" is no longer in the set but has learner data (4 progress)',
    );
    expect(refused).toContain("learners chose it 1 times");
  });

  test("never deletes rows outside the Pola courses or without the pb- prefix", () => {
    const snapshot = snapshotOf(built);
    snapshot.materials.push(
      {
        id: "pb-elsewhere-material",
        organizationId: "another-org",
        title: "x",
        description: null,
        content: [],
        editorSchemaVersion: 1,
      },
      {
        id: "hm-m1-material",
        organizationId: ORG,
        title: "x",
        description: null,
        content: [],
        editorSchemaVersion: 1,
      },
    );
    snapshot.modules.push({
      id: "pb-other",
      courseId: "hangeul-mastery",
      title: "x",
      description: null,
      position: 0,
      meetingCount: 0,
    });
    const result = plan(snapshot);
    expect(result.errors).toEqual([]);
    expect(planHasChanges(result)).toBe(false);
  });

  test("refuses id and slug collisions", () => {
    const snapshot = snapshotOf(built);
    snapshot.courses.push({
      ...snapshot.courses[0]!,
      id: "another-course",
      slug: "pola-korea-indo",
    });
    snapshot.assessments[0] = {
      ...snapshot.assessments[0]!,
      organizationId: "another-org",
    };
    snapshot.modules[0] = { ...snapshot.modules[0]!, courseId: "elsewhere" };
    const text = plan(snapshot).errors.join("\n");
    expect(text).toContain('already uses the slug "pola-korea-indo"');
    expect(text).toContain(
      `assessment ${built.assessments[0]!.id} exists in organization another-org`,
    );
    expect(text).toContain(
      `module ${built.courses[0]!.modules[0]!.id} exists in course elsewhere`,
    );
  });
});

// ---------------------------------------------------------------- real content

describe("real content", () => {
  test("every chapter file that exists loads and validates", async () => {
    const loaded = await loadPolaContent();
    // Missing files are reported by `pola:validate`; anything else is a broken file.
    expect(
      loaded.problems.filter((problem) => !isMissingFileProblem(problem)),
    ).toEqual([]);
    const result = buildCurricula(loaded.babs);
    expect(result.errors).toEqual([]);
    expect(
      result.materials.flatMap((material) =>
        blockNoteRoundTripIssues(material.content).map(
          (issue) => `${material.key}: ${issue}`,
        ),
      ),
    ).toEqual([]);
  });
});
