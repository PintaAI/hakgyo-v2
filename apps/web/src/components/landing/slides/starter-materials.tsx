import { StarterMaterialsDemo } from "../demos/content";
import { FeatureSlide } from "../slide";

/** Ready-made courses a new organization can start from. */
export function StarterMaterialsSlide() {
  return (
    <FeatureSlide
      id="materi"
      columns="lg:grid-cols-[0.9fr_1.1fr] lg:gap-16"
      title="Bingung mulai dari mana?"
      muted="Materinya sudah siap."
      description="Mulai dari materi yang sudah jadi, lalu kembangkan sesuai gaya mengajar Anda."
      points={[
        "Kurikulum Hangeul Mastery gratis untuk setiap murid",
        "Salin buku standar EPS-TOPIK dari HRD Korea ke ruang lembaga Anda saat membuatnya",
        "Ganti nama dan thumbnail, lalu sesuaikan urutan dan isi materi",
      ]}
      visualLabel="Materi"
    >
      <StarterMaterialsDemo />
    </FeatureSlide>
  );
}
