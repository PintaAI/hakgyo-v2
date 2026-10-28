import { tagLabel } from "./assessment-tags";
import type { SectionNavigation } from "./assessment-question-rules";
import type { ScoreBand } from "./assessment-score";

/**
 * The EPS-TOPIK package layout as versioned data (docs/eps-topik-simulation.md section 5.9,
 * docs/eps-question-generator.md section 2, research in docs/research/eps-topik-question-patterns.md
 * section 4). The editor's blueprint check and the preset read it now; the question bank's package
 * builder will read the same data. A new version gets a new `version` and keeps the old one, so
 * packages built from it can still be checked.
 */

export type BlueprintDifficulty = "mudah" | "sedang" | "sulit";

export type BlueprintSlot = {
  /** Question number in the package (1–40). */
  number: number;
  /** Type tag, `eps:R1`…`eps:L12`. */
  type: string;
  difficulty: BlueprintDifficulty;
  /** Types that may stand in for this slot in some packages (variation between packages). */
  alternatives?: readonly string[];
  /** What the slot asks for, in Indonesian. */
  note: string;
};

export type BlueprintSection = {
  key: "reading" | "listening";
  title: string;
  timeLimitSeconds: number;
  navigation: SectionNavigation;
  lockAnswers: boolean;
  allowEarlyFinish: boolean;
  audioMaxPlays: number | null;
  audioAutoplay: boolean;
  audioRepeatGapSeconds: number;
  pacedAnswerSeconds: number | null;
  /** Shown on the section intro screen (original wording). */
  instructions: string;
  slots: readonly BlueprintSlot[];
};

export type Blueprint = {
  version: string;
  title: string;
  pointsPerQuestion: number;
  scoreBands: readonly ScoreBand[];
  /** Topic tags that count as work, K3 and institutions, and their share per section. */
  workTopics: { tags: readonly string[]; minShare: number; maxShare: number };
  sections: readonly BlueprintSection[];
};

const slot = (
  number: number,
  type: string,
  difficulty: BlueprintDifficulty,
  note: string,
  alternatives?: readonly string[],
): BlueprintSlot => ({
  number,
  type: `eps:${type}`,
  difficulty,
  note,
  ...(alternatives
    ? { alternatives: alternatives.map((code) => `eps:${code}`) }
    : {}),
});

export const epsTopikBlueprint: Blueprint = {
  version: "eps-topik@2025.1",
  title: "EPS-TOPIK",
  pointsPerQuestion: 2.5,
  scoreBands: [
    { label: "Manufaktur", minPercent: 60 },
    { label: "Sektor lain", minPercent: 45 },
  ],
  workTopics: {
    tags: [
      "topik:k3",
      "topik:alat-kerja",
      "topik:lembaga",
      "topik:tindakan-kerja",
    ],
    minShare: 0.4,
    maxShare: 0.5,
  },
  sections: [
    {
      key: "reading",
      title: "Membaca",
      timeLimitSeconds: 25 * 60,
      navigation: "FREE",
      lockAnswers: false,
      allowEarlyFinish: true,
      audioMaxPlays: null,
      audioAutoplay: false,
      audioRepeatGapSeconds: 2,
      pacedAnswerSeconds: null,
      instructions:
        "20 soal membaca, 25 menit. Kamu bisa berpindah antarsoal dan mengubah jawaban sampai waktu bagian ini habis.",
      slots: [
        slot(1, "R1", "mudah", "Gambar benda sehari-hari", ["R13", "R3"]),
        slot(2, "R1", "mudah", "Gambar alat atau kendaraan kerja", [
          "R13",
          "R3",
        ]),
        slot(3, "R1", "mudah", "Gambar aksi (-고 있습니다)", ["R13", "R3"]),
        slot(4, "R2", "mudah", "Rambu K3"),
        slot(5, "R4", "mudah", "Partikel bergaris bawah"),
        slot(6, "R4", "sedang", "Konjugasi tak beraturan bergaris bawah"),
        slot(7, "R5", "mudah", "Materi praktis: kartu nama, papan, jadwal"),
        slot(8, "R6", "mudah", "Kata ke kata terkait"),
        slot(9, "R6", "sedang", "Kata ke definisi"),
        slot(10, "R7", "sedang", "Grafik dengan 4–6 kategori"),
        slot(11, "R8", "mudah", "Rumpang: kosakata formulir"),
        slot(12, "R8", "sedang", "Rumpang: konektor"),
        slot(13, "R8", "sedang", "Rumpang: konektor atau bentuk"),
        slot(14, "R8", "sedang", "Rumpang: bentuk kalimat"),
        slot(
          15,
          "R8",
          "sulit",
          "Rumpang: ekspresi akhir kalimat dalam teks K3",
        ),
        slot(
          16,
          "R8",
          "sulit",
          "Rumpang: ekspresi akhir kalimat dalam teks K3",
        ),
        slot(17, "R9", "sedang", "Alat kerja dari deskripsi fungsi"),
        slot(18, "R10", "sedang", "Topik bacaan budaya atau kehidupan", [
          "R12",
        ]),
        slot(
          19,
          "R11",
          "sulit",
          "Isi yang sama: pengumuman tempat kerja (gambar)",
        ),
        slot(
          20,
          "R11",
          "sulit",
          "Isi yang sama: hukum, asuransi atau hak pekerja",
        ),
      ],
    },
    {
      key: "listening",
      title: "Mendengar",
      timeLimitSeconds: 25 * 60,
      navigation: "PACED",
      lockAnswers: false,
      allowEarlyFinish: false,
      audioMaxPlays: 2,
      audioAutoplay: true,
      audioRepeatGapSeconds: 2,
      pacedAnswerSeconds: 7,
      instructions:
        "20 soal mendengar, 25 menit. Audio setiap soal diputar otomatis dua kali, lalu ada waktu menjawab sebelum soal berganti sendiri.",
      slots: [
        slot(21, "L1", "mudah", "Bunyi ke tulisan: vokal"),
        slot(
          22,
          "L1",
          "mudah",
          "Bunyi ke tulisan: konsonan akhir atau aspirasi",
        ),
        slot(23, "L2", "mudah", "Kalimat ke gambar: benda"),
        slot(24, "L2", "mudah", "Kalimat ke gambar: alat"),
        slot(25, "L2", "mudah", "Kalimat ke gambar: aktivitas"),
        slot(26, "L2", "mudah", "Kalimat ke gambar: tindakan kerja"),
        slot(27, "L3", "sedang", "Dialog pendek: adegan sehari-hari"),
        slot(28, "L3", "sedang", "Dialog pendek: adegan kerja"),
        slot(29, "L4", "sedang", "Jawaban tepat: apa"),
        slot(30, "L4", "sedang", "Jawaban tepat: di mana"),
        slot(31, "L4", "sedang", "Jawaban tepat: kapan"),
        slot(32, "L4", "sedang", "Jawaban tepat: ya atau tidak"),
        slot(33, "L5", "sedang", "Kalimat lanjutan, topik K3"),
        slot(34, "L6", "sedang", "Angka: tanggal"),
        slot(35, "L6", "sedang", "Angka: harga barang"),
        slot(36, "L6", "sedang", "Angka: harga alat pelindung diri"),
        slot(37, "L7", "sedang", "Posisi benda dalam ruangan"),
        slot(
          38,
          "L8",
          "sulit",
          "Dialog panjang: tujuan datang atau menelepon",
          ["L10"],
        ),
        slot(39, "L8", "sulit", "Dialog panjang: alasan", ["L10"]),
        slot(40, "L9", "sulit", "Dialog panjang: isi yang sama"),
      ],
    },
  ],
};

export type BlueprintQuestion = {
  id: string;
  tags: readonly string[];
};

export type BlueprintIssue =
  | { kind: "MISSING"; number: number; slot: BlueprintSlot }
  | { kind: "EXTRA"; number: number; questionId: string }
  | {
      kind: "TYPE";
      number: number;
      questionId: string;
      slot: BlueprintSlot;
      found: string | null;
    }
  | {
      kind: "LEVEL";
      number: number;
      questionId: string;
      slot: BlueprintSlot;
      found: string | null;
    };

export type BlueprintSectionReport = {
  key: BlueprintSection["key"];
  title: string;
  expected: number;
  found: number;
  issues: BlueprintIssue[];
  /** Share of questions tagged with a work, K3 or institution topic. */
  workShare: number;
  workShareOk: boolean;
};

const typeOf = (tags: readonly string[]) =>
  tags.find((tag) => tag.startsWith("eps:")) ?? null;
const levelOf = (tags: readonly string[]) =>
  tags.find((tag) => tag.startsWith("level:"))?.slice("level:".length) ?? null;

/**
 * Compares an assessment with a blueprint, section by section (`sections[i]` holds the questions of
 * the blueprint's section i, in their shown order): missing or extra questions, a type tag that
 * neither the slot nor its alternatives allow, a difficulty tag other than the slot's, and the
 * work-topic share.
 */
export function checkBlueprint(
  blueprint: Blueprint,
  sections: ReadonlyArray<readonly BlueprintQuestion[]>,
): BlueprintSectionReport[] {
  return blueprint.sections.map((section, sectionIndex) => {
    const questions = sections[sectionIndex] ?? [];
    const issues: BlueprintIssue[] = [];
    const firstNumber = section.slots[0]?.number ?? 1;
    section.slots.forEach((expected, index) => {
      const question = questions[index];
      if (!question) {
        issues.push({
          kind: "MISSING",
          number: expected.number,
          slot: expected,
        });
        return;
      }
      const type = typeOf(question.tags);
      if (
        type !== expected.type &&
        !(type && expected.alternatives?.includes(type))
      ) {
        issues.push({
          kind: "TYPE",
          number: expected.number,
          questionId: question.id,
          slot: expected,
          found: type,
        });
      }
      const level = levelOf(question.tags);
      if (level !== expected.difficulty) {
        issues.push({
          kind: "LEVEL",
          number: expected.number,
          questionId: question.id,
          slot: expected,
          found: level,
        });
      }
    });
    questions.slice(section.slots.length).forEach((question, index) => {
      issues.push({
        kind: "EXTRA",
        number: firstNumber + section.slots.length + index,
        questionId: question.id,
      });
    });
    const work = questions.filter((question) =>
      question.tags.some((tag) => blueprint.workTopics.tags.includes(tag)),
    ).length;
    const workShare = questions.length ? work / questions.length : 0;
    return {
      key: section.key,
      title: section.title,
      expected: section.slots.length,
      found: questions.length,
      issues,
      workShare,
      workShareOk:
        workShare >= blueprint.workTopics.minShare - 1e-9 &&
        workShare <= blueprint.workTopics.maxShare + 1e-9,
    };
  });
}

/** One issue in plain Indonesian for the editor. */
export function blueprintIssueText(issue: BlueprintIssue) {
  switch (issue.kind) {
    case "MISSING":
      return `Soal ${issue.number} belum ada: ${tagLabel(issue.slot.type)} (${issue.slot.note}).`;
    case "EXTRA":
      return `Soal ${issue.number} di luar format (bagian ini berisi lebih banyak soal).`;
    case "TYPE": {
      const allowed = [issue.slot.type, ...(issue.slot.alternatives ?? [])]
        .map((tag) => tagLabel(tag))
        .join(" atau ");
      return issue.found
        ? `Soal ${issue.number}: seharusnya ${allowed}, tertulis ${tagLabel(issue.found)}.`
        : `Soal ${issue.number}: belum diberi label tipe (seharusnya ${allowed}).`;
    }
    case "LEVEL":
      return issue.found
        ? `Soal ${issue.number}: tingkat seharusnya ${tagLabel(`level:${issue.slot.difficulty}`)}, tertulis ${tagLabel(`level:${issue.found}`)}.`
        : `Soal ${issue.number}: belum diberi label tingkat (seharusnya ${tagLabel(`level:${issue.slot.difficulty}`)}).`;
  }
}
