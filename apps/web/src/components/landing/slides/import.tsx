import { PdfImportDemo, PhotoImportDemo } from "../demos/content";
import { FeatureSlide } from "../slide";

const importSources = [
  {
    name: "Impor modul PDF",
    description: "Bab dan halaman dipetakan ke kurikulum.",
    demo: PdfImportDemo,
  },
  {
    name: "Foto jadi konten",
    description: "AI membaca foto menjadi kosakata dan soal.",
    demo: PhotoImportDemo,
  },
];

/** Importing an organization's own material from PDFs and photos. */
export function ImportSlide() {
  return (
    <FeatureSlide
      id="impor"
      columns="lg:grid-cols-[0.9fr_1.1fr] lg:gap-16"
      title="Punya materi sendiri?"
      muted="Impor otomatis dari PDF."
      description="Unggah buku atau modul PDF Anda. Hakgyo mengubahnya menjadi pelajaran di kurikulum."
      points={[
        "Daftar isi disusun AI dari buku PDF",
        "Foto lembar soal atau daftar kosakata jadi tugas dan set kosakata",
        "Hasil impor siap diedit sebelum dipakai",
      ]}
      visualLabel="Impor"
    >
      <div className="grid gap-3 sm:gap-4">
        {importSources.map(({ name, description, demo: Demo }) => (
          <article
            key={name}
            className="border-border bg-card rounded-2xl border p-3 sm:p-4"
          >
            <Demo />
            <h3 className="mt-3 text-base font-medium tracking-tight sm:mt-4">
              {name}
            </h3>
            <p className="text-muted-foreground mt-0.5 text-sm leading-6">
              {description}
            </p>
          </article>
        ))}
      </div>
    </FeatureSlide>
  );
}
