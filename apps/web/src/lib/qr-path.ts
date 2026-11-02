import { encode } from "uqr";

/** Error correction level: H survives a logo over the middle of the code. */
export type QrErrorCorrection = "L" | "M" | "Q" | "H";

/** A QR code as one SVG path of unit squares, and its width in modules (no quiet zone). */
export function qrPath(value: string, ecc: QrErrorCorrection = "M") {
  const { data, size } = encode(value, { border: 0, ecc });
  let path = "";
  data.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) path += `M${x} ${y}h1v1h-1z`;
    });
  });
  return { path, size };
}
