"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { cn } from "~/lib/utils";

/** Pixels per second the text moves while it slides. */
const SPEED = 30;

/**
 * Keeps text on one line. When it is wider than its box it slides to its end
 * and back, pausing at both ends; with reduced motion it is cut off with an
 * ellipsis instead.
 */
export function MarqueeText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const boxRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const box = boxRef.current;
    const text = textRef.current;
    if (!box || !text) return;
    const measure = () => {
      const overflow = text.scrollWidth - box.clientWidth;
      setDistance(overflow > 1 ? Math.ceil(overflow) : 0);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    observer.observe(text);
    return () => observer.disconnect();
  }, []);

  // The slide takes 60% of the cycle (two 30% legs), the rest are pauses.
  const duration = Math.max(6, ((distance / SPEED) * 2) / 0.6);

  return (
    <span
      ref={boxRef}
      className={cn(
        "block overflow-hidden text-ellipsis whitespace-nowrap",
        // Soft edges while the text slides, so letters fade instead of
        // being cut off.
        distance > 0 &&
          "motion-safe:[mask-image:linear-gradient(to_right,transparent,black_6px,black_calc(100%-6px),transparent)]",
        className,
      )}
    >
      <span
        ref={textRef}
        className={cn(
          "inline-block motion-reduce:inline",
          distance > 0 && "motion-safe:animate-marquee",
        )}
        style={
          distance > 0
            ? ({
                "--marquee-distance": `${distance}px`,
                animationDuration: `${duration.toFixed(1)}s`,
              } as CSSProperties)
            : undefined
        }
      >
        {children}
      </span>
    </span>
  );
}
