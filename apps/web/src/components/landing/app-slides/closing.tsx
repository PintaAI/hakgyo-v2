import { androidRobotAttribution, AppDownloadButtons } from "../app-download";
import { LandingFooter } from "../footer";
import { landingContainer } from "../layout";
import { reveal } from "../reveal";
import { Eyebrow } from "../slide";

/** The closing download call to action and the page footer. */
export function AppClosingSlide() {
  return (
    <section
      id="mulai-belajar"
      data-slide
      aria-labelledby="mulai-belajar-title"
      className="bg-primary text-primary-foreground flex flex-col"
    >
      <div
        className={`${landingContainer} flex flex-1 flex-col justify-center py-14 sm:py-24`}
      >
        <Eyebrow slide="mulai-belajar" inverted />
        <h2
          {...reveal(1)}
          id="mulai-belajar-title"
          className="mt-3 max-w-4xl text-[clamp(2.25rem,6vw,5.5rem)] leading-[1.05] font-medium tracking-[-0.06em] sm:mt-6 sm:leading-[1.03]"
        >
          Mulai belajar dari ponselmu hari ini.
        </h2>
        <p
          {...reveal(2)}
          className="mt-4 max-w-lg text-[15px] leading-6 opacity-80 sm:mt-6 sm:text-lg sm:leading-7"
        >
          Pasang Hakgyo, masuk dengan akunmu, dan semua kelasmu langsung siap.
        </p>
        <AppDownloadButtons {...reveal(3)} inverted className="mt-7 sm:mt-10" />
      </div>
      <LandingFooter note={androidRobotAttribution} />
    </section>
  );
}
