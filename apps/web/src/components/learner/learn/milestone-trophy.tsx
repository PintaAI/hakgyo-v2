"use client";

import { useEffect, useRef } from "react";

const particles = [-76, -54, -30, 28, 52, 76];

/** Trophy with a short confetti burst; static when the user prefers reduced motion. */
export function MilestoneTrophy() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = container.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const animations = [
      ...root.querySelectorAll<HTMLElement>("[data-particle]"),
    ].map((element, index) => {
      const offset = particles[index] ?? 0;
      return element.animate(
        [
          { opacity: 0, transform: "translate(0, 0) rotate(0deg)" },
          {
            opacity: 1,
            offset: 0.15,
          },
          {
            opacity: 1,
            offset: 0.5,
            transform: `translate(${offset * 0.7}px, ${-55 - (index % 3) * 12}px) rotate(${offset * 2}deg)`,
          },
          {
            opacity: 0,
            transform: `translate(${offset * 1.4}px, 30px) rotate(${offset * 4}deg)`,
          },
        ],
        { duration: 850, easing: "ease-out", fill: "both" },
      );
    });
    return () => animations.forEach((animation) => animation.cancel());
  }, []);

  return (
    <div
      ref={container}
      aria-hidden
      className="relative mx-auto flex h-32 w-64 items-center justify-center"
    >
      {particles.map((offset) => (
        <span
          key={offset}
          data-particle
          className="bg-primary absolute h-3.5 w-2 rounded-[3px] opacity-0 motion-reduce:hidden"
        />
      ))}
      <span className="bg-primary/15 animate-in zoom-in-75 flex size-24 items-center justify-center rounded-full text-5xl duration-500">
        🏆
      </span>
    </div>
  );
}
