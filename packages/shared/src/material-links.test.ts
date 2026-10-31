import { describe, expect, test } from "bun:test";

import {
  collectMaterialLinkIds,
  collectMaterialLinkTargets,
  formatMaterialLinkHref,
  listMaterialHeadings,
  materialExcerpt,
  materialLinkSection,
  parseMaterialLinkHref,
} from "./material-links";

const text = (value: string) => ({ type: "text", text: value, styles: {} });
const link = (href: string, label: string) => ({
  type: "link",
  href,
  content: [text(label)],
});

const content = [
  {
    id: "intro",
    type: "paragraph",
    content: [text("Lihat "), link("hakgyo-material:m2#neunde", "-는데")],
  },
  {
    id: "neunde",
    type: "heading",
    props: { level: 2 },
    content: [text("-는데")],
  },
  { id: "a", type: "paragraph", content: [text("Padahal, nah.")] },
  {
    id: "g",
    type: "grammar",
    props: { title: "-는데", descriptionTranslation: "Latar belakang" },
  },
  {
    id: "sub",
    type: "heading",
    props: { level: 3 },
    content: [text("Contoh")],
  },
  {
    id: "b",
    type: "bulletListItem",
    content: [link("hakgyo-material:m3", "materi lain")],
    children: [
      {
        id: "c",
        type: "paragraph",
        content: [link("hakgyo-material:m2#neunde", "dobel")],
      },
    ],
  },
  {
    id: "next",
    type: "heading",
    props: { level: 2 },
    content: [text("-지만")],
  },
  { id: "d", type: "paragraph", content: [text("Tapi.")] },
];

describe("material links", () => {
  test("formats and parses hrefs", () => {
    expect(formatMaterialLinkHref({ materialId: "m1", anchor: null })).toBe(
      "hakgyo-material:m1",
    );
    expect(parseMaterialLinkHref("hakgyo-material:m1#x")).toEqual({
      materialId: "m1",
      anchor: "x",
    });
    expect(parseMaterialLinkHref("hakgyo-material:m1#")).toEqual({
      materialId: "m1",
      anchor: null,
    });
    expect(parseMaterialLinkHref("hakgyo-material:")).toBeNull();
    expect(parseMaterialLinkHref("https://example.com")).toBeNull();
    expect(parseMaterialLinkHref(undefined)).toBeNull();
  });

  test("collects unique targets, including nested children", () => {
    expect(collectMaterialLinkTargets(content)).toEqual([
      { materialId: "m2", anchor: "neunde" },
      { materialId: "m3", anchor: null },
    ]);
    expect(collectMaterialLinkIds(content)).toEqual(["m2", "m3"]);
  });

  test("lists top-level headings", () => {
    expect(listMaterialHeadings(content)).toEqual([
      { id: "neunde", level: 2, text: "-는데" },
      { id: "sub", level: 3, text: "Contoh" },
      { id: "next", level: 2, text: "-지만" },
    ]);
  });

  test("excerpts a section up to the next heading of the same level", () => {
    expect(materialLinkSection(content, "neunde")).toEqual({
      title: "-는데",
      excerpt: "Padahal, nah. -는데 — Latar belakang Contoh materi lain",
    });
    expect(materialLinkSection(content, "missing")).toBeNull();
  });

  test("previews sections that start with conversation, culture or lesson-page blocks", () => {
    const heading = (id: string, label: string) => ({
      id,
      type: "heading",
      props: { level: 2 },
      content: [text(label)],
    });
    const blocks = [
      {
        id: "opener",
        type: "lessonPage",
        props: {
          title: "이유와 순서",
          subtitle: "Soalnya, terus",
          eyebrow: "BAB 2",
        },
      },
      heading("chat", "Ngobrol"),
      {
        id: "c1",
        type: "conversation",
        props: {
          eyebrow: "대화",
          lines: JSON.stringify([
            {
              speaker: "민수",
              korean: "밥 먹었어?",
              translation: "Udah makan?",
            },
            { speaker: "", korean: "아직이요.", translation: "" },
            { speaker: "x", korean: "", translation: "" },
          ]),
        },
      },
      heading("budaya", "Budaya"),
      {
        id: "k1",
        type: "culture",
        props: {
          titleKo: "눈치",
          titleEn: "Peka situasi",
          sections: JSON.stringify([
            { id: "t0", type: "text", ko: "한국에서는...", en: "Di Korea..." },
            { id: "m0", type: "media", images: [] },
          ]),
        },
      },
      heading("rusak", "Rusak"),
      { id: "r1", type: "conversation", props: { lines: "not json" } },
      { id: "r2", type: "paragraph", content: [text("Teks biasa.")] },
    ];
    expect(materialLinkSection(blocks, "chat")).toEqual({
      title: "Ngobrol",
      excerpt: "민수: 밥 먹었어? — Udah makan? 아직이요.",
    });
    expect(materialLinkSection(blocks, "budaya")).toEqual({
      title: "Budaya",
      excerpt: "눈치 — Peka situasi 한국에서는... Di Korea...",
    });
    expect(materialLinkSection(blocks, "rusak")?.excerpt).toBe("Teks biasa.");
    expect(materialExcerpt(blocks)).toStartWith(
      "이유와 순서 — Soalnya, terus Ngobrol 민수:",
    );
  });
});
