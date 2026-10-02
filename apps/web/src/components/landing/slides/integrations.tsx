import type { ReactNode } from "react";
import Image from "next/image";
import { VideoIcon } from "lucide-react";

import { cn } from "~/lib/utils";

import { MeetingLinkDemo } from "../demos/workspace";
import { swipeCard, swipeGrid, swipeRow } from "../layout";
import { reveal } from "../reveal";
import { cardText, cardTitle, Slide, SlideHeading, SoonBadge } from "../slide";

const integrations: readonly {
  name: string;
  logo: ReactNode;
  description: string;
  soon?: boolean;
  demo?: ReactNode;
}[] = [
  {
    name: "Zoom",
    logo: (
      <Image
        src="/brands/zoom.png"
        alt=""
        width={40}
        height={40}
        className="size-8 rounded-full sm:size-10"
      />
    ),
    description:
      "Jadwal kelas otomatis membuat meeting Zoom. Murid bergabung langsung dari aplikasi.",
    demo: <MeetingLinkDemo />,
  },
  {
    name: "Google Meet",
    logo: (
      <span className="bg-secondary grid size-8 place-items-center rounded-full sm:size-10">
        <VideoIcon className="size-4 sm:size-5" aria-hidden="true" />
      </span>
    ),
    description:
      "Pilih Google Meet sebagai penyedia meeting. Jadwal kelas dibuat lewat Google Calendar.",
  },
  {
    name: "WhatsApp",
    logo: (
      <Image
        src="/brands/whatsapp.svg"
        alt=""
        width={40}
        height={40}
        className="size-8 sm:size-10"
      />
    ),
    description:
      "Setiap kelas terhubung ke grup WhatsApp-nya. Integrasi penuh sedang disiapkan.",
    soon: true,
  },
];

/** Meeting providers and WhatsApp. */
export function IntegrationsSlide() {
  return (
    <Slide id="integrasi">
      <SlideHeading
        id="integrasi"
        title="Terhubung dengan alat"
        muted="yang sudah Anda pakai."
        className="max-w-4xl"
      />
      <div className={cn(swipeRow, swipeGrid)}>
        {integrations.map(({ name, logo, description, soon, demo }, index) => (
          <article
            key={name}
            {...reveal(3 + index)}
            className={cn(
              swipeCard,
              "border-border bg-card rounded-2xl border p-5 sm:p-7 md:w-auto",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              {logo}
              {soon ? <SoonBadge /> : null}
            </div>
            <h3 className={cardTitle}>{name}</h3>
            <p className={cardText}>{description}</p>
            {demo}
          </article>
        ))}
      </div>
    </Slide>
  );
}
