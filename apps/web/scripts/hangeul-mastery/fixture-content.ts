// A small course in the content format, for the importer's tests and for trying the pipeline before the real
// content exists (`hangeul:import --content scripts/hangeul-mastery/fixture-content.ts`).
import {
  assessmentRef,
  audioClip,
  callout,
  contrast,
  game,
  heading,
  letters,
  p,
  syllableGrid,
  vocabularyRef,
} from "./blocks";
import type { CourseContent } from "./content-types";

export const fixtureContent: CourseContent = {
  title: "Hangeul Mastery",
  description: "Fondasi membaca dan menulis Hangeul.",
  modules: [
    {
      key: "m1-basic-vowels",
      title: "Vokal dasar",
      description: "ㅏ ㅓ ㅗ",
      items: [
        {
          type: "material",
          key: "m1-vowels-a-eo-o",
          title: "ㅏ ㅓ ㅗ",
          description: "Tiga vokal pertama.",
          blocks: [
            heading("Vokal pertama"),
            p("Dengarkan dan ulangi."),
            letters("Vokal", [
              {
                character: "ㅏ",
                cue: "seperti a di 'apa'",
                romanization: "a",
                say: "아",
                example: { word: "아이", meaning: "anak" },
              },
              {
                character: "ㅓ",
                cue: "mulut terbuka, bibir tidak bulat",
                say: "어",
              },
            ]),
            contrast("Bedakan", "Dengarkan pasangan ini.", [
              { items: [{ text: "어" }, { text: "오" }] },
            ]),
            syllableGrid("Baca", ["ㅇ"], ["ㅏ", "ㅓ", "ㅗ"]),
            game("stroke-master", "basic-vowels", "Latihan", "Tulis vokal."),
            vocabularyRef("m1-vocab"),
            callout("tip", "ㅇ di depan vokal tidak berbunyi."),
          ],
          requirements: [{ type: "vocabulary", key: "m1-vocab" }],
        },
        {
          type: "vocabulary",
          key: "m1-vocab",
          title: "Kosakata A",
          description: "",
          entries: [
            { term: "아이", definition: "anak", romanization: "ai" },
            {
              term: "오이",
              definition: "mentimun",
              romanization: "oi",
              examples: ["오이 김치"],
            },
          ],
        },
        {
          type: "material",
          key: "m1-review",
          title: "Ulasan",
          description: "",
          blocks: [p("Siap untuk kuis?"), assessmentRef("m1-quiz")],
        },
        {
          type: "assessment",
          key: "m1-quiz",
          title: "Kuis vokal dasar",
          description: "",
          instructions: "Pilih jawaban yang benar.",
          passingScore: 80,
          questions: [
            {
              key: "listen-a",
              prompt: [p("Huruf apa yang kamu dengar?"), audioClip("아")],
              explanation: "아 dibaca a.",
              options: [{ content: "ㅏ", correct: true }, { content: "ㅓ" }],
            },
            {
              key: "read-ai",
              prompt: "Apa arti 아이?",
              options: [
                { content: "anak", correct: true },
                { content: "mentimun" },
              ],
            },
          ],
        },
      ],
    },
  ],
};

/** Every audio text of the fixture, as `audio()` placeholders produce them. */
export const fixtureAudioTexts = ["아", "아이", "어", "오", "오이"];
