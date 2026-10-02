import { TryoutDemo } from "../demos/workspace";
import { FeatureSlide } from "../slide";

/** Timed tryouts with ranking. */
export function TryoutSlide() {
  return (
    <FeatureSlide
      id="tryout"
      title="Simulasi tryout"
      muted="seperti ujian sungguhan."
      description="Siapkan murid menghadapi ujian dengan tryout berwaktu, lalu pantau hasilnya dari satu tempat."
      descriptionOnPhones={false}
      points={[
        "Timer dan jadwal buka-tutup tryout",
        "Urutan soal dan pilihan jawaban diacak",
        "Pilihan ganda dinilai otomatis, esai direview pengajar",
        "Peringkat peserta setelah tryout",
        "Batalkan hasil peserta yang melanggar, tercatat di audit",
      ]}
      visualLabel="Tryout"
    >
      <TryoutDemo />
    </FeatureSlide>
  );
}
