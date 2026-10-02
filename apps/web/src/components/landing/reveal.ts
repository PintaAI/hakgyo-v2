import type { CSSProperties } from "react";

/**
 * Marks an element to fade in when its landing slide becomes active; `order`
 * staggers it after earlier elements. See the landing rules in globals.css.
 */
export function reveal(order = 0) {
  return {
    "data-reveal": "",
    style: { "--reveal": order } as CSSProperties,
  };
}
