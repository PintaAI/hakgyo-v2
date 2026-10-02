"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTheme } from "next-themes";

import { DynamicLearnerBlockNoteDocument } from "~/components/editor/dynamic-learner-block-note-document";
import type { HakgyoPartialBlock } from "~/components/editor/block-note-schema";
import {
  conversationBlockDefaults,
  conversationBlockType,
} from "~/lib/blocknote/block-catalog";
import { cn } from "~/lib/utils";

import { demoShadow } from "./frame";
import { wideScreenQuery } from "../layout";
import { useInView } from "../motion";

const conversationContent: HakgyoPartialBlock[] = [
  {
    type: conversationBlockType,
    props: { ...conversationBlockDefaults, sectionVariant: "both" },
  },
];

// On wide screens the block uses its desktop layout, designed for a lesson
// column this wide, so the demo renders it at that width and scales it down to
// fit the slide. Narrower screens get the block's own mobile layout.
const conversationWidth = 820;

/**
 * The real learner renderer showing Hakgyo's conversation block, slowly
 * panning through the lesson while on screen. Hovering pauses it.
 */
export function ConversationDemo() {
  const { resolvedTheme } = useTheme();
  const { ref, inView } = useInView<HTMLDivElement>();
  const contentRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{
    width?: number;
    scale: number;
    distance: number;
  }>({ scale: 1, distance: 0 });

  useEffect(() => {
    const container = ref.current;
    const content = contentRef.current;
    if (!container || !content) return;
    const observer = new ResizeObserver(() => {
      const wide = window.matchMedia(wideScreenQuery).matches;
      const scale = wide
        ? Math.min(1, container.clientWidth / conversationWidth)
        : 1;
      setFit({
        width: wide ? conversationWidth : undefined,
        scale,
        distance: Math.max(
          0,
          content.offsetHeight * scale - container.clientHeight,
        ),
      });
    });
    observer.observe(container);
    observer.observe(content);
    return () => observer.disconnect();
  }, [ref]);

  return (
    <div
      ref={ref}
      className={cn(
        "border-border bg-card group h-[440px] overflow-hidden rounded-2xl border [mask-image:linear-gradient(to_bottom,black_88%,transparent)] sm:h-[min(62dvh,540px)]",
        demoShadow,
      )}
    >
      <div
        ref={contentRef}
        className={cn(
          // BlockNote reserves side-menu gutters a read-only document does not need.
          "origin-top-left p-3 sm:p-6 [&_.bn-editor]:px-0!",
          fit.distance > 0 &&
            "animate-landing-pan group-hover:[animation-play-state:paused]",
          !inView && "[animation-play-state:paused]",
        )}
        style={
          {
            width: fit.width,
            scale: fit.scale,
            "--pan-distance": `${fit.distance}px`,
          } as CSSProperties
        }
      >
        <DynamicLearnerBlockNoteDocument
          content={conversationContent}
          theme={resolvedTheme === "dark" ? "dark" : "light"}
        />
      </div>
    </div>
  );
}
