"use client";

import { useEffect, useRef } from "react";

import { startAtmosphere } from "./atmosphere-engine";
import { usePrefersReducedMotion } from "./motion";

/**
 * Drifting hangul glyphs behind the landing slides, some in soap bubbles that
 * pop. Scrolling to another slide blows them in the slide's direction. Off
 * with reduced motion.
 */
export function LandingAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reducedMotion) return;
    return startAtmosphere(canvas);
  }, [reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="text-foreground pointer-events-none fixed inset-0 z-0 size-full"
    />
  );
}
