import type { ComponentProps, ReactNode } from "react";
import Image from "next/image";
import { CheckIcon } from "lucide-react";

import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";

import { slideLabel, slideNumber, type SlideId } from "./deck";
import { headlineText, landingContainer } from "./layout";
import { Panel, SlidePanels } from "./panels";
import { reveal } from "./reveal";

/**
 * One slide of the deck: a screen-tall section with the page container.
 * Horizontal overflow is clipped so full-bleed tracks inside (see
 * `SlidePanels`) never widen the page.
 */
export function Slide({
  id,
  className,
  children,
}: {
  id: SlideId;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      data-slide
      aria-labelledby={`${id}-title`}
      className={cn(
        "relative flex flex-col justify-center overflow-x-clip py-10 sm:py-20 lg:py-14",
        className,
      )}
    >
      <div className={landingContainer}>{children}</div>
    </section>
  );
}

/** A slide's number and label, the small line above its heading. */
export function Eyebrow({
  slide,
  label = slideLabel(slide),
  inverted = false,
}: {
  slide: SlideId;
  /** Defaults to the slide's label in the deck. */
  label?: ReactNode;
  /** For slides on the primary colour. */
  inverted?: boolean;
}) {
  return (
    <p
      {...reveal(0)}
      className={cn(
        "flex items-center gap-2.5 font-mono text-[10px] tracking-[0.18em] uppercase sm:gap-3 sm:text-xs",
        inverted ? "opacity-70" : "text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "h-px w-6 sm:w-8",
          inverted ? "bg-primary-foreground" : "bg-primary",
        )}
      />
      {slideNumber(slide)} · {label}
    </p>
  );
}

/**
 * A two-tone heading: the title, then a muted second line. Takes the slide
 * heading's type scale unless `className` sets another.
 */
export function Headline({
  as: Heading = "h2",
  id,
  title,
  muted,
  revealOrder = 1,
  className,
}: {
  as?: "h2" | "h3";
  id?: string;
  title: ReactNode;
  muted?: ReactNode;
  revealOrder?: number;
  className?: string;
}) {
  return (
    <Heading
      {...reveal(revealOrder)}
      id={id}
      className={cn(headlineText, className)}
    >
      {title}
      {muted ? (
        <>
          <br />
          <span className="text-muted-foreground">{muted}</span>
        </>
      ) : null}
    </Heading>
  );
}

/** A slide's eyebrow, two-tone heading, and optional description. */
export function SlideHeading({
  id,
  title,
  muted,
  description,
  descriptionOnPhones = true,
  className,
}: {
  id: SlideId;
  title: ReactNode;
  muted?: ReactNode;
  description?: ReactNode;
  /** Slides with a checklist drop the description on phones to fit. */
  descriptionOnPhones?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <Eyebrow slide={id} />
      <Headline
        id={`${id}-title`}
        title={title}
        muted={muted}
        className="mt-3 sm:mt-5"
      />
      {description ? (
        <p
          {...reveal(2)}
          className={cn(
            "text-muted-foreground mt-3 max-w-xl text-[15px] leading-6 sm:mt-5 sm:text-base sm:leading-7 lg:text-lg lg:leading-8",
            !descriptionOnPhones && "hidden sm:block",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

/** Feature points under a heading, ordered by importance. */
export function CheckList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-5 grid gap-2.5 sm:mt-8 sm:gap-3.5">
      {items.map((item, index) => (
        <li
          key={item}
          {...reveal(3 + index)}
          className={cn(
            "flex items-start gap-2.5 text-sm leading-6 sm:gap-3 sm:text-base",
            // Phones keep the first three points.
            index >= 3 && "hidden sm:flex",
          )}
        >
          <span className="bg-primary text-primary-foreground mt-0.5 grid size-5 shrink-0 place-items-center rounded-full">
            <CheckIcon className="size-3" aria-hidden="true" />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

/**
 * The common slide layout: heading and feature points beside a visual. On
 * phones they are two panels; the visual's panel is named `visualLabel`.
 */
export function FeatureSlide({
  id,
  className,
  columns = "lg:grid-cols-2 lg:gap-16",
  visualLabel,
  points,
  aside,
  children,
  ...heading
}: Omit<ComponentProps<typeof SlideHeading>, "className"> & {
  className?: string;
  /** Large-screen column widths and gap. */
  columns?: string;
  visualLabel: string;
  points?: readonly string[];
  /** More content under the heading, in place of or after the points. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Slide id={id} className={className}>
      <SlidePanels
        labels={["Fitur", visualLabel]}
        className={cn(columns, "lg:items-center")}
      >
        <Panel>
          <SlideHeading id={id} {...heading} />
          {points ? <CheckList items={points} /> : null}
          {aside}
        </Panel>
        <Panel>
          <div {...reveal(3)}>{children}</div>
        </Panel>
      </SlidePanels>
    </Slide>
  );
}

/** Title of a large card, such as an integration or an audience. */
export const cardTitle =
  "mt-4 text-xl font-medium tracking-tight sm:mt-10 sm:text-2xl";

/** Body text under a card's title. */
export const cardText =
  "text-muted-foreground mt-1.5 text-sm leading-6 sm:mt-3";

export function SoonBadge() {
  return (
    <span className="border-primary/40 text-primary rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase">
      Segera hadir
    </span>
  );
}

// TODO: WhatsApp number in international format without "+", e.g. 628123456789.
// Until it is set, wa.me opens WhatsApp and asks the visitor to pick a contact.
const whatsappNumber = "";
const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
  "Halo, saya tertarik memakai Hakgyo untuk program kelas bahasa Korea saya.",
)}`;

/** The page's call to action: a chat with the Hakgyo team. */
export function WhatsAppLink({
  className,
  children = "Konsultasi via WhatsApp",
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(buttonVariants(), "gap-3", className)}
    >
      <Image
        src="/brands/whatsapp.svg"
        alt=""
        width={20}
        height={20}
        className="size-5"
      />
      {children}
    </a>
  );
}
