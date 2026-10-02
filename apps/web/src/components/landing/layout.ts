/** Horizontal page container shared by every landing slide. */
export const landingContainer =
  "mx-auto w-full max-w-7xl px-5 sm:px-10 lg:px-16 2xl:max-w-[100rem]";

/**
 * Sets `--gutter` on large screens to the distance from the content edge of
 * `landingContainer` to the edge of the screen, so an element inside the
 * container can bleed to the full screen width. Keep in sync with the
 * container's max widths and padding.
 */
export const landingGutter =
  "lg:[--gutter:calc((100vw_-_min(100vw,80rem))/2_+_4rem)] 2xl:[--gutter:calc((100vw_-_min(100vw,100rem))/2_+_4rem)]";

/** Large screens, where slide columns sit side by side. */
export const wideScreenQuery = "(min-width: 64rem)";

/**
 * Screens large enough to present: slides fill the screen and snap, and each
 * scroll gesture moves one step. Matches the media query in globals.css.
 */
export const presentingQuery = `${wideScreenQuery} and (min-height: 40rem)`;

/**
 * A card row that phones swipe sideways, so a slide of cards still fits one
 * screen. It bleeds to the screen edge past the container padding; add the
 * breakpoint where it turns back into a grid.
 */
export const swipeRow =
  "-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:-mx-10 sm:scroll-px-10 sm:px-10 [&::-webkit-scrollbar]:hidden";

/** A card inside `swipeRow`; the next card peeks in to invite a swipe. */
export const swipeCard = "w-[85%] shrink-0 snap-start sm:w-[55%]";

/** `swipeRow` that turns into a three-column grid from `md` up. */
export const swipeGrid =
  "mt-6 sm:mt-12 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0";
