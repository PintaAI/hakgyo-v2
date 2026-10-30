/**
 * The landing page's slides in presentation order. The page renders them in
 * this order, and the slide navigator, slide numbers, and eyebrow labels all
 * come from here.
 */
export const slides = [
  { id: "mulai", label: "Pembuka" },
  { id: "masalah", label: "Masalah" },
  { id: "solusi", label: "Solusi" },
  { id: "manajemen", label: "Manajemen kelas" },
  { id: "aplikasi", label: "Aplikasi murid" },
  { id: "promosi", label: "Halaman promosi" },
  { id: "tryout", label: "Tryout & tugas" },
  { id: "materi", label: "Materi siap pakai" },
  { id: "impor", label: "Impor materi" },
  { id: "ai", label: "AI" },
  { id: "integrasi", label: "Integrasi" },
  { id: "untuk-siapa", label: "Untuk siapa" },
  { id: "perbandingan", label: "Bangun sendiri vs Hakgyo" },
  { id: "cara-mulai", label: "Cara mulai" },
  { id: "faq", label: "FAQ" },
  { id: "hubungi", label: "Hubungi kami" },
] as const;

/**
 * The learner app page (/aplikasi), numbered on its own. Its ids must not
 * repeat the main deck's, since slides look up their number by id.
 */
export const appSlides = [
  { id: "unduh", label: "Unduh aplikasi" },
  { id: "belajar", label: "Belajar di ponsel" },
  { id: "game", label: "Game latihan" },
  { id: "ujian", label: "Latihan ujian" },
  { id: "pasang", label: "Cara pasang" },
  { id: "tanya", label: "FAQ" },
  { id: "mulai-belajar", label: "Unduh sekarang" },
] as const;

export type MainSlideId = (typeof slides)[number]["id"];
export type AppSlideId = (typeof appSlides)[number]["id"];
export type SlideId = MainSlideId | AppSlideId;

function deckOf(id: SlideId): readonly { id: string; label: string }[] {
  return slides.some((slide) => slide.id === id) ? slides : appSlides;
}

/** Two-digit position of a slide in its deck, as shown in its eyebrow. */
export function slideNumber(id: SlideId) {
  return String(deckOf(id).findIndex((slide) => slide.id === id) + 1).padStart(
    2,
    "0",
  );
}

export function slideLabel(id: SlideId) {
  return deckOf(id).find((slide) => slide.id === id)!.label;
}
