import { reveal } from "../reveal";
import { cardText, Slide, SlideHeading, WhatsAppLink } from "../slide";

const steps = [
  {
    title: "Chat kami di WhatsApp",
    description: "Ceritakan program kelas dan kebutuhan Anda.",
  },
  {
    title: "Demo & penyiapan",
    description:
      "Kami siapkan ruang lembaga Anda, lengkap dengan logo dan tema.",
  },
  {
    title: "Undang pengajar & murid",
    description: "Susun atau impor materi, lalu kelas langsung berjalan.",
  },
];

/** Three steps to get started, ending in the WhatsApp call to action. */
export function GettingStartedSlide() {
  return (
    <Slide id="cara-mulai">
      <SlideHeading
        id="cara-mulai"
        title="Mulai dalam"
        muted="tiga langkah."
        className="max-w-4xl"
      />
      <ol className="border-border mt-6 grid border-t sm:mt-12 md:grid-cols-3">
        {steps.map(({ title, description }, index) => (
          <li
            key={title}
            {...reveal(3 + index)}
            className="border-border border-b py-3 sm:py-8 md:border-r md:border-b-0 md:px-8 md:first:pl-0 md:last:border-r-0 md:last:pr-0"
          >
            <span className="text-muted-foreground font-mono text-xs sm:text-sm">
              0{index + 1}
            </span>
            <h3 className="mt-1.5 text-lg font-medium tracking-tight sm:mt-8 sm:text-2xl">
              {title}
            </h3>
            <p className={cardText}>{description}</p>
          </li>
        ))}
      </ol>
      <div {...reveal(6)} className="mt-6 sm:mt-10">
        <WhatsAppLink className="h-11 px-5 sm:h-12 sm:px-6" />
      </div>
    </Slide>
  );
}
