import { PhoneScreenshot } from "../demos/learner-app";
import { FeatureSlide } from "../slide";

/** Courses, materials and vocabulary on the phone, offline too. */
export function AppLearnSlide() {
  return (
    <FeatureSlide
      id="belajar"
      columns="lg:grid-cols-[1.2fr_0.8fr] lg:gap-16"
      title="Semua kelasmu,"
      muted="dalam satu aplikasi."
      description="Kelas dari lembagamu langsung muncul di aplikasi, urut per bab seperti kurikulumnya."
      descriptionOnPhones={false}
      points={[
        "Materi, kosakata, dan tugas per bab, lanjut dari terakhir belajar",
        "Tetap bisa belajar offline, progres terkirim saat online lagi",
        "Notifikasi saat ada tugas atau tryout baru",
        "Latihan mengucapkan kosakata dengan pengenalan suara",
        "XP dan streak harian supaya rutin belajar",
      ]}
      visualLabel="Aplikasi"
    >
      <PhoneScreenshot screen="learn" />
    </FeatureSlide>
  );
}
