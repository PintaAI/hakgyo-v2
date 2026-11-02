import { Platform } from "react-native";

/**
 * Elements a tour points at. Registered ids come from `useTourTarget` on a
 * view in the screen; `native:` ids are native header and tab bar items that
 * JavaScript cannot measure, placed by `nativeAnchorRect`.
 */
export type NativeAnchor =
  | "native:sidebar"
  | "native:settings"
  | "native:tab:learn"
  | "native:tab:assessments"
  | "native:tab:search";

export type TourTargetId =
  | "header.organization"
  | "home.streak"
  | "home.vocabulary"
  | "home.challenge"
  | "learn.cohort"
  | "learn.next"
  | "learn.dots"
  | "practice.hangeul"
  | "practice.games"
  | "search.field"
  | "profile.segments"
  | "profile.stats"
  | "profile.milestones";

export type TourStep = {
  /** What to highlight; null shows the card without a spotlight. */
  target: TourTargetId | NativeAnchor | null;
  title: string;
  body: string;
};

export type TourId = "home" | "learn" | "practice" | "search" | "profile";

export type Tour = {
  id: TourId;
  /** Raise to show a changed tour again to learners who saw the old one. */
  version: number;
  steps: TourStep[];
};

const ios = Platform.OS === "ios";

/**
 * Steps whose target is not on screen (no cohorts yet, no class tasks) are
 * skipped, so a tour only shows what the learner can see.
 */
export const tours: Record<TourId, Tour> = {
  home: {
    id: "home",
    version: 1,
    steps: [
      {
        target: "header.organization",
        title: "Ganti organisasi",
        body: "Belajar di lebih dari satu tempat? Ketuk di sini untuk pindah. Warna dan isi aplikasi ikut organisasi yang dipilih.",
      },
      {
        target: "native:sidebar",
        title: "Menu",
        body: "Buka daftar kelas, tugas, pembaruan belajar, dan profilmu. Titik merah berarti ada yang baru.",
      },
      {
        target: "native:settings",
        title: "Pengaturan",
        body: "Atur notifikasi, tampilan, dan akunmu. Kalau ada pembaruan yang belum dibaca, tombol ini berganti jadi lonceng.",
      },
      {
        target: "home.streak",
        title: "Streak mingguan",
        body: "Belajar setiap hari menjaga api streak tetap menyala. XP minggu ini terkumpul dari latihan dan tugas.",
      },
      {
        target: "home.vocabulary",
        title: "Kosakata hari ini",
        body: "Campuran kata dari kurikulummu. Jawab di kolom bawah kartu, atau buka kartunya untuk melihat jawaban.",
      },
      {
        target: "home.challenge",
        title: "Tantangan soal",
        body: "Lima soal acak dari kurikulummu. Geser ke samping untuk pindah soal. Nilai dan XP kamu tidak berubah.",
      },
      {
        target: "native:tab:learn",
        title: "Belajar",
        body: "Semua kelas dan kurikulummu, lengkap dengan jadwal pertemuan dan progres.",
      },
      {
        target: "native:tab:assessments",
        title: "Latihan",
        body: "Main game kosakata, kerjakan quiz, dan lihat tugas dari kelasmu.",
      },
      {
        target: "native:tab:search",
        title: "Cari",
        body: "Temukan materi, kosakata, dan soal dari semua kurikulummu.",
      },
    ],
  },
  learn: {
    id: "learn",
    version: 1,
    steps: [
      {
        target: "learn.cohort",
        title: "Kelasmu",
        body: "Nama kelas, kurikulum, dan pengajarmu. Garis di bawahnya menunjukkan berapa materi yang sudah selesai.",
      },
      {
        target: "learn.next",
        title: "Yang perlu dikerjakan",
        body: "Pertemuan, tugas, atau materi berikutnya muncul paling atas. Ketuk untuk langsung membukanya.",
      },
      {
        target: "learn.dots",
        title: "Kelas lainnya",
        body: "Geser kartu ke samping untuk melihat kelas lainnya.",
      },
    ],
  },
  practice: {
    id: "practice",
    version: 1,
    steps: [
      {
        target: "practice.hangeul",
        title: "Penguasaan Hangeul",
        body: "Game untuk menghafal huruf Korea. Cocok kalau kamu baru mulai.",
      },
      {
        target: "practice.games",
        title: "Pilih game",
        body: "Pilih game dulu, lalu pilih set kosakata yang mau dimainkan. Quiz memakai tugas dari kelasmu.",
      },
    ],
  },
  search: {
    id: "search",
    version: 1,
    steps: [
      {
        // The iOS search field is native; Android draws its own.
        target: ios ? null : "search.field",
        title: "Cari apa saja",
        body: "Ketik untuk menemukan materi, kosakata, dan soal dari semua kurikulummu. Hasilnya bisa disaring per jenis.",
      },
    ],
  },
  profile: {
    id: "profile",
    version: 1,
    steps: [
      {
        target: "profile.segments",
        title: "Profil dan pengaturan",
        body: "Pindah antara ringkasan belajarmu dan pengaturan aplikasi.",
      },
      {
        target: "profile.stats",
        title: "Ringkasan belajar",
        body: "XP, streak, dan materi yang sudah kamu selesaikan.",
      },
      {
        target: "profile.milestones",
        title: "Pencapaian",
        body: "Terus belajar untuk membuka pencapaian berikutnya.",
      },
    ],
  },
};
