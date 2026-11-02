import { qrPath } from "~/lib/qr-path";
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
  const { path, size } = qrPath(value);

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
