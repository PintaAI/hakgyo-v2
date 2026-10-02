import { CurriculumDemo } from "../demos/workspace";
import { FeatureSlide } from "../slide";

/** Class management: the curriculum builder and the dashboard. */
export function ManagementSlide() {
  return (
    <FeatureSlide
      id="manajemen"
      className="overflow-hidden"
      columns="lg:grid-cols-[0.8fr_1.2fr] lg:gap-16"
      title="Satu dashboard"
      muted="untuk seluruh program."
      points={[
        "Kurikulum per bab: materi, kosakata, dan tugas dengan urutan bertahap",
        "Group belajar per angkatan, lengkap dengan pengajar dan jadwal",
        "Role untuk Owner, Admin, Pengajar, Instruktur, dan Asisten",
        "Antrean review untuk jawaban esai murid",
        "Ringkasan kelas, jadwal, dan tugas di dashboard",
      ]}
      visualLabel="Dashboard"
    >
      <CurriculumDemo />
    </FeatureSlide>
  );
}
