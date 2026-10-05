import {
  BriefcaseIcon,
  Building2Icon,
  CheckIcon,
  UserRoundIcon,
} from "lucide-react";

import { cn } from "~/lib/utils";

import { swipeCard, swipeGrid, swipeRow } from "../layout";
import { reveal } from "../reveal";
import { cardTitle, Slide, SlideHeading } from "../slide";

const audiences = [
  {
    icon: UserRoundIcon,
    name: "Pengajar & kreator kelas online",
    points: [
      "Mulai sendiri, cukup dengan beberapa murid",
      "Jual kelas di kanal Anda, undang murid lewat link",
      "Materi, latihan, dan tryout sudah tersedia",
    ],
  },
  {
    icon: Building2Icon,
    name: "Lembaga kurikulum",
    points: [
      "Banyak pengajar, kelas, dan angkatan",
      "Role Owner, Admin, Pengajar, Instruktur, Asisten",
      "Brand lembaga di aplikasi dan halaman promosi",
    ],
  },
  {
    icon: BriefcaseIcon,
    name: "LPK & persiapan EPS-TOPIK",
    points: [
      "Tryout berwaktu dengan peringkat peserta",
      "Kontrol peserta dan catatan audit",
      "Latihan harian agar peserta tetap siap",
    ],
  },
];

/** Who Hakgyo is for, from solo teachers to LPK. */
export function AudiencesSlide() {
  return (
    <Slide id="untuk-siapa">
      <SlideHeading
        id="untuk-siapa"
        title="Untuk setiap skala"
        muted="program kelas bahasa Korea."
        className="max-w-4xl"
      />
      <div className={cn(swipeRow, swipeGrid)}>
        {audiences.map(({ icon: Icon, name, points }, index) => (
          <article
            key={name}
            {...reveal(3 + index)}
            className={cn(
              swipeCard,
              "rounded-2xl p-5 sm:p-7 md:w-auto",
              index === 1
                ? "bg-primary text-primary-foreground"
                : "border-border bg-card border",
            )}
          >
            <Icon
              className="size-5 sm:size-6"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <h3 className={cardTitle}>{name}</h3>
            <ul className="mt-3 grid gap-1.5 sm:mt-5 sm:gap-2.5">
              {points.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2.5 text-sm leading-6"
                >
                  <CheckIcon
                    className="mt-1 size-3.5 shrink-0 opacity-70"
                    aria-hidden="true"
                  />
                  <span className={index === 1 ? "opacity-85" : undefined}>
                    {point}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </Slide>
  );
}
