import { audioClip, b, callout, p, rules } from "../blocks";
import type { ModuleContent } from "../content-types";

export const m0Welcome: ModuleContent = {
  key: "m0-welcome",
  title: "Mulai di sini",
  description: "Cara kerja Hangeul dan cara kursus ini berjalan.",
  items: [
    {
      type: "material",
      key: "m0-why-hangeul",
      title: "Mulai di sini",
      description: "Cara kerja Hangeul dan cara kursus ini berjalan.",
      minutes: 3,
      blocks: [
        callout(
          "info",
          b("Hangeul hanya punya 24 huruf dasar."),
          " Banyak orang sudah bisa membacanya dalam beberapa hari.",
        ),
        rules({
          title: "Cara kerja Hangeul",
          intro:
            "Huruf tidak ditulis berjajar, tapi disusun jadi blok. Satu blok = satu suku kata.",
          columns: ["Aturan", "Jadi", "Contoh"],
          rows: [
            {
              when: "Huruf disusun jadi",
              result: "1 blok",
              example: "ㅇ + ㅏ = 아",
            },
            { when: "1 blok", result: "1 suku kata", example: '아 = "a"' },
            {
              when: "Di dalam blok",
              result: "kiri → kanan, atas → bawah",
              example: "오 = ㅇ di atas, ㅗ di bawah",
            },
            {
              when: "Blok demi blok",
              result: "kiri → kanan",
              example: '아이 = 아 + 이 = "a-i"',
            },
          ],
          tip: {
            title: "ㅇ di depan itu diam",
            text: 'Itu sebabnya 아 dibaca "a". Kamu belajar ini di modul 1.',
          },
        }),
        p(
          "Modul terbuka berurutan. Setiap pelajaran isinya sama: ",
          b("dengar, lihat, main, lalu kuis"),
          ".",
        ),
        p(
          "Dengarkan tiga frasa ini dulu. ",
          b("Belum perlu dibaca"),
          ", nanti kamu bisa sendiri.",
        ),
        audioClip("안녕하세요", "Halo (sopan)"),
        audioClip("감사합니다", "Terima kasih"),
        audioClip("사랑해요", "Aku sayang kamu"),
        callout(
          "success",
          b("Ingat: "),
          "satu blok = satu suku kata, dibaca kiri ke kanan, atas ke bawah.",
        ),
      ],
    },
  ],
};
