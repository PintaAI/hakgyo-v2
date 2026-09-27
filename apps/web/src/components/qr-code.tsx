import { encode } from "uqr";

import { cn } from "~/lib/utils";

/** Server-rendered QR code drawn in `currentColor`, so it follows the theme. */
export function QrCode({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const { data, size } = encode(value, { border: 0, ecc: "M" });
  let path = "";
  data.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) path += `M${x} ${y}h1v1h-1z`;
    });
  });

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className={cn("block", className)}
    >
      <path d={path} fill="currentColor" />
    </svg>
  );
}
