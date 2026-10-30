import { PhoneScreenshot } from "../demos/learner-app";
import { FeatureSlide } from "../slide";

/** Practice tests and tryouts in the exam's format. */
export function AppExamSlide() {
  return (
    <FeatureSlide
      id="ujian"
      title="Latihan dan tryout"
      muted="seperti ujian sungguhan."
      description="Kerjakan latihan dan tryout dari pengajarmu, termasuk format EPS-TOPIK, langsung di ponsel."
      descriptionOnPhones={false}
      points={[
        "Soal membaca dan mendengarkan, lengkap dengan audio",
        "Waktu dan bagian soal seperti ujian aslinya",
        "Nilai pilihan ganda langsung keluar setelah selesai",
        "Lihat kembali jawabanmu dan pembahasannya",
      ]}
      visualLabel="Hari ini"
    >
      <PhoneScreenshot screen="today" />
    </FeatureSlide>
  );
}
