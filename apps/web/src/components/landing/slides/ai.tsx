import {
  ImageIcon,
  ListTreeIcon,
  PaletteIcon,
  SparklesIcon,
} from "lucide-react";

import { AssistantDemo } from "../demos/workspace";
import { reveal } from "../reveal";
import { FeatureSlide } from "../slide";

const builtInAi = [
  { icon: SparklesIcon, text: "Contoh kalimat untuk setiap kosakata" },
  { icon: ImageIcon, text: "Soal dan kosakata dari foto" },
  { icon: ListTreeIcon, text: "Daftar isi otomatis dari buku PDF" },
  { icon: PaletteIcon, text: "Tema warna dari logo lembaga" },
  { icon: ImageIcon, text: "Thumbnail kurikulum" },
];

/** The AI assistant over MCP and the AI built into Hakgyo. */
export function AiSlide() {
  return (
    <FeatureSlide
      id="ai"
      columns="lg:grid-cols-2 lg:gap-20"
      title="Butuh asisten?"
      muted="Tidak perlu hire admin."
      description="Hubungkan Claude atau ChatGPT ke Hakgyo, lalu urus kebutuhan program kelas lewat percakapan: susun kurikulum, buat materi dan kosakata, sampai halaman promosi."
      aside={
        <>
          <p {...reveal(3)} className="mt-6 text-sm font-medium sm:mt-10">
            Plus AI bawaan di Hakgyo
          </p>
          <ul
            {...reveal(4)}
            className="mt-3 grid gap-2.5 sm:mt-4 sm:grid-cols-2 sm:gap-3"
          >
            {builtInAi.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="text-muted-foreground flex items-start gap-3 text-sm"
              >
                <Icon
                  className="text-foreground mt-0.5 size-4 shrink-0"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                {text}
              </li>
            ))}
          </ul>
        </>
      }
      visualLabel="Asisten"
    >
      <p className="mb-4 text-sm font-medium sm:mb-5">
        Cukup minta, asisten yang mengerjakan.
      </p>
      <AssistantDemo />
    </FeatureSlide>
  );
}
