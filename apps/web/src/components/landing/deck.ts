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

export type SlideId = (typeof slides)[number]["id"];

/** Two-digit position of a slide, as shown in its eyebrow. */
export function slideNumber(id: SlideId) {
  return String(slides.findIndex((slide) => slide.id === id) + 1).padStart(
    2,
    "0",
  );
}

export function slideLabel(id: SlideId) {
  return slides.find((slide) => slide.id === id)!.label;
}
