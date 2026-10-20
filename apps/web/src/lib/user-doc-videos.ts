import type { UserDocAudience } from "~/lib/user-doc-audiences";

export type UserDocVideo = {
  /** Public Cloudflare R2 URL of the MP4 file. */
  src: string;
  poster?: string;
  /** For example "2 menit". */
  durationLabel?: string;
};

/**
 * Public R2 folder of the guide videos. Keys carry a content hash, so the files
 * are cached as immutable; a re-rendered video gets a new key.
 */
const guideVideos =
  "https://pub-3fd0ad0a99684361b69ca3270ed168c8.r2.dev/guide-videos";

/**
 * Intro videos per guide page, keyed by `audience/slug`. Pages without an
 * entry show a "coming soon" placeholder.
 */
export const userDocVideos: Partial<Record<string, UserDocVideo>> = {
  "murid/mulai-belajar": {
    src: `${guideVideos}/murid/mulai-belajar-6939b7ea.mp4`,
    poster: `${guideVideos}/murid/mulai-belajar-a4c9fdde.jpg`,
    durationLabel: "1 menit",
  },
  "murid/daftar-bayar-kelas": {
    src: `${guideVideos}/murid/daftar-bayar-kelas-7a50e1d3.mp4`,
    poster: `${guideVideos}/murid/daftar-bayar-kelas-3a7a8909.jpg`,
    durationLabel: "1 menit",
  },
  "murid/belajar-materi": {
    src: `${guideVideos}/murid/belajar-materi-33c3ed94.mp4`,
    poster: `${guideVideos}/murid/belajar-materi-f9aa30ce.jpg`,
    durationLabel: "1 menit",
  },
  "murid/kosakata": {
    src: `${guideVideos}/murid/kosakata-f0d01ae8.mp4`,
    poster: `${guideVideos}/murid/kosakata-c72df001.jpg`,
    durationLabel: "1 menit",
  },
  "murid/mengerjakan-tugas": {
    src: `${guideVideos}/murid/mengerjakan-tugas-63e73c36.mp4`,
    poster: `${guideVideos}/murid/mengerjakan-tugas-6b2dc2e2.jpg`,
    durationLabel: "1 menit",
  },
  "murid/latihan-tryout": {
    src: `${guideVideos}/murid/latihan-tryout-dd6d762e.mp4`,
    poster: `${guideVideos}/murid/latihan-tryout-7858879c.jpg`,
    durationLabel: "1,5 menit",
  },
  "murid/xp-streak-notifikasi": {
    src: `${guideVideos}/murid/xp-streak-notifikasi-da5c56a4.mp4`,
    poster: `${guideVideos}/murid/xp-streak-notifikasi-12c4e1ea.jpg`,
    durationLabel: "1,5 menit",
  },
  "murid/aplikasi-ponsel": {
    src: `${guideVideos}/murid/aplikasi-ponsel-5e3cfd77.mp4`,
    poster: `${guideVideos}/murid/aplikasi-ponsel-0c3e9666.jpg`,
    durationLabel: "1,5 menit",
  },
  "murid/akun-bantuan": {
    src: `${guideVideos}/murid/akun-bantuan-7b7c0c6b.mp4`,
    poster: `${guideVideos}/murid/akun-bantuan-d8270b23.jpg`,
    durationLabel: "1 menit",
  },
  "pengajar/mulai-cepat": {
    src: `${guideVideos}/pengajar/mulai-cepat-7a0feb80.mp4`,
    poster: `${guideVideos}/pengajar/mulai-cepat-ea46bc6e.jpg`,
    durationLabel: "1,5 menit",
  },
  "pengajar/peran-akses": {
    src: `${guideVideos}/pengajar/peran-akses-29c87acc.mp4`,
    poster: `${guideVideos}/pengajar/peran-akses-5af50e0e.jpg`,
    durationLabel: "1 menit",
  },
  "pengajar/kurikulum-bahan-ajar": {
    src: `${guideVideos}/pengajar/kurikulum-bahan-ajar-15e88e07.mp4`,
    poster: `${guideVideos}/pengajar/kurikulum-bahan-ajar-e8fd835c.jpg`,
    durationLabel: "1,5 menit",
  },
  "pengajar/kelas-jadwal": {
    src: `${guideVideos}/pengajar/kelas-jadwal-5d686c48.mp4`,
    poster: `${guideVideos}/pengajar/kelas-jadwal-67685701.jpg`,
    durationLabel: "1 menit",
  },
  "pengajar/murid-undangan-pembayaran": {
    src: `${guideVideos}/pengajar/murid-undangan-pembayaran-8fcb7411.mp4`,
    poster: `${guideVideos}/pengajar/murid-undangan-pembayaran-d738fd71.jpg`,
    durationLabel: "1,5 menit",
  },
  "pengajar/review-penilaian": {
    src: `${guideVideos}/pengajar/review-penilaian-ccbc9f67.mp4`,
    poster: `${guideVideos}/pengajar/review-penilaian-33d336c0.jpg`,
    durationLabel: "1 menit",
  },
  "pengajar/latihan-tryout": {
    src: `${guideVideos}/pengajar/latihan-tryout-6ae310f7.mp4`,
    poster: `${guideVideos}/pengajar/latihan-tryout-2fd850d8.jpg`,
    durationLabel: "1 menit",
  },
  "pengajar/quiz-publik": {
    src: `${guideVideos}/pengajar/quiz-publik-1f09dbb3.mp4`,
    poster: `${guideVideos}/pengajar/quiz-publik-34e52ad2.jpg`,
    durationLabel: "1 menit",
  },
  "pengajar/landing-page": {
    src: `${guideVideos}/pengajar/landing-page-8dd7e20d.mp4`,
    poster: `${guideVideos}/pengajar/landing-page-749ee58c.jpg`,
    durationLabel: "1 menit",
  },
  "pengajar/analitik": {
    src: `${guideVideos}/pengajar/analitik-26c1492a.mp4`,
    poster: `${guideVideos}/pengajar/analitik-45b3e270.jpg`,
    durationLabel: "1,5 menit",
  },
};

export function getUserDocVideo(audience: UserDocAudience, slug: string) {
  return userDocVideos[`${audience}/${slug}`] ?? null;
}
