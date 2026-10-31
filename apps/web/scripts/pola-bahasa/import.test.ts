import { describe, expect, test } from "bun:test";

import {
  POLA_INDO_KOREA_COURSE_ID,
  POLA_KOREA_INDO_COURSE_ID,
} from "../../src/server/foundation/constants";
import {
  b,
  chat,
  culture,
  grammar,
  h3,
  opener,
  p,
  quizRef,
  ref,
  table,
  type BlockNoteBlock,
  type MaterialContent,
  type QuizContent,
} from "./blocks";
import { canonicalJson } from "../hangeul-mastery/ids";
import { buildCurricula, manifestErrors } from "./curriculum";
import {
  blockId,
  courseId,
  itemId,
  materialId,
  moduleId,
  quizId,
  quizItemId,
  quizOptionId,
  quizQuestionId,
  sectionBlockId,
} from "./ids";
import { loadPolaContent } from "./load-content";
import { POLA_MATERIALS, type PolaMaterialKey } from "./manifest";
import { planHasChanges, planImport, type Snapshot } from "./plan";
import { blockNoteRoundTripIssues } from "./roundtrip";

const KEYS = Object.keys(POLA_MATERIALS) as PolaMaterialKey[];

/** Minimal valid content for every manifest material; each section links to the next material's first section. */
function fixture(): Map<PolaMaterialKey, MaterialContent> {
  const contents = new Map<PolaMaterialKey, MaterialContent>();
  KEYS.forEach((key, index) => {
    const next = KEYS[(index + 1) % KEYS.length]!;
    const nextSection = POLA_MATERIALS[next].sections[0];
    contents.set(key, {
      key,
      title: `Title ${key}`,
      description: `About ${key}`,
      intro: [openerBlock(), p("Halo, ", b("bestie"), ".")],
      sections: (POLA_MATERIALS[key].sections as readonly string[]).map(
        (section) =>
          ({
            key: section,
            title: `Section ${section}`,
            blocks: [
              p("Lihat ", {
                text: "pola berikutnya",
                ref: `pola-ref:${next}#${nextSection}`,
              }),
              { ...h3("Contoh"), children: [p("nested")] },
            ],
          }) as MaterialContent["sections"][number],
      ),
      outro: [p("Selesai.")],
    });
  });
  return contents;
}

function openerBlock() {
  const focus = { label: "문법", title: "-는데", description: "latar" };
  return opener({
    eyebrow: "PAHAM POLA · BAB 1",
    chapterNumber: "01",
    titleKo: "이유와 순서",
    subtitle: "Nyambungin kalimat",
    question: "왜 늦었어요?",
    answer: "버스가 안 와서 늦었어요.",
    focus: [focus, focus, focus],
    objectives: [
      { ko: "이유를 말할 수 있다.", id: "Bisa bilang alasan." },
      { ko: "순서를 말할 수 있다.", id: "Bisa bilang urutan." },
    ],
  });
}

function quizContent(count = 5): QuizContent {
  return {
    title: "Kuis -는데",
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

/** The fixture with a quiz (and its quizRef() in the outro) for one material. */
function withQuiz(key: PolaMaterialKey, quiz: QuizContent = quizContent()) {
  return withMaterial(key, (content) => ({
    ...content,
    outro: [...(content.outro ?? []), quizRef()],
    quiz,
  }));
}

function withMaterial(
  key: PolaMaterialKey,
  change: (content: MaterialContent) => MaterialContent,
) {
  const contents = fixture();
  contents.set(key, change(structuredClone(contents.get(key)!)));
  return contents;
}

function cardInput() {
  return {
    number: "01",
    title: "-는데",
    descriptionKo: "배경을 말해요.",
    descriptionTranslation: "Buat kasih latar.",
  };
}

describe("ids", () => {
  test("follow the documented derivations", () => {
    expect(courseId("korea-indo")).toBe("pb-korea-indo");
    expect(moduleId("ki-sambung")).toBe("pb-ki-sambung");
    expect(materialId("ik-padahal")).toBe("pb-ik-padahal-material");
    expect(itemId("ik-padahal")).toBe("pb-ik-padahal-item");
    expect(sectionBlockId("ik-padahal", "hasil")).toBe("pb-ik-padahal--hasil");
    expect(blockId("ik-padahal", "hasil", 3)).toBe("pb-ik-padahal--hasil-b3");
  });

  test("match the course id constants the server uses", () => {
    expect(courseId("korea-indo")).toBe(POLA_KOREA_INDO_COURSE_ID);
    expect(courseId("indo-korea")).toBe(POLA_INDO_KOREA_COURSE_ID);
  });

  test("the manifest is consistent", () => {
    expect(manifestErrors()).toEqual([]);
  });
});

describe("buildCurricula", () => {
  test("assembles intro, a level-2 heading per section, and outro", () => {
    const result = buildCurricula(fixture());
    expect(result.errors).toEqual([]);
    expect(result.missing).toEqual([]);
    const material = result.materials.find(
      (row) => row.id === "pb-ik-padahal-material",
    )!;
    const ids = material.content.map((block) => block.id);
    expect(ids.slice(0, 6)).toEqual([
      "pb-ik-padahal--intro-b1",
      "pb-ik-padahal--intro-b2",
      "pb-ik-padahal--hasil",
      "pb-ik-padahal--hasil-b1",
      "pb-ik-padahal--hasil-b2",
      "pb-ik-padahal--protes",
    ]);
    expect(material.content[0]!.type).toBe("lessonPage");
    expect(material.content[2]).toMatchObject({
      type: "heading",
      props: { level: 2 },
      content: [{ type: "text", text: "Section hasil" }],
    });
    expect(material.content[4]!.children![0]!.id).toBe(
      "pb-ik-padahal--hasil-b3",
    );
    expect(material.content.at(-1)!.id).toBe("pb-ik-padahal--outro-b1");
    expect(material.editorSchemaVersion).toBe(1);
  });

  test("resolves refs into material links with section anchors", () => {
    const result = buildCurricula(fixture());
    const material = result.materials.find(
      (row) => row.id === "pb-ki-kata-sambung-material",
    )!;
    const paragraph = material.content[3]!;
    expect(paragraph.content).toContainEqual({
      type: "link",
      href: "hakgyo-material:pb-ki-alasan-urutan-material#pb-ki-alasan-urutan--go",
      content: [{ type: "text", text: "pola berikutnya", styles: {} }],
    });
    expect(JSON.stringify(result.materials)).not.toContain("pola-ref:");
  });

  test("resolves whole-material refs and refs in table cells", () => {
    const contents = withMaterial("ik-padahal", (content) => {
      content.sections[0]!.blocks.push(
        table([["Pola"], [ref("-는데", "ki-alasan-urutan")]]),
      );
      return content;
    });
    const result = buildCurricula(contents);
    expect(result.errors).toEqual([]);
    expect(JSON.stringify(result.materials)).toContain(
      '"href":"hakgyo-material:pb-ki-alasan-urutan-material"',
    );
  });

  test("is deterministic and leaves the content untouched", () => {
    const contents = fixture();
    const before = canonicalJson([...contents.values()]);
    const first = buildCurricula(contents);
    const second = buildCurricula(contents);
    expect(canonicalJson(first.materials)).toBe(
      canonicalJson(second.materials),
    );
    expect(canonicalJson([...contents.values()])).toBe(before);
  });

  test("builds both courses with ordered modules and one item per material", () => {
    const { courses } = buildCurricula(fixture());
    expect(courses.map((row) => row.id)).toEqual([
      "pb-korea-indo",
      "pb-indo-korea",
    ]);
    const koreaIndo = courses[0]!;
    expect(koreaIndo).toMatchObject({
      status: "PUBLISHED",
      enrollmentMode: "INVITE_ONLY",
      price: 0,
      slug: "pola-korea-indo",
    });
    expect(koreaIndo.modules.map((row) => row.id)).toEqual([
      "pb-ki-sambung",
      "pb-ki-modal",
      "pb-ki-rasa",
      "pb-ki-santai",
    ]);
    expect(koreaIndo.modules[0]!.items.map((row) => row.id)).toEqual([
      "pb-ki-kata-sambung-item",
      "pb-ki-alasan-urutan-item",
      "pb-ki-waktu-sebab-item",
    ]);
    const items = courses.flatMap((course) =>
      course.modules.flatMap((row) => row.items),
    );
    expect(items).toHaveLength(KEYS.length);
    expect(
      items.every((item) => item.isPublished && item.type === "MATERIAL"),
    ).toBe(true);
    expect(items.every((item) => item.assessmentId === null)).toBe(true);
  });

  test("lists missing materials and sections nothing links to", () => {
    const contents = fixture();
    contents.delete("ik-andai");
    const result = buildCurricula(contents);
    expect(result.missing).toEqual(["ik-andai"]);
    expect(result.errors).toEqual([]);
    // Only first sections are linked by the fixture.
    expect(result.unlinkedSections).toContain("ki-kata-sambung#geuraeseo");
    expect(result.unlinkedSections).not.toContain("ki-alasan-urutan#go");
  });

  const expectError = (
    contents: Map<PolaMaterialKey, MaterialContent>,
    pattern: RegExp,
  ) => {
    const { errors, materials } = buildCurricula(contents);
    expect(errors.some((error) => pattern.test(error))).toBe(true);
    return materials;
  };

  test("rejects sections that differ from the manifest", () => {
    expectError(
      withMaterial("ik-padahal", (content) => ({
        ...content,
        sections: [...content.sections].reverse(),
      })),
      /ik-padahal: sections are out of order/,
    );
    expectError(
      withMaterial("ik-padahal", (content) => ({
        ...content,
        sections: content.sections.slice(1),
      })),
      /ik-padahal: missing sections hasil/,
    );
    const materials = expectError(
      withMaterial("ik-padahal", (content) => {
        content.sections[0]!.blocks = [];
        return content;
      }),
      /ik-padahal#hasil: has no blocks/,
    );
    expect(materials.some((row) => row.id === "pb-ik-padahal-material")).toBe(
      false,
    );
  });

  test("rejects a key that does not match the file and empty titles", () => {
    expectError(
      withMaterial("ik-padahal", (content) => ({
        ...content,
        key: "ik-andai",
      })),
      /declares key "ik-andai"/,
    );
    expectError(
      withMaterial("ik-padahal", (content) => ({ ...content, title: " " })),
      /ik-padahal: title is empty/,
    );
  });

  test("rejects refs that do not resolve and hand-written material hrefs", () => {
    expectError(
      withMaterial("ik-padahal", (content) => {
        content.sections[0]!.blocks.push(
          p({ text: "x", ref: "pola-ref:ki-nope#go" }),
          p({ text: "y", ref: "pola-ref:ki-alasan-urutan#nope" }),
          p({ text: "z", ref: "hakgyo-material:pb-ik-andai-material" }),
        );
        return content;
      }),
      /unknown material "ki-nope"/,
    );
    const { errors } = buildCurricula(
      withMaterial("ik-padahal", (content) => {
        content.sections[0]!.blocks.push(
          p({ text: "y", ref: "pola-ref:ki-alasan-urutan#nope" }),
          p({ text: "z", ref: "hakgyo-material:pb-ik-andai-material" }),
        );
        return content;
      }),
    );
    expect(errors.join("\n")).toContain(
      'unknown section "nope" of ki-alasan-urutan',
    );
    expect(errors.join("\n")).toContain(
      "write links between materials with ref()",
    );
  });

  test("rejects level-2 headings, draft markers and unknown blocks", () => {
    const heading: BlockNoteBlock = {
      type: "heading",
      props: { level: 2 },
      content: [{ type: "text", text: "Judul", styles: {} }],
    };
    expectError(
      withMaterial("ik-padahal", (content) => {
        content.sections[1]!.blocks.push(heading);
        return content;
      }),
      /ik-padahal#protes: has a level-2 heading/,
    );
    expectError(
      withMaterial("ik-padahal", (content) => {
        content.outro = [p("TODO tulis rangkuman")];
        return content;
      }),
      /ik-padahal#outro: contains a draft marker/,
    );
    expectError(
      withMaterial("ik-padahal", (content) => {
        content.intro.push({ type: "mysteryBlock" });
        return content;
      }),
      /Unknown block type "mysteryBlock"/,
    );
  });

  test("checks grammar cards", () => {
    const rule = { condition: "vokal", form: "-는데", example: "가는데" };
    const example = { before: "비가 오", emphasis: "는데", after: " 나가요" };
    const card = grammar({
      ...cardInput(),
      rules: [rule],
      examples: [example],
    });
    const ok = buildCurricula(
      withMaterial("ki-alasan-urutan", (content) => {
        content.sections[0]!.blocks.unshift(card);
        return content;
      }),
    );
    expect(ok.errors).toEqual([]);

    expectError(
      withMaterial("ki-alasan-urutan", (content) => {
        content.sections[0]!.blocks.unshift(
          grammar({
            ...cardInput(),
            rules: Array.from({ length: 13 }, () => rule),
            examples: [{ ...example, emphasis: "" }],
          }),
        );
        return content;
      }),
      /grammar card has 13 rules/,
    );
    expectError(
      withMaterial("ki-alasan-urutan", (content) => {
        content.sections[0]!.blocks.unshift(
          grammar({ ...cardInput(), descriptionTranslation: "" }),
        );
        return content;
      }),
      /grammar card needs a descriptionTranslation/,
    );
  });
});

describe("custom blocks and quizzes", () => {
  const expectError = (
    contents: Map<PolaMaterialKey, MaterialContent>,
    pattern: RegExp,
  ) => {
    const { errors } = buildCurricula(contents);
    expect(errors.some((error) => pattern.test(error))).toBe(true);
  };
  const line = { who: "민수", ko: "밥 먹었어요?", id: "Udah makan?" };

  test("accepts chat, culture and opener blocks", () => {
    const result = buildCurricula(
      withMaterial("ik-padahal", (content) => {
        content.sections[0]!.blocks.push(
          ...chat([line, line], {
            questions: [{ ko: "민수는 뭐 해요?", id: "Minsu ngapain?" }],
            tip: { title: "꿀팁", ko: "짧게 말해요.", id: "Singkat aja." },
          }),
          culture({
            titleKo: "밥 먹었어요?",
            titleId: "Sapaan makan",
            paragraphs: [{ ko: "인사예요.", id: "Ini sapaan." }],
            checklist: [{ ko: "인사할 수 있다.", id: "Bisa menyapa." }],
          }),
        );
        return content;
      }),
    );
    expect(result.errors).toEqual([]);
    expect(result.warnings.join("\n")).not.toContain("opener()");
  });

  test("checks conversation, culture and opener props", () => {
    expectError(
      withMaterial("ik-padahal", (content) => {
        content.sections[0]!.blocks.push(
          ...chat(Array.from({ length: 17 }, () => line)),
        );
        return content;
      }),
      /conversation has 17 lines \(at most 16\)/,
    );
    expectError(
      withMaterial("ik-padahal", (content) => {
        content.sections[0]!.blocks.push(
          ...chat([line], {
            questions: Array.from({ length: 9 }, () => ({
              ko: "왜?",
              id: "Kenapa?",
            })),
          }),
        );
        return content;
      }),
      /conversation has 9 questions/,
    );
    expectError(
      withMaterial("ik-padahal", (content) => {
        content.sections[0]!.blocks.push(
          culture({
            titleKo: "문화",
            titleId: "Budaya",
            paragraphs: [{ ko: "있어요.", id: " " }],
          }),
        );
        return content;
      }),
      /culture paragraph 1 needs Korean and Indonesian text/,
    );
    expectError(
      withMaterial("ik-padahal", (content) => {
        content.intro[0] = {
          ...openerBlock(),
          props: { ...openerBlock().props, title: "" },
        };
        return content;
      }),
      /opener needs a title/,
    );
  });

  test("warns (or errors once required) when the intro does not start with opener()", () => {
    const { errors, warnings } = buildCurricula(
      withMaterial("ik-padahal", (content) => ({
        ...content,
        intro: content.intro.slice(1),
      })),
    );
    expect([...errors, ...warnings].join("\n")).toContain(
      "ik-padahal: the intro does not start with opener()",
    );
  });

  test("imports a quiz as an assessment item right after the material", () => {
    const result = buildCurricula(withQuiz("ki-kata-sambung"));
    expect(result.errors).toEqual([]);
    const [quiz] = result.assessments;
    expect(result.assessments).toHaveLength(1);
    expect(quiz).toMatchObject({
      id: "pb-ki-kata-sambung-quiz",
      passingScore: 70,
      shuffleOptions: true,
      shuffleQuestions: false,
    });
    expect(quiz!.questions[0]!.id).toBe("pb-ki-kata-sambung-quiz-q-soal-1");
    expect(quiz!.questions[0]!.options[0]).toMatchObject({
      id: quizOptionId("pb-ki-kata-sambung-quiz-q-soal-1", "비가 오는데"),
      isCorrect: true,
      position: 0,
      content: [p("비가 오는데")],
    });
    expect(quiz!.questions[0]!.explanation).toEqual([
      p("-는데 kasih latar, bestie."),
    ]);

    const items = result.courses[0]!.modules[0]!.items;
    expect(items.map((item) => [item.id, item.type, item.position])).toEqual([
      ["pb-ki-kata-sambung-item", "MATERIAL", 0],
      ["pb-ki-kata-sambung-quiz-item", "ASSESSMENT", 1],
      ["pb-ki-alasan-urutan-item", "MATERIAL", 2],
      ["pb-ki-waktu-sebab-item", "MATERIAL", 3],
    ]);
    expect(items[1]).toMatchObject({
      assessmentId: "pb-ki-kata-sambung-quiz",
      materialId: null,
      isPublished: true,
    });

    // The placeholder becomes the quiz id.
    const material = result.materials.find(
      (row) => row.id === "pb-ki-kata-sambung-material",
    )!;
    expect(material.content.at(-1)).toMatchObject({
      type: "assessmentReference",
      props: { assessmentId: "pb-ki-kata-sambung-quiz" },
    });
    expect(JSON.stringify(result.materials)).not.toContain("pola-quiz:");
  });

  test("ids of quizzes follow the documented derivations", () => {
    expect(quizId("ik-padahal")).toBe("pb-ik-padahal-quiz");
    expect(quizItemId("ik-padahal")).toBe("pb-ik-padahal-quiz-item");
    expect(quizQuestionId("ik-padahal", "satu")).toBe(
      "pb-ik-padahal-quiz-q-satu",
    );
    // Options hash their normalized text, so whitespace does not matter but text does.
    expect(quizOptionId("q", " 가요 ")).toBe(quizOptionId("q", "가요"));
    expect(quizOptionId("q", "가요")).not.toBe(quizOptionId("q", "와요"));
  });

  test("a quiz and its quizRef() come together", () => {
    expectError(
      withMaterial("ik-padahal", (content) => ({
        ...content,
        quiz: quizContent(),
      })),
      /ik-padahal: has a quiz, so it needs exactly one quizRef\(\) \(has 0\)/,
    );
    expectError(
      withMaterial("ik-padahal", (content) => ({
        ...content,
        outro: [quizRef()],
      })),
      /ik-padahal: has a quizRef\(\) but no quiz/,
    );
    expectError(
      withMaterial("ik-padahal", (content) => ({
        ...content,
        outro: [
          { type: "assessmentReference", props: { assessmentId: "other" } },
        ],
      })),
      /embeds an assessment other than the material's own quiz/,
    );
  });

  test("checks quiz size, options, answer keys and explanations", () => {
    expectError(
      withQuiz("ik-padahal", quizContent(4)),
      /quiz has 4 questions \(5-15\)/,
    );
    expectError(
      withQuiz("ik-padahal", quizContent(16)),
      /quiz has 16 questions/,
    );
    const broken = quizContent();
    broken.questions[1]!.key = "soal-1";
    broken.questions[2]!.options = broken.questions[2]!.options.map(
      (option) => ({
        ...option,
        correct: true,
      }),
    );
    broken.questions[3]!.options = broken.questions[3]!.options.slice(0, 2);
    broken.questions[4]!.explanation = " ";
    const { errors } = buildCurricula(withQuiz("ik-padahal", broken));
    const text = errors.join("\n");
    expect(text).toContain("(soal-1): key is used twice");
    expect(text).toContain(
      "(soal-3): needs exactly one correct option (has 3)",
    );
    expect(text).toContain("(soal-4): has 2 options (3-4)");
    expect(text).toContain("(soal-5): explanation is empty");
    expect(buildCurricula(withQuiz("ik-padahal", broken)).assessments).toEqual(
      [],
    );
  });
});

describe("BlockNote round trip", () => {
  test("the assembled fixture and a quiz material load unchanged", () => {
    const result = buildCurricula(withQuiz("ik-padahal", quizContent()));
    const material = result.materials.find(
      (row) => row.id === "pb-ik-padahal-material",
    )!;
    material.content.push(
      { ...chat([{ who: "A", ko: "안녕", id: "Halo" }])[0]!, id: "x-chat" },
      {
        ...table([
          ["Pola", "Arti"],
          [ref("-는데", "ki-alasan-urutan"), "latar"],
        ]),
        id: "x-table",
      },
    );
    expect(blockNoteRoundTripIssues(material.content)).toEqual([]);
  });

  test("reports props, text and links BlockNote would change", () => {
    const issues = blockNoteRoundTripIssues([
      {
        id: "a",
        type: "callout",
        props: { tone: "tip", extra: 1 },
        content: [],
      },
    ]);
    expect(issues).toEqual(["a: prop extra is not in the schema (dropped)"]);
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

// ---------------------------------------------------------------- plan

function emptySnapshot(): Snapshot {
  return {
    organizationId: "hakgyo-system-organization",
    courses: [],
    modules: [],
    items: [],
    materials: [],
    assessments: [],
    questions: [],
    options: [],
  };
}

type Built = ReturnType<typeof buildCurricula>;

/** What the database holds after importing (what loadSnapshot reads back), with jsonb key order scrambled. */
function snapshotOf({ courses, materials, assessments }: Built): Snapshot {
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
      organizationId: snapshot.organizationId,
      title: course.title,
      slug: course.slug,
      description: course.description,
      status: course.status,
      progressionMode: course.progressionMode,
      enrollmentMode: course.enrollmentMode,
      price: course.price,
    });
    for (const row of course.modules) {
      snapshot.modules.push({
        id: row.id,
        courseId: row.courseId,
        title: row.title,
        description: row.description,
        position: row.position,
      });
      for (const item of row.items) {
        snapshot.items.push({
          id: item.id,
          moduleId: item.moduleId,
          courseId: course.id,
          type: item.type,
          position: item.position,
          materialId: item.materialId,
          assessmentId: item.assessmentId,
          isPublished: item.isPublished,
        });
      }
    }
  }
  for (const material of materials) {
    snapshot.materials.push({
      ...material,
      content: reorder(material.content),
      organizationId: snapshot.organizationId,
    });
  }
  for (const { questions, ...assessment } of assessments) {
    snapshot.assessments.push({
      ...assessment,
      organizationId: snapshot.organizationId,
    });
    for (const { options, ...question } of questions) {
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

describe("planImport", () => {
  const built = buildCurricula(withQuiz("ik-padahal"));
  const { courses, materials, assessments } = built;
  const plan = (snapshot: Snapshot) =>
    planImport(courses, materials, assessments, snapshot);

  test("the fixture builds", () => {
    expect(built.errors).toEqual([]);
  });

  test("creates everything on an empty database", () => {
    const result = plan(emptySnapshot());
    expect(result.errors).toEqual([]);
    expect(result.courses.create).toHaveLength(2);
    expect(result.modules.create).toHaveLength(7);
    expect(result.materials.create).toHaveLength(KEYS.length);
    expect(result.items.create).toHaveLength(KEYS.length + 1);
    expect(result.assessments.create).toHaveLength(1);
    expect(result.questions.create).toHaveLength(5);
    expect(result.options.create).toHaveLength(15);
  });

  test("a second run changes nothing", () => {
    const result = plan(snapshotOf(built));
    expect(result.errors).toEqual([]);
    expect(planHasChanges(result)).toBe(false);
    expect(result.materials.unchanged).toBe(KEYS.length);
    expect(result.options.unchanged).toBe(15);
  });

  test("updates only the fields that differ", () => {
    const snapshot = snapshotOf(built);
    snapshot.courses[0]!.status = "DRAFT";
    snapshot.materials[0]!.title = "Old";
    snapshot.items[0]!.position = 9;
    snapshot.items[0]!.isPublished = false;
    snapshot.assessments[0]!.passingScore = 50;
    snapshot.options[0]!.isCorrect = false;
    const result = plan(snapshot);
    expect(result.courses.update).toEqual([
      {
        id: "pb-korea-indo",
        data: { status: "PUBLISHED" },
        fields: ["status"],
      },
    ]);
    expect(result.materials.update.map((row) => row.fields)).toEqual([
      ["title"],
    ]);
    expect(result.items.update[0]!.fields).toEqual(["position", "isPublished"]);
    expect(result.modules.update).toEqual([]);
    expect(result.assessments.update.map((row) => row.fields)).toEqual([
      ["passingScore"],
    ]);
    expect(result.options.update.map((row) => row.fields)).toEqual([
      ["isCorrect"],
    ]);
  });

  test("adding a quiz moves the later items of the module", () => {
    const after = buildCurricula(withQuiz("ki-kata-sambung"));
    const result = planImport(
      after.courses,
      after.materials,
      after.assessments,
      snapshotOf(buildCurricula(fixture())),
    );
    expect(result.errors).toEqual([]);
    expect(result.items.create.map((row) => row.id)).toEqual([
      "pb-ki-kata-sambung-quiz-item",
    ]);
    expect(
      result.items.update.map((row) => [row.id, row.data.position]),
    ).toEqual([
      ["pb-ki-alasan-urutan-item", 2],
      ["pb-ki-waktu-sebab-item", 3],
    ]);
  });

  test("deletes quiz rows the content dropped, unless learners answered them", () => {
    const snapshot = snapshotOf(built);
    const question = snapshot.questions[0]!;
    snapshot.questions.push({
      ...question,
      id: `${question.id}-old`,
      position: 9,
    });
    snapshot.options.push({
      ...snapshot.options[0]!,
      id: "pb-ik-padahal-quiz-q-soal-1-o-old",
      position: 9,
    });
    const result = plan(snapshot);
    expect(result.errors).toEqual([]);
    expect(result.questions.remove.map((row) => row.id)).toEqual([
      `${question.id}-old`,
    ]);
    expect(result.options.remove.map((row) => row.id)).toEqual([
      "pb-ik-padahal-quiz-q-soal-1-o-old",
    ]);
    expect(planHasChanges(result)).toBe(true);

    snapshot.questions.at(-1)!.answerCount = 2;
    snapshot.options.at(-1)!.selectionCount = 3;
    const blocked = plan(snapshot);
    expect(blocked.errors.join("\n")).toContain("has 2 learner answers");
    expect(blocked.errors.join("\n")).toContain("learners chose it 3 times");
  });

  test("refuses rows that are not in the manifest and id or slug collisions", () => {
    const snapshot = snapshotOf(built);
    snapshot.items.push({
      id: "stray",
      moduleId: "pb-ki-sambung",
      courseId: "pb-korea-indo",
      type: "MATERIAL",
      position: 50,
      materialId: null,
      assessmentId: null,
      isPublished: true,
    });
    snapshot.courses.push({
      ...snapshot.courses[0]!,
      id: "someone-else",
      slug: "pola-indo-korea",
    });
    snapshot.materials[0]!.organizationId = "other-org";
    snapshot.assessments[0]!.organizationId = "another-org";
    snapshot.questions[0]!.assessmentId = "elsewhere";
    const result = plan(snapshot);
    const text = result.errors.join("\n");
    expect(text).toContain(
      "item stray of pb-korea-indo is not in the manifest",
    );
    expect(text).toContain('already uses the slug "pola-indo-korea"');
    expect(text).toContain("exists in organization other-org");
    expect(text).toContain(
      "assessment pb-ik-padahal-quiz exists in organization another-org",
    );
    expect(text).toContain("exists in assessment elsewhere");
  });
});

describe("real content", () => {
  test("every content file that exists loads and validates", async () => {
    const loaded = await loadPolaContent();
    // Missing files are reported by `pola:validate`; anything else is a broken file.
    expect(
      loaded.problems.filter((problem) => !problem.endsWith(" is missing")),
    ).toEqual([]);
    const result = buildCurricula(loaded.materials);
    expect(result.errors).toEqual([]);
    expect(
      result.materials.flatMap((material) =>
        blockNoteRoundTripIssues(material.content).map(
          (issue) => `${material.id}: ${issue}`,
        ),
      ),
    ).toEqual([]);
  });
});
