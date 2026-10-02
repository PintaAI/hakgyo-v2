import { PromoPageDemo } from "../demos/content";
import { FeatureSlide } from "../slide";

/** The organization landing page builder. */
export function PromoSlide() {
  return (
    <FeatureSlide
      id="promosi"
      columns="lg:grid-cols-[0.85fr_1.15fr] lg:gap-16"
      title="Butuh website promosi?"
      muted="Tanpa biaya mahal dan ribet developer."
      description={
        <>
          Hakgyo menyediakan landing page builder untuk lembaga Anda, dengan{" "}
          <span className="text-foreground font-medium">
            revisi desain unlimited
          </span>{" "}
          yang bebas disesuaikan dengan kebutuhan.
        </>
      }
      points={[
        "Didesain oleh AI pilihan Anda sesuai brand lembaga",
        "Daftar kelas dan harga selalu sinkron dengan Hakgyo",
        "Edit teks langsung di halaman, tanpa menyentuh kode",
        "Riwayat revisi dan terbit dengan sekali klik",
      ]}
      visualLabel="Halaman"
    >
      <PromoPageDemo />
    </FeatureSlide>
  );
}
